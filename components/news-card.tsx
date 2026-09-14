import type { ArticleContent } from '../lib/api/web-reader';
import type { NewsItem } from '../lib/types';

const impactStyles: Record<NonNullable<NewsItem['impact']>, string> = {
  Positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Negative: 'bg-rose-50 text-rose-700 border-rose-200',
  Neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  Policy: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Global Spillover': 'bg-amber-50 text-amber-700 border-amber-200',
};

type NewsCardProps = {
  item: NewsItem;
  isOpen: boolean;
  article: ArticleContent | null;
  articleLoading: boolean;
  articleError: string | null;
  onReadArticle: (url: string, headline: string) => void;
};

/**
 * news_search returns either an ISO timestamp or a relative string ("3 hours
 * ago"). Format what parses, pass through what does not.
 */
function formatPublishedTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function NewsCard({
  item,
  isOpen,
  article,
  articleLoading,
  articleError,
  onReadArticle,
}: NewsCardProps) {
  return (
    <article
      className="group flex h-full flex-col rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(229,231,235,0.8)' }}
    >
      {/* Provenance: which outlet reported this, and when. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: '#6b7280' }}>
        <span className="font-medium" style={{ color: '#374151' }}>
          {item.source}
          {item.sourceDomain && item.sourceDomain !== item.source ? ` · ${item.sourceDomain}` : ''}
        </span>
        <span>{formatPublishedTime(item.publishedAt)}</span>
      </div>

      {item.impact && (
        <div className="mb-3">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${impactStyles[item.impact]}`}
          >
            {item.impact}
          </span>
        </div>
      )}

      <h3 className="mb-2 text-base font-semibold leading-snug" style={{ color: '#111827' }}>
        {item.headline}
      </h3>
      {item.summary && (
        <p
          className="mb-4 text-sm leading-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
          style={{ color: '#374151' }}
        >
          {item.summary}
        </p>
      )}

      {isOpen && (
        <div
          className="mb-4 max-h-64 overflow-y-auto rounded-lg border p-3 text-xs leading-5"
          style={{ background: 'rgba(249,250,251,0.5)', borderColor: 'rgba(229,231,235,0.8)', color: '#374151' }}
        >
          {articleLoading && <p style={{ color: '#9ca3af' }}>Reading article…</p>}
          {articleError && <p style={{ color: '#ef4444' }}>{articleError}</p>}
          {article && <p className="whitespace-pre-wrap">{article.content}</p>}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onReadArticle(item.url, item.headline)}
          className="text-sm font-medium transition"
          style={{ color: '#4f46e5' }}
        >
          {isOpen ? 'Hide article' : 'Read article'}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium transition"
          style={{ color: '#374151' }}
        >
          Open source ↗
        </a>
      </div>
    </article>
  );
}
