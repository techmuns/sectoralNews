import type { ReactNode } from 'react';

type DashboardHeaderProps = {
  subtitle: string;
  controls: ReactNode;
  /** Ticker selected in the Munshot host, already coerced to text. */
  ticker?: string | null;
  tickerCompany?: string | null;
};

export function DashboardHeader({ subtitle, controls, ticker, tickerCompany }: DashboardHeaderProps) {
  return (
    <header
      className="rounded-2xl border p-6 shadow-sm backdrop-blur"
      style={{ background: 'rgba(255,255,255,0.95)', borderColor: 'rgba(229,231,235,0.8)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="text-2xl font-semibold tracking-tight md:text-3xl"
              style={{ color: '#111827' }}
            >
              India Sectoral News Dashboard
            </h1>
            {ticker && (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  background: '#eef2ff',
                  borderColor: '#e0e7ff',
                  color: '#4338ca',
                }}
                title={tickerCompany ?? undefined}
              >
                {ticker}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm md:text-base" style={{ color: '#374151' }}>
            {subtitle}
          </p>
        </div>
        <div className="w-full md:w-auto">{controls}</div>
      </div>
    </header>
  );
}
