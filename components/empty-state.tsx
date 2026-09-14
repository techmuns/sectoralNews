import type { SectorConfig } from '../lib/types';

type EmptyStateProps = {
  sector?: SectorConfig;
  windowLabel?: string;
};

export function EmptyState({ sector, windowLabel }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>
        No headlines available
      </p>
      <h2 className="mt-2 text-lg font-semibold" style={{ color: '#111827' }}>
        {sector ? `No news found for ${sector.label}` : 'No news found for this sector'}
        {windowLabel ? ` in the ${windowLabel.toLowerCase()}` : ''}
      </h2>
      <p className="mt-2 text-sm" style={{ color: '#374151' }}>
        Try a wider time window, or pick another sector from the dropdown.
      </p>
    </div>
  );
}
