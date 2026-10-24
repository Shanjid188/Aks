import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Customer, SalesOverview, Stats } from '../types';
import { EmptyState, Spinner, StatusBadge, formatDate } from '../components/ui';
import { PERM } from '../lib/permissions';
import { useCan } from '../lib/permission-context';
import { adminImageUrl } from '../lib/imageUrl';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Eye,
  LayoutGrid,
  Mail,
  MapPin,
  PackageCheck,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Undo2,
  ShoppingBag,
  Truck,
  Users,
  Workflow,
  XCircle,
} from 'lucide-react';

const bdt = (n: number) => `BDT ${Math.round(n).toLocaleString('en-IN')}`;

/** Short axis label, e.g. 12500 → "12.5k". */
const compact = (n: number) =>
  n >= 100000 ? `${+(n / 100000).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(Math.round(n));

const SALES_RANGES = [
  { id: 'today', en: 'Today' },
  { id: '7d', en: '7 Days' },
  { id: '30d', en: '30 Days' },
  { id: '3m', en: '3 Months' },
  { id: '1y', en: '1 Year' },
] as const;

/** Division labels and colours — mirrors the product categories stored in the database. */
const DIVISION_META: Record<string, { en: string; bar: string; dot: string; text: string }> = {
  food: { en: 'SHUDDHO', bar: 'from-emerald-400 to-teal-500', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  craft: { en: 'AKS CRAFT', bar: 'from-amber-400 to-orange-500', dot: 'bg-amber-500', text: 'text-amber-600' },
  home: { en: 'AKS HOME', bar: 'from-sky-400 to-blue-500', dot: 'bg-sky-500', text: 'text-sky-600' },
  beauty: { en: 'AKS BEAUTY', bar: 'from-pink-400 to-rose-500', dot: 'bg-pink-500', text: 'text-pink-600' },
  print: { en: 'AKS PRINT', bar: 'from-violet-400 to-purple-600', dot: 'bg-violet-500', text: 'text-violet-600' },
  garments: { en: 'AKS Mart', bar: 'from-[#f1575e] to-[#D8232A]', dot: 'bg-[#D8232A]', text: 'text-[#D8232A]' },
};
const FALLBACK_DIVISION = { bar: 'from-slate-400 to-slate-600', dot: 'bg-slate-500', text: 'text-slate-600' };

/** Colour themes shared by KPI cards, section icons and pipeline stages. */
const THEMES = {
  emerald: { chip: 'from-emerald-400 to-teal-500', tint: 'from-emerald-50', soft: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', line: 'before:bg-gradient-to-r before:from-emerald-400 before:to-teal-500' },
  blue: { chip: 'from-sky-500 to-indigo-500', tint: 'from-sky-50', soft: 'bg-sky-50 text-sky-600', bar: 'bg-sky-500', line: 'before:bg-gradient-to-r before:from-sky-500 before:to-indigo-500' },
  amber: { chip: 'from-amber-400 to-orange-500', tint: 'from-amber-50', soft: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500', line: 'before:bg-gradient-to-r before:from-amber-400 before:to-orange-500' },
  violet: { chip: 'from-violet-500 to-fuchsia-500', tint: 'from-violet-50', soft: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500', line: 'before:bg-gradient-to-r before:from-violet-500 before:to-fuchsia-500' },
  rose: { chip: 'from-rose-500 to-pink-500', tint: 'from-rose-50', soft: 'bg-rose-50 text-rose-600', bar: 'bg-rose-500', line: 'before:bg-gradient-to-r before:from-rose-500 before:to-pink-500' },
  cyan: { chip: 'from-cyan-400 to-sky-600', tint: 'from-cyan-50', soft: 'bg-cyan-50 text-cyan-600', bar: 'bg-cyan-500', line: 'before:bg-gradient-to-r before:from-cyan-400 before:to-sky-600' },
} as const;
type Theme = keyof typeof THEMES;

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-sky-500 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-400 to-sky-600',
];
const avatarGradient = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
};

const RANK_STYLES = [
  'bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-amber-200',
  'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-slate-200',
  'bg-gradient-to-br from-orange-300 to-amber-700 text-white shadow-orange-200',
];

const CUSTOMERS_PREVIEW = 8;

/** Navigate to the Orders page, optionally pre-filtering or opening an order. */
function goOrders(filter?: string | null, orderId?: string | null) {
  if (filter) window.localStorage.setItem('aks_admin_order_filter', filter);
  if (orderId) window.localStorage.setItem('aks_admin_open_order', orderId);
  window.dispatchEvent(new CustomEvent('aks-admin-navigate', { detail: 'orders' }));
}

/* ─────────────────────────────── Loading skeleton ────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-44 rounded-3xl bg-gradient-to-br from-neutral-200 to-neutral-100 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-4 h-32 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 h-96 animate-pulse" />
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 h-96 animate-pulse" />
      </div>
    </div>
  );
}

/* ───────────────────────────────── KPI card ──────────────────────────────── */

function KpiCard({
  icon,
  labelEn,
  value,
  sub,
  delta,
  theme,
  onClick,
  highlight,
}: {
  icon: ReactNode;
  labelEn: string;
  value: string;
  sub?: ReactNode;
  delta?: number | null;
  theme: Theme;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const t = THEMES[theme];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${t.tint} via-white to-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,.05)] transition-all duration-200 before:absolute before:inset-x-0 before:top-0 before:h-1 ${t.line} ${
        highlight ? 'border-amber-300 ring-2 ring-amber-100' : 'border-neutral-200/80'
      } ${
        onClick
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(16,24,40,.45)]'
          : 'cursor-default'
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-6 -bottom-8 h-24 w-24 rounded-full bg-gradient-to-br ${t.chip} opacity-[0.12] blur-xl transition-opacity duration-200 group-hover:opacity-25`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${t.chip} text-white shadow-lg shadow-black/10`}>
          {icon}
        </span>
        {delta != null ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
              delta >= 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'
            }`}
          >
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        ) : onClick ? (
          <ArrowUpRight className="h-4 w-4 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-600" />
        ) : null}
      </div>
      <p className="relative mt-4 text-[10px] font-bold uppercase tracking-wider text-neutral-500 leading-tight">{labelEn}</p>
      <p className="relative mt-1 text-2xl font-black tracking-tight text-neutral-900 tabular-nums">{value}</p>
      {sub && <p className="relative mt-1 text-[11px] font-medium text-neutral-500">{sub}</p>}
    </button>
  );
}

