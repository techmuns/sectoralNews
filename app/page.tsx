import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { AskAiPanel } from '../components/AskAiPanel';
import { DashboardHeader } from '../components/dashboard-header';
import { EmptyState } from '../components/empty-state';
import { ErrorBoundary } from '../components/error-boundary';
import { NewsGrid } from '../components/news-grid';
import { SectorSelect } from '../components/sector-select';
import { fetchSectorNews, type SectorNewsResult } from '../lib/api/news';
import { fetchArticleContent, type ArticleContent } from '../lib/api/web-reader';
import { asText } from '../lib/coerce';
import { sectors } from '../lib/config/sectors';
import { DEFAULT_TIME_WINDOW_ID, timeWindows, windowToRange, type TimeWindowId } from '../lib/config/windows';
import { setLiveFilters } from '../lib/dashboardState';
import { sdk } from '../lib/sdk';
import { useHostContext } from '../hooks/useHostContext';

const DEFAULT_SECTOR_ID = 'banking-financial-services';

/** Keep the capture.snapshot payload well inside the SDK's 512 KB cap. */
const SNAPSHOT_HEADLINE_LIMIT = 20;

export default function HomePage() {
  const host = useHostContext();

  // Coerce every host value once, here, before anything calls a string method on it.
  const token = asText(host.session.token);
  const ticker = asText(host.ticker);
  const tickerCompany = asText(host.tickerCompany);
  const tickerCountry = asText(host.tickerCountry);

  const [selectedSectorId, setSelectedSectorId] = useState(DEFAULT_SECTOR_ID);
  const [windowId, setWindowId] = useState<TimeWindowId>(DEFAULT_TIME_WINDOW_ID);
  const [focusTicker, setFocusTicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [news, setNews] = useState<SectorNewsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openArticleUrl, setOpenArticleUrl] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);

  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId),
    [selectedSectorId],
  );

  // The ticker focus toggle is meaningless without a ticker from the host.
  const tickerFocusActive = focusTicker && Boolean(ticker);

  /* ------------------------------ sector headlines ----------------------------- */

  useEffect(() => {
    if (!token) return; // session not ready yet — transient on load
    const ctrl = new AbortController();
    const { fromDate, toDate } = windowToRange(windowId);

    setLoading(true);
    setError(null);

    fetchSectorNews(
      {
        sector: selectedSectorId,
        ticker: tickerFocusActive ? ticker : null,
        tickerCompany: tickerFocusActive ? tickerCompany : null,
        country: 'India',
        fromDate,
        toDate,
      },
      token,
      ctrl.signal,
    )
      .then((result) => {
        if (ctrl.signal.aborted) return;
        setNews(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return;
        setLoading(false);
        // Messages from the datasource layer are already plain-language.
        setError(err.message || 'Headlines could not be loaded right now. Please try again.');
        sdk.sendError('Failed to load sector headlines', 'SECTOR_NEWS_FETCH_FAILED', {
          sector: selectedSectorId,
          window: windowId,
        });
      });

    return () => ctrl.abort();
  }, [selectedSectorId, windowId, tickerFocusActive, ticker, tickerCompany, token, refreshKey]);

  // Collapse any open article whenever the underlying list changes.
  useEffect(() => {
    setOpenArticleUrl(null);
    setArticle(null);
    setArticleError(null);
  }, [selectedSectorId, windowId, tickerFocusActive, refreshKey]);

  /* -------------------------------- article reader ------------------------------ */

  const handleReadArticle = useCallback(
    (url: string, headline: string) => {
      if (openArticleUrl === url) {
        setOpenArticleUrl(null);
        setArticle(null);
        setArticleError(null);
        return;
      }

      setOpenArticleUrl(url);
      setArticle(null);
      setArticleError(null);

      if (!token) {
        setArticleError('Waiting for your Munshot session. Please try again in a moment.');
        return;
      }

      setArticleLoading(true);
      fetchArticleContent({ url, task: `Extract the article: ${headline}` }, token)
        .then((result) => {
          setArticle(result);
          setArticleLoading(false);
        })
        .catch((err: Error) => {
          setArticleLoading(false);
          setArticleError(
            err.message || 'That article could not be read right now. Open it at the source instead.',
          );
        });
    },
    [openArticleUrl, token],
  );

  /* ------------------------- live filters for the Ask AI agent ------------------ */

  const { fromDate, toDate } = useMemo(() => windowToRange(windowId), [windowId, refreshKey]);
  const windowLabel = timeWindows.find((w) => w.id === windowId)?.label ?? windowId;

  useEffect(() => {
    const filters: Record<string, string> = {
      sector: selectedSector?.label ?? selectedSectorId,
      sectorId: selectedSectorId,
      country: 'India',
      timeWindow: windowLabel,
      fromDate,
      toDate,
    };
    // Only advertise `ticker` as an inherited filter when the grid is actually
    // narrowed to it; otherwise the agent would silently narrow answers the
    // dashboard is not narrowing.
    if (tickerFocusActive && ticker) {
      filters.ticker = ticker;
      if (tickerCompany) filters.tickerCompany = tickerCompany;
    }
    if (ticker) filters.hostSelectedTicker = ticker;
    if (tickerCompany) filters.hostSelectedCompany = tickerCompany;
    if (tickerCountry) filters.hostSelectedTickerCountry = tickerCountry;
    filters.tickerFocus = tickerFocusActive ? 'on' : 'off';
    if (openArticleUrl) filters.articleUrl = openArticleUrl;

    setLiveFilters(filters);
  }, [
    selectedSector,
    selectedSectorId,
    windowLabel,
    fromDate,
    toDate,
    tickerFocusActive,
    ticker,
    tickerCompany,
    tickerCountry,
    openArticleUrl,
  ]);

  /* ---------------------------- host request handlers --------------------------- */

  // A getter pointing at the dashboard's current state, reassigned each render
  // so the snapshot handler always reads live values without stale closures.
  const snapshotRef = useRef<() => unknown>(() => ({}));

  snapshotRef.current = () => ({
    context: {
      ticker,
      tickerCompany,
      tickerCountry,
      filters: {
        sector: selectedSector?.label ?? selectedSectorId,
        sectorId: selectedSectorId,
        country: 'India',
        timeWindow: windowLabel,
        fromDate,
        toDate,
        tickerFocus: tickerFocusActive ? 'on' : 'off',
      },
    },
    selection: {
      openArticleUrl,
      openArticleTitle: article?.title ?? null,
    },
    data: {
      lastUpdatedAt: news?.fetchedAt ?? null,
      query: news?.query ?? null,
      headlineCount: news?.items.length ?? 0,
      status: loading ? 'loading' : error ? 'error' : 'ready',
      // Bounded: headline/source/date/url only, capped at 20 items.
      headlines: (news?.items ?? []).slice(0, SNAPSHOT_HEADLINE_LIMIT).map((item) => ({
        headline: item.headline,
        source: item.source,
        sourceDomain: item.sourceDomain,
        publishedAt: item.publishedAt,
        url: item.url,
      })),
    },
  });

  useEffect(() => {
    // 1) Visual snapshot — return a PNG Blob of Zone 2.
    const offVisual = sdk.onRequest('dashboard.capture.visual', async () => {
      try {
        const el =
          document.querySelector('#dashboard-main') ||
          document.querySelector("[data-dashboard-capture-root='true']") ||
          document.querySelector('main');
        if (!el) throw new Error('capture root not found');
        const blob = await toBlob(el as HTMLElement, { pixelRatio: 2 });
        if (!blob) throw new Error('empty snapshot blob');
        return { visualSnapshot: blob, capturedAt: new Date().toISOString() };
      } catch (err) {
        // Never throw out of the handler; return a structured, cloneable error.
        return { ok: false, error: (err as Error).message };
      }
    });

    // 2) State snapshot — return the current JSON state of the dashboard.
    const offSnapshot = sdk.onRequest('dashboard.capture.snapshot', () => {
      try {
        return snapshotRef.current();
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    });

    // DO NOT call sdk.ready() here. The SDK auto-sends dashboard:ready on
    // host:init. Calling it manually races the handshake and breaks it.

    return () => {
      offVisual();
      offSnapshot();
    };
  }, []);

  /* ---------------------------------- handlers ---------------------------------- */

  const handleSectorChange = useCallback((next: string) => {
    setSelectedSectorId(next);
    sdk.publish('analytics.filter.change', { filter: 'sector', value: next });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    sdk.publish('dashboard.metric', { widget: 'sector-headlines', action: 'refresh' });
  }, []);

  const lastUpdated = news?.fetchedAt
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(news.fetchedAt),
      )
    : '--';

  /* ----------------------------------- render ----------------------------------- */

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'linear-gradient(to bottom, rgba(249,250,251,0.8), #ffffff)' }}
    >
      {/* Zone 1 — sticky header, does not scroll. */}
      <div className="flex-shrink-0 px-4 pt-4 md:px-8 md:pt-6">
        <DashboardHeader
          subtitle="Indian sector-wise news monitor"
          ticker={ticker}
          tickerCompany={tickerCompany}
          controls={
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <SectorSelect sectors={sectors} value={selectedSectorId} onChange={handleSectorChange} />

              <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 md:w-48">
                Time window
                <select
                  value={windowId}
                  onChange={(event) => setWindowId(event.target.value as TimeWindowId)}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {timeWindows.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label
                className="flex h-11 items-center gap-2 text-sm font-medium text-slate-700 md:pb-0"
                title={ticker ? undefined : 'Select a stock in Munshot to enable this'}
              >
                <input
                  type="checkbox"
                  checked={tickerFocusActive}
                  disabled={!ticker}
                  onChange={(event) => setFocusTicker(event.target.checked)}
                  className="h-4 w-4 accent-indigo-600 disabled:opacity-40"
                />
                <span className={ticker ? '' : 'text-slate-400'}>Focus on selected ticker</span>
              </label>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={!token || loading}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>

              <div className="text-xs text-slate-500 md:pb-3">Last updated: {lastUpdated}</div>
            </div>
          }
        />
      </div>

      {/* Zone 2 — the only scrolling region, and the visual capture root. */}
      <main
        id="dashboard-main"
        data-dashboard-capture-root="true"
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-6 md:px-8"
      >
        <div className="mx-auto w-full max-w-7xl">
          <section
            className="rounded-2xl border p-5 shadow-sm md:p-6"
            style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(229,231,235,0.8)' }}
          >
            <div className="mb-5 border-b border-slate-100 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected Sector
              </p>
              <h2 className="mt-1 text-xl font-semibold" style={{ color: '#111827' }}>
                {selectedSector?.label}
              </h2>
              <p className="mt-1 text-sm" style={{ color: '#374151' }}>
                {selectedSector?.description}
              </p>
              {news && !loading && !error && (
                <p className="mt-2 text-xs" style={{ color: '#9ca3af' }}>
                  {news.items.length} headline{news.items.length === 1 ? '' : 's'} · {windowLabel} ·
                  searched for “{news.query}”
                </p>
              )}
            </div>

            {!token ? (
              <div className="px-4 py-8 text-center text-[13px]" style={{ color: '#9ca3af' }}>
                Waiting for session…
              </div>
            ) : loading && !news ? (
              <div className="px-4 py-8 text-center text-[13px]" style={{ color: '#9ca3af' }}>
                Loading {selectedSector?.label} headlines…
              </div>
            ) : error ? (
              <div
                className="rounded-xl px-4 py-6 text-center text-sm"
                style={{ background: '#fef2f2', color: '#ef4444' }}
              >
                <p className="font-medium">{error}</p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600"
                >
                  Try again
                </button>
              </div>
            ) : news && news.items.length > 0 ? (
              <>
                {loading && (
                  <p className="mb-3 text-xs" style={{ color: '#9ca3af' }}>
                    Refreshing…
                  </p>
                )}
                <NewsGrid
                  items={news.items}
                  openArticleUrl={openArticleUrl}
                  article={article}
                  articleLoading={articleLoading}
                  articleError={articleError}
                  onReadArticle={handleReadArticle}
                />
              </>
            ) : (
              <EmptyState sector={selectedSector} windowLabel={windowLabel} />
            )}
          </section>
        </div>
      </main>

      {/* Mounted once, with the host session token. */}
      <ErrorBoundary fallback={null}>
        <AskAiPanel token={token ?? ''} />
      </ErrorBoundary>
    </div>
  );
}
