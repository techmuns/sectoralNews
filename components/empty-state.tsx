import type { SectorConfig } from '../lib/types';

type EmptyStateProps = {
  sector?: SectorConfig;
};

export function EmptyState({ sector }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">No headlines available</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">
        {sector ? `No mock news in ${sector.label}` : 'No mock news for this sector'}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Select another sector from the dropdown to view sector-specific mock updates.
      </p>
    </div>
  );
}
