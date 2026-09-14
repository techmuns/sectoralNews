import {
  buildRouterPrompt, buildAnswerPrompt,
  MAX_TOOLS_PER_TURN,
  type Message, type ToolResult,
} from './prompts';
import { dashboardContext } from './dashboardContext';
import { tools, type Tool } from './tools';
import { sdk } from '../lib/sdk';

const LLM_URL = 'https://fastapi.muns.io/query-router';

// HARDENED: requests can no longer hang the panel on "Thinking…" forever.
const ROUTER_TIMEOUT_MS = 45_000;
const STREAM_IDLE_TIMEOUT_MS = 60_000;

// HARDENED: users only ever see these plain-language messages; technical
// detail goes to the console and to the host via sdk.sendError.
const MSG_GENERIC = "Sorry, I couldn't answer that just now. Please try again.";
const MSG_SESSION = 'Your Munshot session has expired. Please refresh the page and try again.';
const MSG_BUSY = 'Ask AI is getting a lot of requests right now. Please wait a moment and try again.';
const MSG_TIMEOUT = 'Ask AI is taking too long to respond. Please try again.';
const MSG_EMPTY = "I couldn't get an answer this time. Please try asking again.";

/** An error carrying a message that is safe to show to non-technical users. */
export class AgentError extends Error {
  userMessage: string;
  constructor(userMessage: string, detail: string) {
    super(detail);
    this.name = 'AgentError';
    this.userMessage = userMessage;
  }
}

function httpError(status: number, what: string): AgentError {
  const msg = status === 401 || status === 403 ? MSG_SESSION : status === 429 ? MSG_BUSY : MSG_GENERIC;
  return new AgentError(msg, `${what} failed: HTTP ${status}`);
}

function networkError(err: unknown, what: string): AgentError {
  const timedOut = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
  return new AgentError(timedOut ? MSG_TIMEOUT : MSG_GENERIC, `${what} failed: ${String((err as Error)?.message ?? err)}`);
}

/**
 * HARDENED: the endpoint documents {"text": "..."}, but `text` can arrive as a
 * non-string (an already-parsed JSON object, an array of content blocks, a
 * number). Calling .trim() on it threw "e.trim is not a function". Normalise
 * every shape to a string before anything else touches it.
 */
function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(toText).join('');
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text; // content block {type, text}
    try {
      return JSON.stringify(value); // e.g. an already-parsed {"tools":[...]} plan
    } catch {
      return '';
    }
  }
  return String(value);
}

export type AgentPhase =
  | { phase: 'thinking' }
  | { phase: 'fetching'; sections: string[] }
  | { phase: 'streaming' }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

/* ----------------------------- endpoint helpers ----------------------------- */

async function callLlm(query: string, token: string, maxTokens = 500): Promise<string> {
  let res: Response;
  try {
    res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        query, llm_type: 'hosted_llm', stream: false, temperature: 0, max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(ROUTER_TIMEOUT_MS),
    });
  } catch (err) {
    throw networkError(err, 'LLM request');
  }
  if (!res.ok) throw httpError(res.status, 'LLM request');
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new AgentError(MSG_GENERIC, 'LLM request returned a non-JSON body');
  }
  if (json?.text !== undefined && json?.text !== null && typeof json.text !== 'string') {
    // HARDENED: make contract drift visible (DevTools console) instead of crashing.
    console.warn('[Ask AI] LLM endpoint returned non-string `text` of type', typeof json.text, json.text);
  }
  return toText(json?.text);
}

/**
 * Streaming response is NDJSON — one JSON object per line, e.g. {"text":"..."}.
 * It is NOT server-sent events. Do not use EventSource.
 * Returns the number of characters streamed.
 */
async function streamLlm(
  query: string,
  token: string,
  onChunk: (text: string) => void,
): Promise<number> {
  const ctrl = new AbortController();
  let idle = setTimeout(() => ctrl.abort(), STREAM_IDLE_TIMEOUT_MS);
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => ctrl.abort(), STREAM_IDLE_TIMEOUT_MS);
  };

  try {
    let res: Response;
    try {
      res = await fetch(LLM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, llm_type: 'hosted_llm', stream: true }),
        signal: ctrl.signal,
      });
    } catch (err) {
      throw networkError(err, 'LLM stream');
    }
    if (!res.ok || !res.body) throw httpError(res.status, 'LLM stream');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamed = 0;

    const flush = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let obj: any;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        return; /* ignore malformed line */
      }
      // HARDENED: a server-side error line used to be thrown inside the same
      // try/catch that swallowed it, so the user silently got no answer.
      if (obj?.error) throw new AgentError(MSG_GENERIC, `LLM stream error: ${toText(obj.error)}`);
      // HARDENED: non-string chunks rendered as "[object Object]".
      const text = toText(obj?.text);
      if (text) {
        streamed += text.length;
        onChunk(text);
      }
    };

    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        throw networkError(err, 'LLM stream read');
      }
      if (chunk.done) break;
      resetIdle();
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(flush);
    }
    flush(buffer);
    return streamed;
  } finally {
    clearTimeout(idle);
  }
}

