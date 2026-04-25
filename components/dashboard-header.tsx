import type { ReactNode } from 'react';

type DashboardHeaderProps = {
  subtitle: string;
  controls: ReactNode;
};

export function DashboardHeader({ subtitle, controls }: DashboardHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            India Sectoral News Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 md:text-base">{subtitle}</p>
        </div>
        <div className="w-full md:w-auto">{controls}</div>
      </div>
    </header>
  );
}