/* ─────────────────────────── Section shell (card) ────────────────────────── */

function SectionCard({
  titleEn,
  subtitle,
  icon,
  theme = 'blue',
  action,
  children,
  className = '',
}: {
  titleEn: string;
  subtitle?: string;
  icon?: ReactNode;
  theme?: Theme;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,.05)] ${className}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon && <span className={`grid h-9 w-9 place-items-center rounded-xl ${THEMES[theme].soft}`}>{icon}</span>}
          <div>
            <h3 className="text-sm font-black tracking-tight text-neutral-900">{titleEn}</h3>
            {subtitle && <p className="text-[11px] font-medium text-neutral-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

/* ──────────────────────────────── Sales chart ────────────────────────────── */

function SalesChart({ overview }: { overview: SalesOverview }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const PAD = { top: 16, right: 12, bottom: 28, left: 40 };
  const pts = overview.points;
  const maxV = Math.max(...pts.map((p) => p.revenue), 1);
  const maxO = Math.max(...pts.map((p) => p.orders), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = pts.length > 1 ? innerW / (pts.length - 1) : 0;
  const xAt = (i: number) => PAD.left + (pts.length > 1 ? i * step : innerW / 2);
  const yAt = (v: number) => PAD.top + innerH - (v / maxV) * innerH;

  // Smooth curve: each segment bends through its horizontal midpoint, so it never overshoots.
  const path = pts
    .map((p, i) => {
      const x = xAt(i);
      const y = yAt(p.revenue);
      if (i === 0) return `M${x},${y}`;
      const px = xAt(i - 1);
      const py = yAt(pts[i - 1].revenue);
      const mx = (px + x) / 2;
      return `C${mx},${py} ${mx},${y} ${x},${y}`;
    })
    .join(' ');
  const base = PAD.top + innerH;
  const area = `${path} L${xAt(pts.length - 1)},${base} L${xAt(0)},${base} Z`;
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
          <p className="text-sm font-black tabular-nums">{bdt(hp.revenue)}</p>
          <p className="text-[10px] font-semibold text-sky-300">{hp.orders} orders</p>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Sales trend chart"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="salesStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D8232A" />
            <stop offset="55%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="ordersBar" x1="0" y1="0" x2="0" y2="1">
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
        {/* Order volume, scaled to the lower 35% of the plot. */}
        {pts.map((p, i) => {
          const h = (p.orders / maxO) * innerH * 0.35;
          return (
            <rect
              key={`b${i}`}
              x={xAt(i) - barW / 2}
              y={base - h}
              width={barW}
              height={h}
              rx={Math.min(3, barW / 2)}
              fill="url(#ordersBar)"
            />
          );
        })}
        <path d={area} fill="url(#salesFill)" />
        <path d={path} fill="none" stroke="url(#salesStroke)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={base} stroke="#cbd5e1" strokeDasharray="3 3" />
        )}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.revenue)}
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
            <rect
              x={xAt(i) - (step || innerW) / 2}
              y={PAD.top}
              width={step || innerW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-[#D8232A] to-orange-500" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-300" /> Orders
        </span>
        <span className="ml-auto text-neutral-400">Revenue excludes cancelled orders</span>
      </div>
    </div>
  );
}

