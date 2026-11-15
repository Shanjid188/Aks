// Shared, dependency-free SVG charts for admin analytics pages. Extracted from
// the Dashboard sales chart so Reports and Advertising pages share one look.
import { useId, useState, type ReactNode } from 'react';

export const bdt = (n: number) => `BDT ${Math.round(n).toLocaleString('en-IN')}`;

/** Short axis label, e.g. 12500 → "12.5k". */
export const compact = (n: number) =>
  n >= 100000 ? `${+(n / 100000).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(Math.round(n));

/** Ratio/percentage that renders "—" when it cannot be computed (never 0 or ∞). */
export const fmtRatio = (v: number | null | undefined, digits = 2) =>
  v == null || !Number.isFinite(v) ? '—' : v.toFixed(digits);
export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`;
export const fmtMoney = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : bdt(v));

export interface TrendPoint {
  label: string;
  /** Drawn as the smooth line + area. */
  primary: number;
  /** Optional bars in the lower 35% of the plot. */
  secondary?: number;
}

export function TrendChart({
  points,
  formatPrimary = bdt,
  formatSecondary = (n) => String(n),
  primaryLabel = 'Revenue',
  secondaryLabel,
  footnote,
  ariaLabel = 'Trend chart',
}: {
  points: TrendPoint[];
  formatPrimary?: (n: number) => string;
  formatSecondary?: (n: number) => string;
  primaryLabel?: string;
  secondaryLabel?: string;
  footnote?: ReactNode;
  ariaLabel?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const PAD = { top: 16, right: 12, bottom: 28, left: 40 };
  const pts = points;
  const hasBars = secondaryLabel != null && pts.some((p) => p.secondary != null);
  const maxV = Math.max(...pts.map((p) => p.primary), 1);
  const maxO = Math.max(...pts.map((p) => p.secondary ?? 0), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = pts.length > 1 ? innerW / (pts.length - 1) : 0;
  const xAt = (i: number) => PAD.left + (pts.length > 1 ? i * step : innerW / 2);
  const yAt = (v: number) => PAD.top + innerH - (v / maxV) * innerH;

  // Smooth curve: each segment bends through its horizontal midpoint, so it never overshoots.
  const path = pts
    .map((p, i) => {
      const x = xAt(i);
      const y = yAt(p.primary);
      if (i === 0) return `M${x},${y}`;
      const px = xAt(i - 1);
      const py = yAt(pts[i - 1].primary);
      const mx = (px + x) / 2;
      return `C${mx},${py} ${mx},${y} ${x},${y}`;
    })
    .join(' ');
  const base = PAD.top + innerH;
  const area = pts.length ? `${path} L${xAt(pts.length - 1)},${base} L${xAt(0)},${base} Z` : '';
  const labelEvery = Math.max(1, Math.ceil(pts.length / 8));
  const barW = Math.max(3, Math.min(18, (step || innerW) * 0.5));
  const hp = hover != null ? pts[hover] : null;

  return (
    <div className="relative">
      {hp && hover != null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-neutral-900 px-3 py-2 text-white shadow-xl"
          style={{ left: `${Math.min(88, Math.max(12, (xAt(hover) / W) * 100))}%` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{hp.label}</p>
          <p className="text-sm font-black tabular-nums">{formatPrimary(hp.primary)}</p>
          {hasBars && hp.secondary != null && (
            <p className="text-[10px] font-semibold text-sky-300">
              {formatSecondary(hp.secondary)} {secondaryLabel?.toLowerCase()}
            </p>
          )}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`fill${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`stroke${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D8232A" />
            <stop offset="55%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id={`bar${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + innerH * (1 - f)}
              y2={PAD.top + innerH * (1 - f)}
              stroke={f === 0 ? '#e2e8f0' : '#f1f5f9'}
              strokeDasharray={f === 0 ? undefined : '4 4'}
            />
            <text x={PAD.left - 8} y={PAD.top + innerH * (1 - f) + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
              {compact(maxV * f)}
            </text>
          </g>
        ))}
        {hasBars &&
          pts.map((p, i) => {
            const h = ((p.secondary ?? 0) / maxO) * innerH * 0.35;
            return (
              <rect key={`b${i}`} x={xAt(i) - barW / 2} y={base - h} width={barW} height={h} rx={Math.min(3, barW / 2)} fill={`url(#bar${uid})`} />
            );
          })}
        {pts.length > 0 && <path d={area} fill={`url(#fill${uid})`} />}
        {pts.length > 0 && (
          <path d={path} fill="none" stroke={`url(#stroke${uid})`} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {hover != null && <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={base} stroke="#cbd5e1" strokeDasharray="3 3" />}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.primary)}
              r={hover === i ? 5.5 : pts.length > 40 ? 0 : 3}
              fill="#fff"
              stroke="#D8232A"
              strokeWidth={hover === i ? 3 : 2}
            />
            {i % labelEvery === 0 && (
              <text x={xAt(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
                {p.label}
              </text>
            )}
            <rect x={xAt(i) - (step || innerW) / 2} y={PAD.top} width={step || innerW} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-[#D8232A] to-orange-500" /> {primaryLabel}
        </span>
        {hasBars && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-300" /> {secondaryLabel}
          </span>
        )}
        {footnote && <span className="ml-auto text-neutral-400">{footnote}</span>}
      </div>
    </div>
  );
}

/** Horizontal bar list — label, bar proportional to value, formatted value. */
export function BarList({
  rows,
  format = bdt,
  empty = 'No data in this range.',
}: {
  rows: { label: ReactNode; value: number; hint?: ReactNode }[];
  format?: (n: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-xs text-neutral-400">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-neutral-800 truncate">{r.label}</span>
            <span className="text-neutral-500 shrink-0">
              {r.hint && <span className="mr-1">{r.hint} ·</span>}
              <b className="text-neutral-900 tabular-nums">{format(r.value)}</b>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#D8232A] to-orange-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Small KPI tile in the Reports style; `source` labels where the number comes from. */
export function StatTile({
  label,
  value,
  sub,
  source,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  source?: string;
  tone?: 'neutral' | 'good' | 'bad' | 'muted';
}) {
  const color = { neutral: 'text-neutral-900', good: 'text-emerald-600', bad: 'text-rose-600', muted: 'text-neutral-400' }[tone];
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4">
      <p className="text-[10px] font-bold uppercase text-neutral-400">{label}</p>
      <p className={`text-xl font-black mt-1 tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-500 mt-0.5">{sub}</p>}
      {source && <p className="text-[10px] text-neutral-400 mt-1">Source: {source}</p>}
    </div>
  );
}

/** Date range picker (presets + custom from/to), shared by analytics pages. */
export type RangePreset = '7d' | '30d' | '90d' | '1y' | 'custom';

export interface DateRange {
  preset: RangePreset;
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function presetRange(preset: Exclude<RangePreset, 'custom'>): DateRange {
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[preset];
  const to = new Date();
  const from = new Date(Date.now() - (days - 1) * 86400000);
  return { preset, from: iso(from), to: iso(to) };
}

/** Query string for a range: whole local days, inclusive. */
export function rangeQuery(r: DateRange): string {
  const from = new Date(`${r.from}T00:00:00`);
  const to = new Date(`${r.to}T23:59:59.999`);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const presets: [Exclude<RangePreset, 'custom'>, string][] = [
    ['7d', '7 Days'],
    ['30d', '30 Days'],
    ['90d', '90 Days'],
    ['1y', '1 Year'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(presetRange(id))}
          className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
            value.preset === id ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
      <input
        type="date"
        aria-label="From"
        value={value.from}
        max={value.to}
        onChange={(e) => e.target.value && onChange({ preset: 'custom', from: e.target.value, to: value.to })}
        className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/10 text-white border border-white/15 [color-scheme:dark]"
      />
      <span className="text-white/50 text-[11px]">→</span>
      <input
        type="date"
        aria-label="To"
        value={value.to}
        min={value.from}
        onChange={(e) => e.target.value && onChange({ preset: 'custom', from: value.from, to: e.target.value })}
        className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/10 text-white border border-white/15 [color-scheme:dark]"
      />
    </div>
  );
}
