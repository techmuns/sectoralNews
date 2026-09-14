export type TimeWindowId = '24h' | '7d' | '30d';

export type TimeWindowConfig = {
  id: TimeWindowId;
  label: string;
  days: number;
};

export const timeWindows: TimeWindowConfig[] = [
  { id: '24h', label: 'Last 24 hours', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
];

export const DEFAULT_TIME_WINDOW_ID: TimeWindowId = '7d';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * news_search only applies a freshness filter when from_date and to_date are
 * sent together, so always return both.
 */
export function windowToRange(id: TimeWindowId): { fromDate: string; toDate: string } {
  const config = timeWindows.find((w) => w.id === id) ?? timeWindows[1];
  const to = new Date();
  const from = new Date(to.getTime() - config.days * 24 * 60 * 60 * 1000);
  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
}
