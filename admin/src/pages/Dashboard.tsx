import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Customer, SalesOverview, Stats } from '../types';
import { EmptyState, Spinner, StatusBadge, formatDate } from '../components/ui';
import { hasPerm, PERM } from '../lib/permissions';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bell,
  Boxes,
  ChevronRight,
  Clock,
  Eye,
  Mail,
  MapPin,
  PackageCheck,
  RefreshCw,
  Undo2,
  ShoppingBag,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';

const bdt = (n: number) => `BDT ${Math.round(n).toLocaleString('en-IN')}`;

const SALES_RANGES = [
  { id: 'today', en: 'Today' },
  { id: '7d', en: '7 Days' },
  { id: '30d', en: '30 Days' },
  { id: '3m', en: '3 Months' },
  { id: '1y', en: '1 Year' },
] as const;

/** Division labels — mirrors the product categories stored in the database. */
const DIVISION_META: Record<string, { en: string }> = {
  food: { en: 'SHUDDHO' },
  craft: { en: 'AKS CRAFT' },
  home: { en: 'AKS HOME' },
  beauty: { en: 'AKS BEAUTY' },
  print: { en: 'AKS PRINT' },
  garments: { en: 'AKS Garments' },
};

/** Navigate to the Orders page, optionally pre-filtering or opening an order. */
function goOrders(filter?: string | null, orderId?: string | null) {
  if (filter) window.localStorage.setItem('aks_admin_order_filter', filter);
  if (orderId) window.localStorage.setItem('aks_admin_open_order', orderId);
  window.dispatchEvent(new CustomEvent('aks-admin-navigate', { detail: 'orders' }));
}

/* ─────────────────────────────── Loading skeleton ────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-4 h-24 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 h-80 animate-pulse" />
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 h-80 animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 h-64 animate-pulse" />
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
  accent,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  labelEn: string;
  value: string;
  sub?: React.ReactNode;
  delta?: number | null;
  accent: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white rounded-2xl border p-4 text-left transition-shadow ${
        highlight ? 'border-amber-300 shadow-sm ring-1 ring-amber-100' : 'border-neutral-200'
      } hover:shadow-md ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
        {delta != null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-neutral-400 leading-tight">
        {labelEn}
      </p>
      <p className="text-xl font-black text-neutral-900 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-neutral-400 mt-1 font-medium">{sub}</p>}
    </button>
  );
}

/* ─────────────────────────── Section shell (card) ────────────────────────── */

