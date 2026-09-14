import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { runAgent, type AgentPhase } from '../agent/runAgent';
import type { Message } from '../agent/prompts';

const C = {
  primary: '#4f46e5',
  primaryLight: '#eef2ff',
  primaryBorder: '#e0e7ff',
  primaryText: '#4338ca',
  panel: 'rgba(255,255,255,0.95)',
  body: 'rgba(249,250,251,0.5)',
  border: 'rgba(229,231,235,0.8)',
  text: '#111827',
  secondary: '#374151',
  hint: '#9ca3af',
  errorBg: '#fef2f2',
  error: '#ef4444',
};

export function AskAiPanel({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState('');
  const [phase, setPhase] = useState<AgentPhase>({ phase: 'done' });
  const busy = ['thinking', 'fetching', 'streaming'].includes(phase.phase);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); },
    [history, streaming, phase]);

  async function send() {
    const question = input.trim();
    if (!question || busy || !token) return;

    setInput('');
    const base = [...history, { role: 'user' as const, content: question }];
    setHistory(base);
    setStreaming('');

    let answer = '';
    try {
      await runAgent({
        question,
        history,
        token,
        onPhase: setPhase,
        onChunk: (t) => { answer += t; setStreaming(answer); },
      });
    } catch (err) {
      // HARDENED: runAgent handles its own errors; this is a last-resort guard
      // so the panel can never be left stuck in a busy state.
      console.error('[Ask AI] unexpected failure', err);
      setPhase({ phase: 'error', message: "Sorry, I couldn't answer that just now. Please try again." });
    }

    if (answer) setHistory([...base, { role: 'assistant', content: answer }]);
    setStreaming('');
  }

  // HARDENED: before the host session arrives, say so instead of silently ignoring Enter.
  const waiting = !token;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', right: 20, bottom: 20, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 99, cursor: 'pointer',
            background: C.primary, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
          }}
        >
          Ask AI
        </button>
      )}

      <aside
        style={{
          position: 'fixed', top: 0, right: 0, zIndex: 60,
          width: 'min(420px, 100vw)', height: '100vh',
          display: 'flex', flexDirection: 'column',
          background: C.panel, backdropFilter: 'blur(8px)',
          borderLeft: `1px solid ${C.border}`,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: open ? '-8px 0 24px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 48, flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Ask AI</span>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.hint }}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: C.body }}>
          {!history.length && !streaming && (
            <p style={{ fontSize: 13, color: C.hint, margin: 0 }}>
              Ask about anything on this dashboard.
            </p>
          )}

          {history.map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {m.role === 'user' ? (
                <div style={{
                  marginLeft: 'auto', maxWidth: '85%', width: 'fit-content',
                  padding: '8px 12px', borderRadius: 12,
                  background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                  color: C.primaryText, fontSize: 13,
                }}>
                  {m.content}
                </div>
              ) : (
                <Markdown text={m.content} />
              )}
            </div>
          ))}

          {/* progress rows — unmount as soon as the answer starts streaming */}
          {phase.phase === 'thinking' && <Progress label="Thinking…" />}
          {phase.phase === 'fetching' && (
            <Progress label={`Checking ${phase.sections.join(', ')}…`} />
          )}

          {streaming && <Markdown text={streaming} />}

          {phase.phase === 'error' && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: C.errorBg, color: C.error, fontSize: 12,
            }}>
              {phase.message}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder={waiting ? 'Waiting for session…' : 'Ask about this dashboard…'}
              disabled={busy || waiting}
              style={{
                flex: 1, padding: '8px 12px', fontSize: 13,
                borderRadius: 8, border: `1px solid ${C.border}`,
                outline: 'none', color: C.text,
              }}
            />
            <button
              onClick={send}
              disabled={busy || waiting || !input.trim()}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: busy || waiting || !input.trim() ? C.hint : C.primary,
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: busy || waiting || !input.trim() ? 'default' : 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Progress({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: C.hint, marginBottom: 12,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: C.primary,
        animation: 'pulse 1.2s ease-in-out infinite',
      }} />
      {label}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}

/**
 * Markdown only. Raw HTML is never rendered — do not add rehype-raw.
 * remark-gfm is required: several datasources return markdown tables.
 */
function Markdown({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 13, color: C.secondary, lineHeight: 1.55 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }} />
          ),
          table: ({ node, ...props }) => (
            <div style={{ overflowX: 'auto' }}>
              <table {...props} style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th {...props} style={{ border: `1px solid ${C.border}`, padding: '4px 8px', textAlign: 'left' }} />
          ),
          td: ({ node, ...props }) => (
            <td {...props} style={{ border: `1px solid ${C.border}`, padding: '4px 8px' }} />
          ),
          code: ({ node, ...props }) => (
            <code {...props} style={{ background: C.primaryLight, padding: '1px 4px', borderRadius: 4 }} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