/* ───────────────────────────────── Dashboard ─────────────────────────────── */

export function Dashboard() {
  // Permission state is supplied by the shared provider (fed by the login
  // response), so the dashboard does not re-fetch /admin/auth/me.
  const can = useCan();
  const [stats, setStats] = useState<Stats | null>(null);
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [range, setRange] = useState<string>('30d');
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const customersRef = useRef<HTMLDivElement | null>(null);
  const lowStockRef = useRef<HTMLDivElement | null>(null);

  const loadStats = useCallback(() => {
    setError(null);
    api
      .get<Stats>('/admin/stats')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadCustomers = useCallback(() => {
    setCustomersLoading(true);
    api
      .get<{ customers: Customer[] }>('/admin/customers')
      .then((res) => setCustomers(res.customers))
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
    loadCustomers();
  }, [loadStats, loadCustomers]);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    setOverviewLoading(true);
    api
      .get<SalesOverview>(`/admin/sales-overview?range=${range}`)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));
  }, [range]);

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6" />}
          title="Could not load the dashboard"
          hint="Please try again. If the problem persists, check that the API server is running."
        />
        <div className="flex justify-center mt-3">
          <button
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3.5 py-2 bg-[#D8232A] hover:bg-[#b51c22] text-white cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }
  if (!stats) return <DashboardSkeleton />;

  const canAnalytics = can(PERM.DASHBOARD_ANALYTICS);
  const canOrders = can(PERM.ORDERS_VIEW);

  /* Needs Attention — every count comes from real database aggregates. */
  const attentionItems = [
    canOrders && {
      key: 'pending',
      count: stats.pendingOrdersCount,
      en: 'pending orders',
      onClick: () => goOrders('pending'),
      tone: 'bg-amber-400/15 text-amber-200 ring-amber-300/30 hover:bg-amber-400/25',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    canOrders && {
      key: 'confirmed',
      count: stats.confirmedOrdersCount,
      en: 'awaiting packaging',
      onClick: () => goOrders('confirmed'),
      tone: 'bg-sky-400/15 text-sky-200 ring-sky-300/30 hover:bg-sky-400/25',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    can(PERM.PRODUCTS_VIEW) && {
      key: 'lowstock',
      count: stats.lowStockProducts.length,
      en: 'low stock',
      onClick: () => scrollTo(lowStockRef),
      tone: 'bg-orange-400/15 text-orange-200 ring-orange-300/30 hover:bg-orange-400/25',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    canOrders && {
      key: 'cancelled',
      count: stats.cancelledOrdersCount,
      en: 'cancelled',
      onClick: () => goOrders('cancelled'),
      tone: 'bg-rose-400/15 text-rose-200 ring-rose-300/30 hover:bg-rose-400/25',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  ].filter((item): item is Exclude<typeof item, false> => !!item && item.count > 0);

  // Hero copy — live greeting + date, no external data.
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const flowStages: { key: string; label: string; desc: string; count: number; theme: Theme; icon: ReactNode }[] = [
    { key: 'pending', label: 'Pending', desc: 'Waiting for review', count: stats.pendingOrdersCount, theme: 'amber', icon: <Clock className="w-4 h-4" /> },
    { key: 'confirmed', label: 'Confirmed', desc: 'Ready to pack', count: stats.confirmedOrdersCount, theme: 'blue', icon: <PackageCheck className="w-4 h-4" /> },
    { key: 'processing', label: 'Packaging', desc: 'Being packed', count: stats.activeOrdersCount, theme: 'violet', icon: <Boxes className="w-4 h-4" /> },
    { key: 'shipped', label: 'Shipped', desc: 'With the courier', count: stats.shippedOrdersCount, theme: 'cyan', icon: <Truck className="w-4 h-4" /> },
  ];
  const flowMax = Math.max(...flowStages.map((s) => s.count), 1);

  const divisionTotal = stats.categoryPerformance.reduce((s, c) => s + c.revenue, 0) || 1;
  const visibleCustomers = showAllCustomers ? customers : customers.slice(0, CUSTOMERS_PREVIEW);

  const bestPoint =
    overview && overview.points.length
      ? overview.points.reduce((best, p) => (p.revenue > best.revenue ? p : best), overview.points[0])
      : null;

  const orderFlowCard = canOrders && (
    <SectionCard
      titleEn="Order Flow"
      subtitle="Pending → shipped pipeline"
      icon={<Workflow className="w-4 h-4" />}
      theme="amber"
      className={canAnalytics ? '' : 'xl:col-span-3'}
    >
      <div className="p-5">
        <ol className={`grid gap-3 ${canAnalytics ? '' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
          {flowStages.map((s, i) => {
            const t = THEMES[s.theme];
            return (
              <li key={s.key}>
                <button
                  onClick={() => goOrders(s.key)}
                  className={`group w-full rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                    s.count > 0 ? 'border-neutral-200 bg-white' : 'border-dashed border-neutral-200 bg-neutral-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${t.chip} text-white shadow-sm`}>
                      {s.icon}
                      <span className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-black text-neutral-700 ring-1 ring-neutral-200">
                        {i + 1}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-neutral-900">{s.label}</p>
                      <p className="text-[10px] text-neutral-400">{s.desc}</p>
                    </div>
                    <span className="text-2xl font-black tabular-nums text-neutral-900">{s.count}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-600" />
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${t.bar} transition-all duration-500`}
                      style={{ width: `${s.count ? Math.max(6, (s.count / flowMax) * 100) : 0}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => goOrders('cancelled')}
            className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2.5 text-rose-700 ring-1 ring-rose-100 transition-colors hover:bg-rose-100 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
              <XCircle className="w-3.5 h-3.5" /> Cancelled
            </span>
            <span className="text-sm font-black tabular-nums">{stats.cancelledOrdersCount || 0}</span>
          </button>
          <button
            onClick={() => goOrders('returned')}
            className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2.5 text-indigo-700 ring-1 ring-indigo-100 transition-colors hover:bg-indigo-100 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
              <Undo2 className="w-3.5 h-3.5" /> Returned
            </span>
            <span className="text-sm font-black tabular-nums">{stats.returnedOrdersCount || 0}</span>
          </button>
        </div>
      </div>
    </SectionCard>
  );

  return (
    <div className="space-y-6">
      {/* ── Hero band ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0a12] via-[#2a0f1c] to-[#4a0d12] px-6 py-6 text-white shadow-[0_24px_60px_-28px_rgba(74,13,18,.8)] sm:px-8 sm:py-7">
        <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D8232A]/40 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-200/80">
              <Sparkles className="h-3.5 w-3.5" /> {greeting}
            </p>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">Business Overview</h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/60">
              A live snapshot of AKS Mart — sales, orders, customers and inventory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/15 backdrop-blur">
              <Clock className="h-3.5 w-3.5" /> {todayLabel}
            </span>
            <button
              onClick={() => { loadStats(); loadCustomers(); }}
              title="Refresh dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-neutral-900 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Needs attention */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Needs attention</span>
          {attentionItems.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> All caught up
            </span>
          ) : (
            attentionItems.map((a) => (
              <button
                key={a.key}
                onClick={a.onClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors cursor-pointer ${a.tone}`}
              >
                {a.icon}
                <span className="font-black tabular-nums">{a.count}</span> {a.en}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── KPI cards — role-aware (each card needs its module permission) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {canAnalytics && (
          <KpiCard
            icon={<Banknote className="w-5 h-5" />}
            labelEn="Total Sales"
            value={bdt(stats.revenue)}
            sub="All time, excl. cancelled"
            delta={stats.revenueDeltaPercent}
            theme="emerald"
          />
        )}
        {canOrders && (
          <KpiCard
            icon={<ShoppingBag className="w-5 h-5" />}
            labelEn="Total Orders"
            value={String(stats.ordersCount)}
            sub={<>{stats.deliveredOrdersCount} delivered</>}
            theme="blue"
            onClick={() => goOrders(null)}
          />
        )}
        {canOrders && (
          <KpiCard
            icon={<Clock className="w-5 h-5" />}
            labelEn="Pending Orders"
            value={String(stats.pendingOrdersCount)}
            sub={<>{stats.activeOrdersCount} in pipeline</>}
            theme="amber"
            highlight={stats.pendingOrdersCount > 0}
            onClick={() => goOrders('pending')}
          />
        )}
        {can(PERM.CUSTOMERS_VIEW) && (
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            labelEn="Customers"
            value={String(stats.customersCount)}
            sub="Total unique customers"
            theme="violet"
            onClick={() => scrollTo(customersRef)}
          />
        )}
        {can(PERM.PRODUCTS_VIEW) && (
          <KpiCard
            icon={<Boxes className="w-5 h-5" />}
            labelEn="Products"
            value={String(stats.productsCount)}
            sub={<>{stats.lowStockProducts.length} low stock</>}
            theme="rose"
            onClick={() => scrollTo(lowStockRef)}
          />
        )}
      </div>

      {/* ── Sales overview + order flow ───────────────────────────────────── */}
      {(canAnalytics || canOrders) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {canAnalytics && (
            <SectionCard
              titleEn="Sales Overview"
              subtitle="Revenue trend and order volume"
              icon={<TrendingUp className="w-4 h-4" />}
              theme="emerald"
              className={canOrders ? 'xl:col-span-2' : 'xl:col-span-3'}
              action={
                <div className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
                  {SALES_RANGES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRange(r.id)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        range === r.id
                          ? 'bg-gradient-to-r from-[#D8232A] to-rose-500 text-white shadow-sm shadow-rose-200'
                          : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/70'
                      }`}
                    >
                      {r.en}
                    </button>
                  ))}
                </div>
              }
            >
              {overviewLoading ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[70px] rounded-xl bg-neutral-100 animate-pulse" />
                    ))}
                  </div>
                  <div className="h-56 rounded-xl bg-neutral-100 animate-pulse" />
                </div>
              ) : !overview || overview.points.every((p) => p.revenue === 0 && p.orders === 0) ? (
                <div className="px-5 py-14">
                  <EmptyState
                    icon={<Banknote className="w-6 h-6" />}
                    title="No sales recorded in this period"
                    hint="Once customers place orders, the revenue trend appears here."
                  />
                </div>
              ) : (
                <div className="p-5">
                  <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Revenue', value: bdt(overview.totalRevenue), icon: <Banknote className="h-3.5 w-3.5" />, tone: 'from-rose-50 text-[#D8232A] ring-rose-100' },
                      { label: 'Orders', value: String(overview.totalOrders), icon: <ShoppingBag className="h-3.5 w-3.5" />, tone: 'from-indigo-50 text-indigo-600 ring-indigo-100' },
                      {
                        label: 'Avg. Order',
                        value: bdt(overview.totalOrders ? overview.totalRevenue / overview.totalOrders : 0),
                        icon: <Receipt className="h-3.5 w-3.5" />,
                        tone: 'from-emerald-50 text-emerald-600 ring-emerald-100',
                      },
                      { label: 'Best Period', value: bestPoint?.label ?? '—', icon: <Crown className="h-3.5 w-3.5" />, tone: 'from-amber-50 text-amber-600 ring-amber-100' },
                    ].map((m) => (
                      <div key={m.label} className={`rounded-xl bg-gradient-to-br ${m.tone} to-white p-3 ring-1`}>
                        <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-80">
                          {m.icon} {m.label}
                        </p>
                        <p className="mt-1 truncate text-lg font-black tracking-tight text-neutral-900 tabular-nums">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <SalesChart overview={overview} />
                </div>
              )}
            </SectionCard>
          )}
          {orderFlowCard}
        </div>
      )}

      {/* ── Recent orders + division performance ──────────────────────────── */}
      {(canOrders || canAnalytics) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <SectionCard
            titleEn="Recent Orders"
            subtitle="Latest orders across all channels"
            icon={<ShoppingBag className="w-4 h-4" />}
            theme="blue"
            className="xl:col-span-2"
            action={
              <button
                onClick={() => goOrders(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 transition-colors hover:bg-sky-100 cursor-pointer"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {stats.recentOrders.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<ShoppingBag className="w-6 h-6" />}
                  title="No orders yet"
                  hint="Customer orders will show up here the moment they are placed."
                />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {stats.recentOrders.map((o) => (
                  <li key={o.id} className="group px-5 py-3 flex items-center gap-3 flex-wrap transition-colors hover:bg-sky-50/40">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(o.customerName || o.id)} text-[11px] font-black text-white`}>
                      {(o.customerName || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-xs font-bold text-neutral-900 truncate">{o.customerName}</p>
                      <p className="text-[10px] text-neutral-400">
                        <span className="font-black text-neutral-600">{o.orderNumber}</span> · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <span className="hidden md:inline text-[10px] text-neutral-400 font-mono">{o.trackingCode}</span>
                    <StatusBadge status={o.status} />
                    <span className="text-xs font-black text-neutral-900 w-24 text-right tabular-nums">{bdt(o.total)}</span>
                    <button
                      onClick={() => goOrders(null, o.id)}
                      title="View order details"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-900 hover:text-white cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            titleEn="Division Performance"
            subtitle="Revenue share by division"
            icon={<LayoutGrid className="w-4 h-4" />}
            theme="violet"
          >
            {stats.categoryPerformance.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<Boxes className="w-6 h-6" />}
                  title="No sales data by division yet"
                  hint="Division performance appears once orders contain products."
                />
              </div>
            ) : (
              <div className="p-5">
                {/* Stacked share bar */}
                <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-neutral-100">
                  {stats.categoryPerformance.map((cat) => (
                    <div
                      key={cat.category}
                      title={`${DIVISION_META[cat.category]?.en ?? cat.categoryLabel}: ${Math.round((cat.revenue / divisionTotal) * 100)}%`}
                      className={`h-full bg-gradient-to-r ${(DIVISION_META[cat.category] ?? FALLBACK_DIVISION).bar}`}
                      style={{ width: `${(cat.revenue / divisionTotal) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="space-y-4">
                  {stats.categoryPerformance.map((cat) => {
                    const meta = DIVISION_META[cat.category];
                    const look = meta ?? FALLBACK_DIVISION;
                    const share = Math.round((cat.revenue / divisionTotal) * 100);
                    return (
                      <li key={cat.category}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="inline-flex items-center gap-2 text-xs font-black text-neutral-900">
                            <span className={`h-2.5 w-2.5 rounded-full ${look.dot}`} />
                            {meta ? meta.en : cat.categoryLabel || cat.category}
                          </p>
                          <p className={`text-xs font-black tabular-nums ${look.text}`}>{bdt(cat.revenue)}</p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${look.bar}`}
                            style={{ width: `${Math.max(4, share)}%` }}
                          />
                        </div>
                        <p className="mt-1 flex justify-between text-[10px] text-neutral-400">
                          <span>{cat.ordersCount} orders • {cat.qty} items</span>
                          <span className="font-bold text-neutral-500">{share}%</span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Top selling products + low stock ──────────────────────────────── */}
      {can(PERM.PRODUCTS_VIEW) && (
        <div ref={lowStockRef} className="grid grid-cols-1 xl:grid-cols-2 gap-6 scroll-mt-4">
          <SectionCard
            titleEn="Top Selling Products"
            subtitle="Ranked by units sold"
            icon={<Crown className="w-4 h-4" />}
            theme="emerald"
          >
            {stats.topProducts.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<ShoppingBag className="w-6 h-6" />}
                  title="No product sales yet"
                  hint="Best sellers are ranked from real order data."
                />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {stats.topProducts.map((p, i) => {
                  const look = DIVISION_META[p.category] ?? FALLBACK_DIVISION;
                  return (
                    <li key={`${p.name}-${i}`} className="px-5 py-3 flex items-center gap-3 transition-colors hover:bg-emerald-50/40">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black shadow-sm ${
                          RANK_STYLES[i] ?? 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      {p.image ? (
                        <img src={adminImageUrl(p.image)} alt="" className="w-11 h-11 rounded-xl object-cover bg-neutral-100 ring-1 ring-neutral-200 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{p.name}</p>
                        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${look.dot}`} />
                          {DIVISION_META[p.category]?.en ?? p.category}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-neutral-900 tabular-nums">{bdt(p.revenue)}</p>
                        <p className="inline-block mt-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {p.qty} sold
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            titleEn="Low Stock"
            subtitle={`At or below ${stats.lowStockLevel} units`}
            icon={<AlertTriangle className="w-4 h-4" />}
            theme="amber"
            action={
              stats.lowStockProducts.length > 0 ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">
                  {stats.lowStockProducts.length} items
                </span>
              ) : undefined
            }
          >
            {stats.lowStockProducts.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<PackageCheck className="w-6 h-6" />}
                  title="Stock levels are healthy"
                  hint={`No product is at or below ${stats.lowStockLevel} units.`}
                />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {stats.lowStockProducts.map((p) => {
                  const critical = p.lowestStock <= Math.max(3, Math.floor(stats.lowStockLevel / 2));
                  const tone =
                    p.lowestStock === 0
                      ? { badge: 'bg-red-50 text-red-700 ring-red-100', bar: 'bg-red-500' }
                      : critical
                      ? { badge: 'bg-orange-50 text-orange-700 ring-orange-100', bar: 'bg-orange-500' }
                      : { badge: 'bg-amber-50 text-amber-700 ring-amber-100', bar: 'bg-amber-400' };
                  return (
                    <li key={p.id} className="px-5 py-3 flex items-center gap-3 transition-colors hover:bg-amber-50/40">
                      {p.image ? (
                        <img src={adminImageUrl(p.image)} alt="" className="w-11 h-11 rounded-xl object-cover bg-neutral-100 ring-1 ring-neutral-200 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{p.sku}</p>
                        <div className="mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className={`h-full rounded-full ${tone.bar}`}
                            style={{ width: `${Math.max(4, (p.lowestStock / Math.max(stats.lowStockLevel, 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center text-[10px] font-black uppercase px-2.5 py-1 rounded-full ring-1 ${tone.badge}`}>
                        {p.lowestStock === 0 ? 'Out of stock' : `Only ${p.lowestStock} left`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Customers ─────────────────────────────────────────────────────── */}
      {can(PERM.CUSTOMERS_VIEW) && (
        <div ref={customersRef} className="scroll-mt-4">
          <SectionCard
            titleEn="Customers"
            subtitle="Every unique phone number that has ordered"
            icon={<Users className="w-4 h-4" />}
            theme="violet"
            action={
              stats.customersCount > 0 ? (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-black text-violet-700">
                  {stats.customersCount} total
                </span>
              ) : undefined
            }
          >
            {customersLoading ? (
              <Spinner />
            ) : customers.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<Users className="w-6 h-6" />}
                  title="No customers yet"
                  hint="Once orders are placed, each unique phone number becomes a customer here."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-neutral-50/80 text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                        <th className="px-5 py-3">Customer</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3 text-right">Orders</th>
                        <th className="px-4 py-3 text-right">Total Spent</th>
                        <th className="px-5 py-3 text-right">Last Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {visibleCustomers.map((c) => (
                        <tr key={c.phone} className="hover:bg-violet-50/40 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(c.phone)} text-white text-[11px] font-black flex items-center justify-center shrink-0`}>
                                {(c.name || '?').trim().charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-neutral-900 truncate">{c.name}</p>
                                <p className="text-[10px] text-neutral-400 font-mono truncate">{c.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {c.email ? (
                              <p className="text-[11px] text-neutral-600 flex items-center gap-1.5 truncate max-w-[180px]">
                                <Mail className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </p>
                            ) : (
                              <span className="text-[10px] text-neutral-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {c.division ? (
                              <p className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                <span className="truncate max-w-[130px]">
                                  {c.division}
                                  {c.district ? ` · ${c.district}` : ''}
                                </span>
                              </p>
                            ) : (
                              <span className="text-[10px] text-neutral-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-black text-sky-700 tabular-nums">
                              <ShoppingBag className="w-3 h-3" />
                              {c.ordersCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="text-xs font-black text-emerald-600 tabular-nums">{bdt(c.totalSpent)}</p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-[11px] font-semibold text-neutral-700">{formatDate(c.lastOrderAt)}</p>
                            <p className="text-[10px] text-neutral-400 font-mono">{c.lastOrderNumber}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {customers.length > CUSTOMERS_PREVIEW && (
                  <button
                    onClick={() => setShowAllCustomers((v) => !v)}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-neutral-100 py-3 text-[11px] font-bold text-violet-700 transition-colors hover:bg-violet-50/60 cursor-pointer"
                  >
                    {showAllCustomers ? 'Show less' : `Show all ${customers.length} customers`}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllCustomers ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
