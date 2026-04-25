import type { NewsItem } from '../lib/types';

const impactStyles: Record<NewsItem['impact'], string> = {
  Positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Negative: 'bg-rose-50 text-rose-700 border-rose-200',
  Neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  Policy: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Global Spillover': 'bg-amber-50 text-amber-700 border-amber-200',
};

type NewsCardProps = {
  item: NewsItem;
};

function formatPublishedTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-600">{item.source}</span>
        <span>{formatPublishedTime(item.publishedAt)}</span>
      </div>

      <div className="mb-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${impactStyles[item.impact]}`}
        >
          {item.impact}
        </span>
      </div>

      <h3 className="mb-2 text-base font-semibold leading-snug text-slate-900">{item.headline}</h3>
      <p className="mb-4 text-sm leading-6 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
        {item.summary}
      </p>

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex items-center text-sm font-medium text-slate-700 transition group-hover:text-slate-900"
      >
        Open source ↗
      </a>
    </article>
  );
}
