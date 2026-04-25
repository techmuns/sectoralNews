'use client';

import { useMemo, useState } from 'react';
import { DashboardHeader } from '../components/dashboard-header';
import { EmptyState } from '../components/empty-state';
import { NewsGrid } from '../components/news-grid';
import { SectorSelect } from '../components/sector-select';
import { sectors } from '../lib/config/sectors';
import { mockNews } from '../lib/mock/news';

const DEFAULT_SECTOR_ID = 'banking-financial-services';

export default function HomePage() {
  const [selectedSectorId, setSelectedSectorId] = useState(DEFAULT_SECTOR_ID);

  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId),
    [selectedSectorId],
  );

  const filteredNews = useMemo(
    () => mockNews.filter((item) => item.sectorId === selectedSectorId).slice(0, 6),
    [selectedSectorId],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <DashboardHeader
          subtitle="Indian sector-wise news monitor"
          controls={
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <SectorSelect
                sectors={sectors}
                value={selectedSectorId}
                onChange={setSelectedSectorId}
              />
              <button
                type="button"
                disabled
                className="h-11 rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-medium text-slate-400"
              >
                Refresh
              </button>
              <div className="text-xs text-slate-500 md:pb-3">Last updated: --</div>
            </div>
          }
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Sector</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedSector?.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{selectedSector?.description}</p>
          </div>

          {filteredNews.length > 0 ? (
            <NewsGrid items={filteredNews} />
          ) : (
            <EmptyState sector={selectedSector} />
          )}
        </section>
      </div>
    </main>
  );
}
