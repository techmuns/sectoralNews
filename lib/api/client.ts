/**
 * Shared HTTP client for the registered Munshot datasources.
 *
 * Every request is authenticated with the host session token
 * (`Authorization: Bearer ${session.token}`) — the dashboard never holds
 * credentials of its own.
 *
 * Thrown errors carry a plain-language `message` so it can be shown to a user
 * as-is; the technical detail goes to the console and to `detail`.
 */

export const FASTAPI_BASE = 'https://fastapi.muns.io';
export const NESTJS_BASE = 'https://devde.muns.io';

const REQUEST_TIMEOUT_MS = 30_000;

export class DatasourceError extends Error {
  /** HTTP status, or 0 for network/timeout failures. `runAgent` retries >= 500. */
  status: number;
  detail: string;

  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = 'DatasourceError';
    this.status = status;
    this.detail = detail;
  }
}

function plainMessage(status: number, what: string): string {
  if (status === 401 || status === 403) {
    return 'Your Munshot session has expired. Please refresh the page and try again.';
  }
  if (status === 429) {
    return `${what} is receiving a lot of requests right now. Please wait a moment and try again.`;
  }
  return `${what} could not be loaded right now. Please try again.`;
}

/** POST JSON to a datasource and parse the JSON response. */
export async function postJson<T>(
  url: string,
  body: unknown,
  token: string,
  what: string,
  signal?: AbortSignal,
): Promise<T> {
  if (!token) {
    throw new DatasourceError(
      'Waiting for your Munshot session. Please try again in a moment.',
      0,
      'no session token available',
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const detail = String((err as Error)?.message ?? err);
    console.error(`[dashboard] ${what} request failed`, err);
    const aborted =
      err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError');
    throw new DatasourceError(
      aborted
        ? `${what} took too long to respond. Please try again.`
        : `${what} could not be reached right now. Please try again.`,
      0,
      detail,
    );
  }

  if (!res.ok) {
    console.error(`[dashboard] ${what} returned HTTP ${res.status}`);
    throw new DatasourceError(plainMessage(res.status, what), res.status, `HTTP ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[dashboard] ${what} returned a non-JSON body`, err);
    throw new DatasourceError(
      `${what} returned an unexpected response. Please try again.`,
      res.status,
      'non-JSON response body',
    );
  }
}

/**
 * These endpoints answer HTTP 200 with `success: true` even when the tool
 * itself failed — the error is nested inside `results`. Surface it as a real
 * failure instead of rendering an empty list.
 */
export function nestedError(results: unknown): string | null {
  if (typeof results === 'string') return results;
  if (Array.isArray(results)) {
    const first = results[0] as Record<string, unknown> | undefined;
    if (first && typeof first === 'object' && typeof first.error === 'string') return first.error;
    return null;
  }
  if (results && typeof results === 'object') {
    const err = (results as Record<string, unknown>).error;
    if (typeof err === 'string') return err;
  }
  return null;
}

/** Read the first present, non-empty string field from an unknown-shaped record. */
export function pickString(
  record: Record<string, unknown> | undefined | null,
  keys: string[],
): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}
