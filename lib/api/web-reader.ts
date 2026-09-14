/**
 * Datasource: `web_reader` — POST https://fastapi.muns.io/tools/web-reader
 *
 * Backs the "Read article" action on a news card. The Ask AI tool catalog
 * wraps `fetchArticleContent` rather than calling the endpoint again.
 */
import { DatasourceError, FASTAPI_BASE, nestedError, pickString, postJson } from './client';

const WEB_READER_URL = `${FASTAPI_BASE}/tools/web-reader`;

/** Extracted pages can be very large; cap what the UI and the agent ever see. */
const MAX_CONTENT_CHARS = 12_000;

export type ArticleContentArgs = {
  url: string;
  /** Optional extraction objective passed through to the reader. */
  task?: string | null;
};

export type ArticleContent = {
  url: string;
  title: string | null;
  content: string;
  truncated: boolean;
  fetchedAt: string;
};

export async function fetchArticleContent(
  args: ArticleContentArgs,
  token: string,
  signal?: AbortSignal,
): Promise<ArticleContent> {
  const url = String(args.url ?? '').trim();
  if (!url) {
    throw new DatasourceError(
      'No article link was provided to read.',
      0,
      'web_reader called without a url',
    );
  }

  const task = String(args.task ?? '').trim();
  const body: Record<string, unknown> = { urls: [url] };
  if (task) body.task = task;

  const json = await postJson<{ results?: unknown }>(
    WEB_READER_URL,
    body,
    token,
    'Article text',
    signal,
  );

  const failure = nestedError(json?.results);
  if (failure) {
    console.error('[dashboard] web_reader returned a tool-level error', failure);
    throw new DatasourceError(
      'That article could not be read right now. Open it at the source instead.',
      0,
      failure,
    );
  }

  const first = Array.isArray(json?.results) ? json.results[0] : null;
  if (!first || typeof first !== 'object') {
    throw new DatasourceError(
      'That article could not be read right now. Open it at the source instead.',
      0,
      'web_reader returned no result entry',
    );
  }

  const record = first as Record<string, unknown>;
  const perUrlError = pickString(record, ['error']);
  if (perUrlError) {
    console.error('[dashboard] web_reader could not read the url', perUrlError);
    throw new DatasourceError(
      'That article could not be read right now. Open it at the source instead.',
      0,
      perUrlError,
    );
  }

  // The registry documents the entry as `{ url, ...content... }` without
  // pinning the content field name, so probe the plausible ones.
  const raw = pickString(record, ['content', 'markdown', 'text', 'body', 'extracted_content']);
  if (!raw) {
    throw new DatasourceError(
      'That article had no readable text. Open it at the source instead.',
      0,
      'web_reader entry contained no content field',
    );
  }

  const truncated = raw.length > MAX_CONTENT_CHARS;

  return {
    url: pickString(record, ['url']) ?? url,
    title: pickString(record, ['title', 'headline']),
    content: truncated ? `${raw.slice(0, MAX_CONTENT_CHARS)}\n\n[truncated]` : raw,
    truncated,
    fetchedAt: new Date().toISOString(),
  };
}
