/**
 * Datasource: `news_search` — POST https://fastapi.muns.io/tools/news-search
 *
 * This is the only place the dashboard fetches sector headlines. The Ask AI
 * tool catalog wraps `fetchSectorNews` rather than calling the endpoint again.
 */
import { sectors } from '../config/sectors';
import type { NewsItem, SectorConfig } from '../types';
import { DatasourceError, FASTAPI_BASE, nestedError, pickString, postJson } from './client';

const NEWS_SEARCH_URL = `${FASTAPI_BASE}/tools/news-search`;

/** How many sector keywords get folded into the search query. */
const KEYWORDS_IN_QUERY = 3;

/** Keep rendered and agent-visible payloads bounded. */
const MAX_ITEMS = 24;

export type SectorNewsArgs = {
  /** Sector id, full label or short label — all three resolve. */
  sector: string;
  /** Host-selected ticker. Narrows the query to that company when present. */
  ticker?: string | null;
  /** Company name for the selected ticker, when the host supplied one. */
  tickerCompany?: string | null;
  country?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

export type SectorNewsResult = {
  sectorId: string;
  sectorLabel: string;
  query: string;
  country: string;
  fromDate: string | null;
  toDate: string | null;
  fetchedAt: string;
  resultsCount: number;
  items: NewsItem[];
};

function normalise(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/** Resolve a sector by id, label or short label so both the UI and the model can address it. */
export function resolveSector(input: unknown): SectorConfig | undefined {
  const needle = normalise(input);
  if (!needle) return undefined;
  return (
    sectors.find((s) => normalise(s.id) === needle) ??
    sectors.find((s) => normalise(s.label) === needle) ??
    sectors.find((s) => normalise(s.shortLabel) === needle) ??
    sectors.find((s) => normalise(s.label).includes(needle))
  );
}

export function buildSectorQuery(
  sector: SectorConfig,
  ticker?: string | null,
  tickerCompany?: string | null,
): string {
  const focus = String(tickerCompany ?? ticker ?? '').trim();
  const keywords = sector.keywords.slice(0, KEYWORDS_IN_QUERY).join(' OR ');
  const base = `${sector.label} India ${keywords}`;
  return focus ? `${focus} ${base}` : base;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function hostnameOf(url: string, record: Record<string, unknown>): string {
  const meta = record.meta_url as Record<string, unknown> | undefined;
  const fromMeta = pickString(meta, ['hostname', 'netloc']);
  if (fromMeta) return fromMeta.replace(/^www\./, '');
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceLabelOf(record: Record<string, unknown>, hostname: string): string {
  const profile = record.profile as Record<string, unknown> | undefined;
  return (
    pickString(record, ['source', 'publisher', 'site_name']) ??
    pickString(profile, ['name', 'long_name']) ??
    hostname ??
    'Unknown source'
  );
}

/**
 * The registry documents `results` as "news article hits" without pinning the
 * item shape, so read every field defensively and drop anything without a
 * headline and a URL rather than rendering blanks.
 */
function toNewsItem(raw: unknown, sectorId: string, index: number): NewsItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const headline = pickString(record, ['title', 'headline', 'name']);
  const url = pickString(record, ['url', 'link', 'href']);
  if (!headline || !url) return null;

  const hostname = hostnameOf(url, record);

  return {
    id: `${sectorId}-${index}-${slugify(headline) || 'item'}`,
    sectorId,
    headline,
    summary:
      pickString(record, ['description', 'snippet', 'summary', 'excerpt', 'extra_snippet']) ?? '',
    source: sourceLabelOf(record, hostname),
    sourceDomain: hostname,
    publishedAt:
      pickString(record, ['page_age', 'published', 'published_at', 'publishedAt', 'date', 'age']) ??
      '',
    url,
    clusterKey: slugify(headline) || `${sectorId}-${index}`,
  };
}

export async function fetchSectorNews(
  args: SectorNewsArgs,
  token: string,
  signal?: AbortSignal,
): Promise<SectorNewsResult> {
  const sector = resolveSector(args.sector);
  if (!sector) {
    throw new DatasourceError(
      `"${String(args.sector ?? '')}" is not one of the sectors on this dashboard.`,
      0,
      `unknown sector: ${String(args.sector)}`,
    );
  }

  const ticker = String(args.ticker ?? '').trim() || null;
  const tickerCompany = String(args.tickerCompany ?? '').trim() || null;
  const country = String(args.country ?? '').trim() || 'India';
  const fromDate = String(args.fromDate ?? '').trim() || null;
  const toDate = String(args.toDate ?? '').trim() || null;
  const query = buildSectorQuery(sector, ticker, tickerCompany);

  const body: Record<string, unknown> = { query, country };
  // A freshness filter only applies when both dates are present.
  if (fromDate && toDate) {
    body.from_date = fromDate;
    body.to_date = toDate;
  }

  const json = await postJson<{ results?: unknown; results_count?: number; query?: string }>(
    NEWS_SEARCH_URL,
    body,
    token,
    'Sector headlines',
    signal,
  );

  const failure = nestedError(json?.results);
  if (failure) {
    console.error('[dashboard] news_search returned a tool-level error', failure);
    throw new DatasourceError(
      `Headlines for ${sector.label} could not be loaded right now. Please try again.`,
      0,
      failure,
    );
  }

  const rawResults = Array.isArray(json?.results) ? json.results : [];
  const items = rawResults
    .slice(0, MAX_ITEMS)
    .map((raw, index) => toNewsItem(raw, sector.id, index))
    .filter((item): item is NewsItem => item !== null);

  return {
    sectorId: sector.id,
    sectorLabel: sector.label,
    query,
    country,
    fromDate,
    toDate,
    fetchedAt: new Date().toISOString(),
    resultsCount: typeof json?.results_count === 'number' ? json.results_count : items.length,
    items,
  };
}