/* ------------------------------- tool planning ------------------------------ */

type PlannedCall = { name: string; args: Record<string, any> };

function parsePlan(raw: unknown): PlannedCall[] | null {
  const cleaned = toText(raw).trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  // HARDENED: also accept a JSON object wrapped in prose ("Here you go: {...}").
  const candidates = [cleaned];
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start && (start > 0 || end < cleaned.length - 1)) {
    candidates.push(cleaned.slice(start, end + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || !Array.isArray(parsed.tools)) continue;
      return parsed.tools
        .filter((c: any) => c && typeof c.name === 'string' && tools.some(t => t.name === c.name))
        .slice(0, MAX_TOOLS_PER_TURN)
        .map((c: any) => ({
          name: c.name,
          args: c.args && typeof c.args === 'object' && !Array.isArray(c.args) ? c.args : {},
        }));
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Fill any arg declared `from: 'filter:<key>'` that the model left out. */
function applyFilterDefaults(tool: Tool, args: Record<string, any>, filters: Record<string, string>) {
  const filled = { ...args };
  for (const [name, spec] of Object.entries(tool.args)) {
    if (filled[name] !== undefined && filled[name] !== null && filled[name] !== '') continue;
    if (spec.from?.startsWith('filter:')) {
      const key = spec.from.slice('filter:'.length);
      if (filters[key]) filled[name] = filters[key];
    }
    if ((filled[name] === undefined || filled[name] === null) && spec.default) filled[name] = spec.default;
  }
  return filled;
}

/* --------------------------------- tool run -------------------------------- */

const isRetryable = (e: any) =>
  e?.name === 'TypeError' || (typeof e?.status === 'number' && e.status >= 500);

async function runTool(
  call: PlannedCall,
  filters: Record<string, string>,
  token: string,
): Promise<ToolResult> {
  const tool = tools.find(t => t.name === call.name)!;
  const args = applyFilterDefaults(tool, call.args, filters);

  // One retry, network errors and 5xx only. Never retry a 4xx.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await tool.run(args, token);
      return { name: tool.name, section: tool.section, ok: true, data };
    } catch (err: any) {
      if (attempt === 0 && isRetryable(err)) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      return {
        name: tool.name,
        section: tool.section,
        ok: false,
        error: toText(err?.message) || 'request failed',
      };
    }
  }
  return { name: tool.name, section: tool.section, ok: false, error: 'request failed' };
}

/* ---------------------------------- agent ---------------------------------- */

export async function runAgent(opts: {
  question: string;
  history: Message[];
  token: string;
  onPhase: (p: AgentPhase) => void;
  onChunk: (text: string) => void;
}): Promise<void> {
  const { question, history, token, onPhase, onChunk } = opts;

  try {
    // HARDENED: read filters inside the try so a failure here reaches the user.
    const filters = dashboardContext.getFilters();

    // PASS 1 — route
    onPhase({ phase: 'thinking' });
    const routerPrompt = buildRouterPrompt(question, history, filters);

    let plan = parsePlan(await callLlm(routerPrompt, token));
    if (plan === null) {
      // one retry with a stricter nudge, then give up and answer with no data
      const strict = `${routerPrompt}\n\nYour previous reply was not valid JSON. Reply with JSON only.`;
      plan = parsePlan(await callLlm(strict, token)) ?? [];
    }

    // RUN TOOLS — in parallel, each isolates its own failure
    let results: ToolResult[] = [];
    if (plan.length) {
      const sections = [...new Set(plan.map(c => tools.find(t => t.name === c.name)!.section))];
      onPhase({ phase: 'fetching', sections });
      results = await Promise.all(plan.map(c => runTool(c, filters, token)));
    }

    // PASS 2 — answer
    onPhase({ phase: 'streaming' });
    const answerPrompt = buildAnswerPrompt(question, history, results, filters);
    const streamed = await streamLlm(answerPrompt, token, onChunk);
    // HARDENED: an empty stream used to leave the question with no reply at all.
    if (streamed === 0) throw new AgentError(MSG_EMPTY, 'LLM stream returned no text');

    onPhase({ phase: 'done' });
  } catch (err: any) {
    const detail = toText(err?.message) || String(err);
    console.error('[Ask AI] request failed:', detail, err);
    sdk.sendError('Ask AI request failed', 'ASK_AI_FAILED', { detail, question: question.slice(0, 200) });
    onPhase({ phase: 'error', message: err instanceof AgentError ? err.userMessage : MSG_GENERIC });
  }
}