function SectionCard({
  titleEn,
  icon,
  action,
  children,
  className = '',
}: {
  titleEn: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-neutral-200 ${className}`}>
      <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
          {icon}
          <span>
            {titleEn}
          </span>
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<{ isSuper: boolean; permissions: string[] } | null>(null);
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [range, setRange] = useState<string>('30d');
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const customersRef = useRef<HTMLDivElement | null>(null);

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
    // Role-aware dashboard — widgets render only for permitted modules.
    api
      .get<{ admin: { isSuper: boolean; permissions: string[] } }>('/admin/auth/me')
      .then((r) => setMe(r.admin))
      .catch(() => setMe({ isSuper: false, permissions: [] }));
  }, [loadStats, loadCustomers]);

  const scrollToCustomers = () => {
    customersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  if (!stats || !me) return <DashboardSkeleton />;
  const can = (p: string) => hasPerm(me, p);

  /* Needs Attention — every count comes from real database aggregates. */
  const attentionItems = [
    {
      key: 'pending',
      count: stats.pendingOrdersCount,
      en: 'Pending Orders',
      desc: 'New orders waiting for your review',
      actionEn: 'View Orders',
      onClick: () => goOrders('pending'),
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock className="w-4 h-4" />,
      highlight: true,
    },
    {
      key: 'confirmed',
      count: stats.confirmedOrdersCount,
      en: 'Awaiting Packaging',
      desc: 'Confirmed orders ready to be packed',
      actionEn: 'View Orders',
      onClick: () => goOrders('confirmed'),
      tone: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <PackageCheck className="w-4 h-4" />,
      highlight: false,
    },
    {
      key: 'lowstock',
      count: stats.lowStockProducts.length,
      en: 'Low Stock Products',
      desc: `At or below ${stats.lowStockLevel} units`,
      actionEn: null,
      onClick: undefined,
      tone: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: <AlertTriangle className="w-4 h-4" />,
      highlight: false,
    },
    {
      key: 'cancelled',
      count: stats.cancelledOrdersCount,
      en: 'Cancelled Orders',
      desc: 'Recently cancelled — worth a review',
      actionEn: 'View Latest',
      onClick: () => goOrders('cancelled'),
      tone: 'bg-red-50 text-red-700 border-red-200',
      icon: <XCircle className="w-4 h-4" />,
      highlight: false,
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-neutral-900">
            Business Overview
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            A live snapshot of AKS Mart — sales, orders, customers and inventory.
          </p>
        </div>
      </div>

      {/* KPI cards — role-aware (each card needs its module permission) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {can(PERM.DASHBOARD_ANALYTICS) && (
          <KpiCard
            icon={<Banknote className="w-4 h-4" />}
            labelEn="Total Sales"
            value={bdt(stats.revenue)}
            sub="All time, excl. cancelled"
            delta={stats.revenueDeltaPercent}
            accent="bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
          />
        )}
        {can(PERM.ORDERS_VIEW) && (
          <KpiCard
            icon={<ShoppingBag className="w-4 h-4" />}
            labelEn="Total Orders"
            value={String(stats.ordersCount)}
            sub={<>{stats.deliveredOrdersCount} delivered</>}
            accent="bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
            onClick={() => goOrders(null)}
          />
        )}
        {can(PERM.ORDERS_VIEW) && (
          <KpiCard
            icon={<Clock className="w-4 h-4" />}
            labelEn="Pending Orders"
            value={String(stats.pendingOrdersCount)}
            sub={<>{stats.activeOrdersCount} in pipeline</>}
            accent="bg-gradient-to-br from-amber-400 to-orange-500 text-white"
            highlight={stats.pendingOrdersCount > 0}
            onClick={() => goOrders('pending')}
          />
        )}
        {can(PERM.CUSTOMERS_VIEW) && (
          <KpiCard
            icon={<Users className="w-4 h-4" />}
            labelEn="Customers"
            value={String(stats.customersCount)}
            sub="Total unique customers"
            accent="bg-gradient-to-br from-violet-500 to-purple-600 text-white"
            onClick={scrollToCustomers}
          />
        )}
        {can(PERM.PRODUCTS_VIEW) && (
          <KpiCard
            icon={<Boxes className="w-4 h-4" />}
            labelEn="Products"
            value={String(stats.productsCount)}
            sub={<>{stats.lowStockProducts.length} low stock</>}
            accent="bg-gradient-to-br from-rose-500 to-pink-500 text-white"
          />
        )}
      </div>

      {/* __PART2__ */}

      {/* Order Flow Notifications — pending → confirmed → packaging → shipped */}
      {can(PERM.ORDERS_VIEW) && (
      <SectionCard
        titleEn="Order Flow"
        icon={<Bell className="w-4 h-4 text-[#D8232A]" />}
      >
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { key: 'pending', label: 'Pending', count: stats.pendingOrdersCount, tone: 'bg-amber-50 border-amber-200 text-amber-700', icon: <Clock className="w-4 h-4" />, filter: 'pending' },
              { key: 'confirmed', label: 'Confirmed', count: stats.confirmedOrdersCount, tone: 'bg-blue-50 border-blue-200 text-blue-700', icon: <PackageCheck className="w-4 h-4" />, filter: 'confirmed' },
              { key: 'processing', label: 'Packaging', count: stats.activeOrdersCount, tone: 'bg-violet-50 border-violet-200 text-violet-700', icon: <Boxes className="w-4 h-4" />, filter: 'processing' },
              { key: 'shipped', label: 'Shipped', count: stats.shippedOrdersCount, tone: 'bg-cyan-50 border-cyan-200 text-cyan-700', icon: <Truck className="w-4 h-4" />, filter: 'shipped' },
            ].map((s, i, arr) => (
              <div key={s.key} className="relative">
                <button
                  onClick={() => goOrders(s.filter)}
                  className={`w-full text-left rounded-2xl border p-4 ${s.tone} ${s.count > 0 ? 'ring-2 ring-offset-1 ring-current/30 hover:scale-[1.02] cursor-pointer' : 'opacity-60 cursor-pointer'} transition-all`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
                      {s.icon} {s.label}
                    </span>
                    {s.count > 0 && (
                      <span className="text-[10px] font-black bg-white/70 rounded-full px-2 py-0.5 animate-pulse">
                        {s.count} new
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-black leading-none mt-2">{s.count}</p>
                  <p className="text-[10px] opacity-80 mt-1">{s.count > 0 ? `Click to view →` : 'Nothing here'}</p>
                </button>
                {i < arr.length - 1 && (
                  <span className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 items-center justify-center text-neutral-300">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
          {(stats.cancelledOrdersCount || 0) > 0 && (
            <button
              onClick={() => goOrders('cancelled')}
              className="mt-3 w-full text-left rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2.5 flex items-center justify-between hover:bg-red-100 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase">
                <XCircle className="w-4 h-4" /> Cancelled Orders
              </span>
              <span className="text-sm font-black">{stats.cancelledOrdersCount}</span>
            </button>
          )}
          {(stats.returnedOrdersCount || 0) > 0 && (
            <button
              onClick={() => goOrders('returned')}
              className="mt-2 w-full text-left rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2.5 flex items-center justify-between hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase">
                <Undo2 className="w-4 h-4" /> Returned Orders
              </span>
              <span className="text-sm font-black">{stats.returnedOrdersCount}</span>
            </button>
          )}
        </div>
      </SectionCard>
      )}

      {/* __PART3__ */}

      {/* Sales Overview — analytics permission required */}
      {can(PERM.DASHBOARD_ANALYTICS) && (
      <SectionCard
        titleEn="Sales Overview"
        icon={<Banknote className="w-4 h-4 text-emerald-500" />}
        className="overflow-hidden"
        action={
          <div className="flex flex-wrap gap-1.5">
            {SALES_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  range === r.id
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
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
            <div className="h-56 rounded-xl bg-neutral-100 animate-pulse" />
            <div className="h-4 w-48 rounded bg-neutral-100 animate-pulse" />
          </div>
        ) : !overview || overview.points.every((p) => p.revenue === 0 && p.orders === 0) ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Banknote className="w-6 h-6" />}
              title="No sales recorded in this period"
              hint="Once customers place orders, the revenue trend appears here."
            />
          </div>
        ) : (
          <div className="p-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Revenue</p>
                <p className="text-2xl font-black text-[#D8232A]">{bdt(overview.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Orders</p>
                <p className="text-2xl font-black text-neutral-900">{overview.totalOrders}</p>
              </div>
            </div>

            {(() => {
              const W = 640;
              const H = 220;
              const PAD = { top: 12, right: 8, bottom: 26, left: 8 };
              const pts = overview.points;
              const maxV = Math.max(...pts.map((p) => p.revenue), 1);
              const innerW = W - PAD.left - PAD.right;
              const innerH = H - PAD.top - PAD.bottom;
              const step = pts.length > 1 ? innerW / (pts.length - 1) : 0;
              const xy = (v: number, i: number): [number, number] => [
                PAD.left + i * step,
                PAD.top + innerH - (v / maxV) * innerH,
              ];
              const line = pts.map((p, i) => xy(p.revenue, i).join(',')).join(' ');
              const area = `${PAD.left},${PAD.top + innerH} ${line} ${PAD.left + (pts.length - 1) * step},${PAD.top + innerH}`;
              const labelEvery = Math.max(1, Math.ceil(pts.length / 8));
              return (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Sales trend chart">
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D8232A" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#D8232A" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <line
                      key={f}
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={PAD.top + innerH * (1 - f)}
                      y2={PAD.top + innerH * (1 - f)}
                      stroke="#f0f0f1"
                      strokeWidth="1"
                    />
                  ))}
                  <polygon points={area} fill="url(#salesFill)" />
                  <polyline points={line} fill="none" stroke="#D8232A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle cx={xy(p.revenue, i)[0]} cy={xy(p.revenue, i)[1]} r="3" fill="#fff" stroke="#D8232A" strokeWidth="2" />
                      {i % labelEvery === 0 && (
                        <text x={xy(p.revenue, i)[0]} y={H - 8} textAnchor="middle" fontSize="9" fill="#a3a3a3" fontWeight="600">
                          {p.label}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              );
            })()}
            <p className="text-[10px] text-neutral-400 mt-2">
              Revenue excludes cancelled orders
            </p>
          </div>
        )}
      </SectionCard>
      )}

      {/* Recent Orders + Division performance */}
      {(can(PERM.ORDERS_VIEW) || can(PERM.DASHBOARD_ANALYTICS)) && (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <SectionCard
          titleEn="Recent Orders"
          icon={<ShoppingBag className="w-4 h-4 text-blue-500" />}
          className="xl:col-span-2"
          action={
            <button
              onClick={() => goOrders(null)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D8232A] hover:underline cursor-pointer"
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
                <li key={o.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-[130px]">
                    <p className="text-xs font-black text-neutral-900">{o.orderNumber}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{o.trackingCode}</p>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-xs font-bold text-neutral-800 truncate">{o.customerName}</p>
                    <p className="text-[10px] text-neutral-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <span className="text-xs font-black text-neutral-900 w-20 text-right">{bdt(o.total)}</span>
                  <button
                    onClick={() => goOrders(null, o.id)}
                    title="View order details"
                    className="inline-flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          titleEn="Division Performance"
          icon={<Boxes className="w-4 h-4 text-violet-500" />}
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
            <div className="p-5 space-y-4">
              {stats.categoryPerformance.map((cat) => {
                const meta = DIVISION_META[cat.category];
                const maxRevenue = Math.max(...stats.categoryPerformance.map((c) => c.revenue), 1);
                const pct = Math.max(4, Math.round((cat.revenue / maxRevenue) * 100));
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-black text-neutral-900">
                        {meta ? meta.en : cat.categoryLabel || cat.category}
                      </p>
                      <p className="text-xs font-black text-[#D8232A]">{bdt(cat.revenue)}</p>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#D8232A]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {cat.ordersCount} orders • {cat.qty} items sold
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
      )}

      {/* All Customers — customers permission required */}
      {can(PERM.CUSTOMERS_VIEW) && (
      <div ref={customersRef} className="scroll-mt-4">
        <SectionCard
          titleEn="All Customers"
          icon={<Users className="w-4 h-4 text-violet-500" />}
          className="w-full"
          action={
            stats.customersCount > 0 ? (
              <span className="text-[11px] font-bold text-neutral-400">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Total Spent</th>
                    <th className="px-5 py-3 text-right">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {customers.map((c) => (
                    <tr key={c.phone} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
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
                            <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </p>
                        ) : (
                          <span className="text-[10px] text-neutral-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.division ? (
                          <p className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
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
                        <span className="inline-flex items-center gap-1 text-xs font-black text-neutral-900">
                          <ShoppingBag className="w-3 h-3 text-neutral-400" />
                          {c.ordersCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-black text-[#D8232A]">{bdt(c.totalSpent)}</p>
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
          )}
        </SectionCard>
      </div>
      )}

      {/* Top Selling Products + Low Stock */}
      {can(PERM.PRODUCTS_VIEW) && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard
          titleEn="Top Selling Products"
          icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />}
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
              {stats.topProducts.map((p, i) => (
                <li key={`${p.name}-${i}`} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  {p.image ? (
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      {DIVISION_META[p.category]?.en ?? p.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-neutral-900">{bdt(p.revenue)}</p>
                    <p className="text-[10px] text-neutral-400">{p.qty} sold</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          titleEn="Low Stock"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
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
              {stats.lowStockProducts.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{p.sku}</p>
                  </div>
                  <span
                    className={`inline-flex items-center text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      p.lowestStock === 0
                        ? 'bg-red-50 text-red-700'
                        : p.lowestStock <= Math.max(3, Math.floor(stats.lowStockLevel / 2))
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {p.lowestStock === 0
                      ? 'Out of stock'
                      : `Only ${p.lowestStock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
      )}
    </div>
  );
}