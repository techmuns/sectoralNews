import type { SectorConfig } from '../lib/types';

type SectorSelectProps = {
  sectors: SectorConfig[];
  value: string;
  onChange: (value: string) => void;
};

export function SectorSelect({ sectors, value, onChange }: SectorSelectProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 md:w-80">
      Sector
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        {sectors.map((sector) => (
          <option key={sector.id} value={sector.id}>
            {sector.label}
          </option>
        ))}
      </select>
    </label>
  );
}
