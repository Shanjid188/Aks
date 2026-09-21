import { useEffect, useMemo, useState } from 'react';
import type { AdminUser } from './api';
import aksLogo from './assets/AKS.logo.jpg';
import { api, getStoredAdmin, setStoredAdmin, setToken } from './api';
import { hasPerm, PERM } from './lib/permissions';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ProductsPage } from './pages/Products';
import { OrdersPage } from './pages/Orders';
import { OrderOverviewPage } from './pages/OrderOverview';
import { ShippedPage } from './pages/Shipped';
import { CustomersPage } from './pages/Customers';
import { CouponsPage } from './pages/Coupons';
import { ReviewsPage } from './pages/Reviews';
import { HeroSlidesPage } from './pages/HeroSlides';
import { RolesPage } from './pages/Roles';
import { AdminsPage } from './pages/Admins';
import { ActivityLogsPage } from './pages/ActivityLogs';
import { ExpensesPage } from './pages/Expenses';
import { InventoryPage } from './pages/Inventory';
import { InvoicesPage } from './pages/Invoices';
import { PackagingPage } from './pages/Packaging';
import { PosPage } from './pages/POS';
import { PurchasesPage } from './pages/Purchases';
import { ReportsPage } from './pages/Reports';
import { ReturnsPage } from './pages/Returns';
import { SettingsPage } from './pages/Settings';
import { SuppliersPage } from './pages/Suppliers';
import StorefrontPage from './pages/Storefront';
import {
  Activity, BarChart3, Boxes, Calculator, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock, FileText, Image, LayoutDashboard, LogOut, Menu, Package,
  PackageCheck, Receipt, RotateCcw, Search, Settings, ShieldCheck, ShoppingBag,
  ShoppingCart, Sparkles, Star, Ticket, Truck, UserCog, Users, X, XCircle, Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';

type PageKey =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'invoices'
  | 'packaging'
  | 'returns'
  | 'customers'
  | 'coupons'
  | 'reviews'
  | 'suppliers'
  | 'purchases'
  | 'expenses'
  | 'reports'
  | 'activity'
  | 'slides'
  | 'storefront'
  | 'admins'
  | 'roles'
  | 'settings'
  | 'orderoverview'
  | 'orders_pending' | 'orders_confirmed'
  | 'orders_shipped' | 'orders_delivered' | 'orders_cancelled' | 'orders_returned'
  | 'shippedpage';

/** Sidebar entries — each requires a `view` permission to be visible. */
const NAV: { key: PageKey; label: string; icon: ReactNode; permission: string; desc: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, permission: PERM.DASHBOARD_VIEW, desc: 'Business overview' },
  { key: 'pos', label: 'POS Register', icon: <Calculator className="w-[18px] h-[18px]" />, permission: PERM.POS_VIEW, desc: 'Point of sale' },
  { key: 'orders', label: 'Orders', icon: <Package className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Customer orders' },
  { key: 'products', label: 'Products', icon: <ShoppingBag className="w-[18px] h-[18px]" />, permission: PERM.PRODUCTS_VIEW, desc: 'Catalog & stock' },
  { key: 'inventory', label: 'Inventory', icon: <Boxes className="w-[18px] h-[18px]" />, permission: PERM.INVENTORY_VIEW, desc: 'Stock levels' },
  { key: 'invoices', label: 'Invoices', icon: <FileText className="w-[18px] h-[18px]" />, permission: PERM.INVOICES_VIEW, desc: 'Printable invoices' },
  { key: 'packaging', label: 'Packaging', icon: <PackageCheck className="w-[18px] h-[18px]" />, permission: PERM.PACKAGING_VIEW, desc: 'Pack & dispatch' },
  { key: 'returns', label: 'Returns & Refunds', icon: <RotateCcw className="w-[18px] h-[18px]" />, permission: PERM.REFUNDS_VIEW, desc: 'Return requests' },
  { key: 'customers', label: 'Customers', icon: <Users className="w-[18px] h-[18px]" />, permission: PERM.CUSTOMERS_VIEW, desc: 'Customer list' },
  { key: 'coupons', label: 'Coupons', icon: <Ticket className="w-[18px] h-[18px]" />, permission: PERM.COUPONS_VIEW, desc: 'Discount codes' },
  { key: 'reviews', label: 'Reviews', icon: <Star className="w-[18px] h-[18px]" />, permission: PERM.REVIEWS_VIEW, desc: 'Ratings & reviews' },
  { key: 'suppliers', label: 'Suppliers', icon: <Truck className="w-[18px] h-[18px]" />, permission: PERM.SUPPLIERS_VIEW, desc: 'Supplier list' },
  { key: 'purchases', label: 'Purchases', icon: <ShoppingCart className="w-[18px] h-[18px]" />, permission: PERM.PURCHASES_VIEW, desc: 'Stock-in orders' },
  { key: 'expenses', label: 'Expenses', icon: <Receipt className="w-[18px] h-[18px]" />, permission: PERM.EXPENSES_VIEW, desc: 'Business costs' },
  { key: 'reports', label: 'Reports', icon: <BarChart3 className="w-[18px] h-[18px]" />, permission: PERM.REPORTS_VIEW, desc: 'Sales & analytics' },
  { key: 'activity', label: 'Activity Logs', icon: <Activity className="w-[18px] h-[18px]" />, permission: PERM.ACTIVITY_LOGS_VIEW, desc: 'Audit trail' },
  { key: 'slides', label: 'Hero Slides', icon: <Image className="w-[18px] h-[18px]" />, permission: PERM.SLIDES_VIEW, desc: 'Homepage banners' },
  { key: 'storefront', label: 'Storefront', icon: <Sparkles className="w-[18px] h-[18px]" />, permission: PERM.STOREFRONT_VIEW, desc: 'Promos & announcements' },
  { key: 'admins', label: 'Admin Users', icon: <UserCog className="w-[18px] h-[18px]" />, permission: PERM.ADMINS_VIEW, desc: 'Team accounts' },
  { key: 'roles', label: 'Roles & Permissions', icon: <ShieldCheck className="w-[18px] h-[18px]" />, permission: PERM.ROLES_VIEW, desc: 'Access control' },
  { key: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" />, permission: PERM.SETTINGS_VIEW, desc: 'Store configuration' },
  { key: 'orderoverview', label: 'Order Overview', icon: <BarChart3 className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Order counts by status' },
  // Status shortcuts — all open the Orders page with a preset status filter.
  { key: 'orders_pending', label: 'Pending', icon: <Clock className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Pending orders' },
  { key: 'orders_confirmed', label: 'Confirmed', icon: <PackageCheck className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Confirmed orders' },
  { key: 'orders_shipped', label: 'Shipped', icon: <Truck className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Shipped orders' },
  { key: 'orders_delivered', label: 'Delivered', icon: <CheckCircle2 className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Delivered orders' },
  { key: 'orders_cancelled', label: 'Cancelled', icon: <XCircle className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Cancelled orders' },
  { key: 'orders_returned', label: 'Returned', icon: <Undo2 className="w-[18px] h-[18px]" />, permission: PERM.ORDERS_VIEW, desc: 'Returned orders' },
];

/**
 * Sidebar grouping — related modules live under a parent section. Each group
 * shows only when the admin can access at least one of its children.
 * POS is intentionally NOT here — it is exposed as a quick button in the topbar.
 */
const NAV_GROUPS: { key: string; label: string; icon: ReactNode; keys: PageKey[] }[] = [
  { key: 'operation', label: 'Operation', icon: <ShoppingCart className="w-4 h-4" />, keys: ['orders_pending', 'orders_confirmed', 'packaging', 'orders_shipped', 'orders_delivered', 'orders_cancelled', 'orders_returned', 'invoices', 'returns', 'customers'] },
  { key: 'catalog', label: 'Catalog', icon: <Boxes className="w-4 h-4" />, keys: ['products', 'inventory', 'purchases', 'suppliers'] },
  { key: 'marketing', label: 'Marketing', icon: <Sparkles className="w-4 h-4" />, keys: ['coupons', 'reviews', 'slides', 'storefront'] },
  { key: 'finance', label: 'Finance', icon: <BarChart3 className="w-4 h-4" />, keys: ['expenses', 'reports'] },
  { key: 'administration', label: 'Administration', icon: <ShieldCheck className="w-4 h-4" />, keys: ['admins', 'roles', 'activity', 'settings'] },
];

/** Dashboard is a single standalone menu — it has no children so it never becomes a parent group. */
const DASHBOARD_NAV_KEY: PageKey = 'dashboard';


/** Access Denied — shown when a page is opened without its required permission. */
function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center text-3xl">🚫</div>
      <h2 className="mt-4 text-lg font-black text-neutral-900">Access Denied</h2>
      <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
        You don't have permission to open this module. Ask a Super Admin to grant the required
        permission to your role.
      </p>
      <button
        onClick={onBack}
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] text-white cursor-pointer"
      >
        🏠 Back to Dashboard
      </button>
    </div>
  );
}

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(() => getStoredAdmin());
  const [page, setPage] = useState<PageKey>('dashboard');
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0); // fed by aks-admin-low-stock-count
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile off-canvas
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('aks_admin_sidebar_collapsed') === '1'
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(NAV_GROUPS.map((g) => g.key)));
  const [searchQuery, setSearchQuery] = useState('');
  // Which status shortcut is currently active (e.g. 'pending') — used so the
  // sidebar highlights the right child when the Orders page is showing a filter,
  // and passed to OrdersPage so it can switch filters without a full remount.
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  // Permission-aware navigation — hidden modules never render.
  const allowedNav = useMemo(
    () => (admin ? NAV.filter((item) => hasPerm(admin, item.permission)) : []),
    [admin]
  );

  // Groups sorted by their first child's index, filtered to groups the admin can use.
  const allowedGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.keys
          .map((k) => NAV.find((n) => n.key === k))
          .filter((n): n is NonNullable<typeof n> => !!n && hasPerm(admin!, n.permission)),
      })).filter((g) => g.items.length > 0),
    [admin]
  );

  useEffect(() => {
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('aks-admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('aks-admin-unauthorized', onUnauthorized);
  }, []);

  // Seed the sidebar notification badges on load (and refresh every 60s) so the
  // counts are visible from ANY page — not only after visiting Orders/Inventory,
  // which also publish aks-admin-pending-count / aks-admin-low-stock-count events.
  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    const seedBadges = async () => {
      try {
        const res = await api.get<{ orders: Array<{ status: string }> }>('/admin/orders');
        if (!cancelled) {
          setPendingOrders(res.orders.filter((o) => o.status === 'pending').length);
        }
      } catch {
        /* no orders.view permission — pending badge stays silent */
      }
      try {
        const res = await api.get<{ lowStockCount?: number }>('/admin/inventory');
        if (!cancelled) setLowStockCount(res.lowStockCount ?? 0);
      } catch {
        /* no inventory.view permission — low-stock badge stays silent */
      }
    };
    seedBadges();
    const timer = window.setInterval(seedBadges, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [admin]);

  // Cross-page navigation (Dashboard → Orders etc.) + live pending-order badge.
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (NAV.some((n) => n.key === target)) {
        // Status shortcuts open the Orders page with a preset status filter.
        const m = target.match(/^orders_(pending|confirmed|shipped|delivered|cancelled|returned)$/);
        if (m) {
          if (m[1] === 'shipped') {
            setPage('shippedpage');
          } else {
            window.localStorage.setItem('aks_admin_order_filter', m[1]);
            setPage('orders');
          }
        } else {
          setPage(target as PageKey);
        }
      }
      window.scrollTo({ top: 0 });
    };
    const onPendingCount = (e: Event) => {
      setPendingOrders(Number((e as CustomEvent<number>).detail) || 0);
    };
    const onLowStockCount = (e: Event) => {
      setLowStockCount(Number((e as CustomEvent<number>).detail) || 0);
    };
    window.addEventListener('aks-admin-navigate', onNavigate);
    window.addEventListener('aks-admin-pending-count', onPendingCount);
    window.addEventListener('aks-admin-low-stock-count', onLowStockCount);
    return () => {
      window.removeEventListener('aks-admin-navigate', onNavigate);
      window.removeEventListener('aks-admin-pending-count', onPendingCount);
      window.removeEventListener('aks-admin-low-stock-count', onLowStockCount);
    };
  }, []);

  // If the active page loses its permission (role change), fall back to dashboard.
  useEffect(() => {
    if (!admin) return;
    const current = NAV.find((n) => n.key === page);
    if (current && !hasPerm(admin, current.permission)) setPage('dashboard');
  }, [admin, page]);

  if (!admin) {
    return <LoginPage onSuccess={(a) => setAdmin(a)} />;
  }

  const logout = () => {
    setToken(null);
    setStoredAdmin(null);
    // Clear other admin-related storage so nothing sensitive lingers.
    localStorage.removeItem('aks_admin_order_filter');
    localStorage.removeItem('aks_admin_open_order');
    setAdmin(null);
  };

  const navigate = (key: PageKey) => {
    // Status shortcuts (orders_pending, orders_confirmed, ...) open the Orders
    // page with a preset status filter via localStorage — the Orders page reads
    // and removes it on mount, the same mechanism Dashboard "View" actions use.
    const shortcutMatch = key.match(/^orders_(pending|confirmed|shipped|delivered|cancelled)$/);
    if (shortcutMatch) {
      if (shortcutMatch[1] === 'shipped') {
        // Shipped has its own dedicated page (courier handoff → delivery/return).
        setActiveShortcut('shipped');
        setPage('shippedpage');
      } else {
        window.localStorage.setItem('aks_admin_order_filter', shortcutMatch[1]);
        setActiveShortcut(shortcutMatch[1]);
        setPage('orders');
      }
    } else {
      setActiveShortcut(null);
      setPage(key);
    }
    setDrawerOpen(false);
    setSearchQuery('');
    window.scrollTo({ top: 0 });
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Active child always keeps its parent expanded — auto-expand on navigation.
  useEffect(() => {
    const g = NAV_GROUPS.find((grp) => grp.keys.includes(page));
    if (g) {
      setOpenGroups((prev) => (prev.has(g.key) ? prev : new Set(prev).add(g.key)));
    }
  }, [page]);

  // Modules matching the top-bar search query (label / group / description).
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allowedNav
      .map((item) => {
        if (item.key === DASHBOARD_NAV_KEY) return { ...item, groupLabel: 'Dashboard' };
        if (item.key === 'pos') return { ...item, groupLabel: 'POS' };
        const group = NAV_GROUPS.find((g) => g.keys.includes(item.key));
        return { ...item, groupLabel: group?.label ?? '' };
      })
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.key.includes(q) ||
          item.groupLabel.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, allowedNav]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('aks_admin_sidebar_collapsed', c ? '0' : '1');
      return !c;
    });
  };

  const render = () => {
    const item = NAV.find((n) => n.key === page);
    if (item && !hasPerm(admin, item.permission)) return <AccessDenied onBack={() => navigate('dashboard')} />;
    switch (page) {
      case 'pos':
        return <PosPage />;
      case 'orders':
        return <OrdersPage initialFilter={activeShortcut ?? undefined} />;
      case 'shippedpage':
        return <ShippedPage />;
      case 'orderoverview':
        return <OrderOverviewPage />;
      case 'products':
        return <ProductsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'packaging':
        return <PackagingPage />;
      case 'returns':
        return <ReturnsPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'activity':
        return <ActivityLogsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'coupons':
        return <CouponsPage />;
      case 'slides':
        return <HeroSlidesPage />;
      case 'storefront':
        return <StorefrontPage />;
      case 'reviews':
        return <ReviewsPage />;
      case 'admins':
        return <AdminsPage />;
      case 'roles':
        return <RolesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  const sidebarInner = (inDrawer: boolean) => {
    // Mobile drawer always renders the full expanded hierarchy, even while the desktop sidebar stays collapsed.
    const effectiveCollapsed = collapsed && !inDrawer;
    // Dashboard is standalone (never inside a parent group); POS Register lives in the topbar only.
    const dashboardItem = allowedNav.find((n) => n.key === DASHBOARD_NAV_KEY);
    // Order Overview is a standalone menu (like Dashboard) — just counts, sits right under Dashboard.
    const overviewItem = allowedNav.find((n) => n.key === 'orderoverview');
    return (
    <>
      {/* Brand */}
      <div className="p-4 flex items-center gap-3 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent">
        <div className="relative shrink-0">
          <img src={aksLogo} alt="AKS Mart" className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#D8232A]/30" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f0f10]" />
        </div>
        {!effectiveCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white tracking-tight">AKS Admin</p>
            <p className="text-[10px] text-neutral-500">Management Console</p>
          </div>
        )}
        {inDrawer && (
          <button
            onClick={() => setDrawerOpen(false)}
            className="ml-auto lg:hidden text-neutral-400 hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation - ERP hierarchy: standalone Dashboard first, then parent -> child groups */}
      <nav className={`p-3 space-y-1 flex-1 overflow-y-auto scrollbar-thin ${effectiveCollapsed ? 'px-2' : ''}`}>
        {allowedNav.length === 0 && !effectiveCollapsed && (
          <p className="text-[11px] text-neutral-500 px-3 py-4 leading-relaxed">
            No modules assigned to your role. Contact a Super Admin.
          </p>
        )}

        {/* Standalone Dashboard - single menu, never a parent (POS Register lives in the topbar only) */}
        {dashboardItem && (
          <button
            key={dashboardItem.key}
            onClick={() => navigate(dashboardItem.key)}
            title={effectiveCollapsed ? dashboardItem.label : dashboardItem.desc}
            aria-label={dashboardItem.label}
            aria-current={page === dashboardItem.key ? 'page' : undefined}
            className={`w-full flex items-center transition-all duration-200 cursor-pointer group ${
              effectiveCollapsed ? 'justify-center rounded-xl py-2.5' : 'gap-2.5 rounded-xl px-2.5 py-2.5'
            } ${
              page === dashboardItem.key
                ? 'bg-gradient-to-r from-[#D8232A] to-[#e53e3e] text-white shadow-lg shadow-red-950/40'
                : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
                page === dashboardItem.key ? 'bg-white/20 text-white' : 'bg-white/[0.04] text-neutral-400 group-hover:text-white'
              }`}
            >
              {dashboardItem.icon}
            </span>
            {!effectiveCollapsed && (
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-xs font-bold leading-tight truncate">{dashboardItem.label}</span>
                <span className={`block text-[10px] leading-tight truncate ${page === dashboardItem.key ? 'text-white/75' : 'text-neutral-500'}`}>
                  {dashboardItem.desc}
                </span>
              </span>
            )}
          </button>
        )}

        {/* Standalone Order Overview — sits right under Dashboard (counts only, no children) */}
        {overviewItem && (
          <button
            key={overviewItem.key}
            onClick={() => navigate(overviewItem.key)}
            title={effectiveCollapsed ? overviewItem.label : overviewItem.desc}
            aria-label={overviewItem.label}
            aria-current={page === overviewItem.key ? 'page' : undefined}
            className={`w-full flex items-center transition-all duration-200 cursor-pointer group ${
              effectiveCollapsed ? 'justify-center rounded-xl py-2.5' : 'gap-2.5 rounded-xl px-2.5 py-2.5'
            } ${
              page === overviewItem.key
                ? 'bg-gradient-to-r from-[#D8232A] to-[#e53e3e] text-white shadow-lg shadow-red-950/40'
                : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
                page === overviewItem.key ? 'bg-white/20 text-white' : 'bg-white/[0.04] text-neutral-400 group-hover:text-white'
              }`}
            >
              {overviewItem.icon}
            </span>
            {!effectiveCollapsed && (
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-xs font-bold leading-tight truncate">{overviewItem.label}</span>
                <span className={`block text-[10px] leading-tight truncate ${page === overviewItem.key ? 'text-white/75' : 'text-neutral-500'}`}>
                  {overviewItem.desc}
                </span>
              </span>
            )}
          </button>
        )}

        {/* Collapsed desktop rail - hierarchy preserved: one icon per parent group (no flat full list) */}
        {effectiveCollapsed &&
          allowedGroups.map((group) => {
            const groupActive = group.items.some((n) => n.key === page);
            const firstVisible = group.items[0];
            return (
              <button
                key={group.key}
                onClick={() => {
                  if (firstVisible) navigate(firstVisible.key);
                  setOpenGroups((prev) => new Set(prev).add(group.key));
                }}
                title={`${group.label} - ${group.items.map((n) => n.label).join(', ')}`}
                aria-label={group.label}
                className={`w-full flex items-center justify-center rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group py-2.5 ${
                  groupActive
                    ? 'bg-gradient-to-r from-[#D8232A] to-[#e53e3e] text-white shadow-lg shadow-red-950/40'
                    : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
                    groupActive ? 'bg-white/20 text-white' : 'bg-white/[0.04] text-neutral-400 group-hover:text-white'
                  }`}
                >
                  {group.icon}
                </span>
              </button>
            );
          })}

        {/* Expanded hierarchy - non-clickable parents that expand/collapse, children visually indented */}
        {!effectiveCollapsed &&
          allowedGroups.map((group) => {
            const groupActive = group.items.some((n) => n.key === page);
            const open = openGroups.has(group.key);
            return (
              <div key={group.key} className="mb-1">
                {/* Parent header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors cursor-pointer ${
                    groupActive ? 'text-[#f87171]' : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  aria-expanded={open}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.05] text-neutral-400">
                    {group.icon}
                  </span>
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Child items — ERP style: smaller + indented right with guide rail */}
                {open && (
                  <div className="ml-[15px] mt-1 space-y-0.5 border-l border-white/10 pl-2">
                    {group.items.map((item) => {
                      // Status shortcuts are active when the Orders page is open
                      // AND the matching status filter shortcut is selected.
                      const active =
                        page === item.key ||
                        (item.key === `orders_${activeShortcut}` && page === 'orders');
                      return (
                        <button
                          key={item.key}
                          onClick={() => navigate(item.key)}
                          className={`w-full flex items-center gap-2 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer group ${
                            active
                              ? 'bg-gradient-to-r from-[#D8232A] to-[#e53e3e] text-white shadow-md shadow-red-950/40'
                              : 'text-neutral-500 hover:bg-white/[0.06] hover:text-white'
                          } pl-1.5 pr-2 py-1.5`}
                        >
                          <span
                            className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-all duration-200 [&_svg]:w-4 [&_svg]:h-4 ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-transparent text-neutral-500 group-hover:text-white group-hover:bg-white/[0.08]'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left leading-tight">{item.label}</span>
                          {item.key === 'orders_pending' && pendingOrders > 0 && (
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center animate-pulse" title={`${pendingOrders} pending orders`}>
                              {pendingOrders}
                            </span>
                          )}
                          {item.key === 'inventory' && lowStockCount > 0 && (
                            <span className="bg-orange-400 text-orange-950 text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center" title={`${lowStockCount} low-stock products at or below threshold`}>
                              {lowStockCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>
    </>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar — sticky full height, logo always visible at the very top */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen relative bg-[#0f0f10] text-neutral-300 shrink-0 transition-all duration-200 border-r border-white/[0.04] ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-64'
        }`}
      >
        {sidebarInner(false)}

        {/* Collapse/expand — small floating button on the sidebar edge near the logo */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="group absolute -right-3 top-9 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#D8232A] to-[#b51c22] text-white ring-2 ring-[#0f0f10] shadow-lg shadow-red-950/50 hover:scale-110 hover:shadow-red-900/60 transition-all duration-200 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          ) : (
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          )}
        </button>
      </aside>

      {/* Content column — topbar + pages (only spans the area right of the sidebar) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar (always visible on all screen sizes) — left side intentionally empty */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-r from-[#0f0f10] to-[#1a1a1a] text-white px-4 h-14 border-b border-white/[0.06] shadow-lg shrink-0">
          {/* Module search */}
          <form
            className="relative flex-1 max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchResults.length > 0) navigate(searchResults[0].key);
            }}
          >
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="search"
              placeholder="Search modules…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/[0.06] border border-white/[0.08] placeholder:text-neutral-500 text-white outline-none focus:border-[#D8232A]/60 focus:bg-white/[0.09] transition-colors"
            />
            {searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-[#1a1a1a] border border-white/[0.08] overflow-hidden shadow-xl z-40">
                {searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-neutral-500">No modules found for “{searchQuery}”</p>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => navigate(r.key)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] text-[#f87171] shrink-0">
                        {r.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-white truncate">{r.label}</span>
                        <span className="block text-[10px] text-neutral-500 truncate">{r.groupLabel}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </form>

          {/* Right: POS quick button + mobile menu toggle + admin profile + sign-out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {hasPerm(admin, PERM.POS_VIEW) && (
              <button
                onClick={() => navigate('pos')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  page === 'pos'
                    ? 'bg-[#D8232A] text-white shadow-lg shadow-red-950/40'
                    : 'bg-[#D8232A]/15 text-[#fca5a5] hover:bg-[#D8232A] hover:text-white'
                }`}
                title="Open POS Register"
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden lg:inline">POS Register</span>
              </button>
            )}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D8232A] to-rose-700 text-white text-xs font-black flex items-center justify-center shrink-0">
              {(admin.name || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:block text-xs font-bold text-white truncate max-w-[100px]">
              {admin.name}
            </span>
            <span
              className={`hidden sm:inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                admin.isSuper ? 'bg-amber-400/15 text-amber-300' : 'bg-[#D8232A]/15 text-red-300'
              }`}
            >
              {admin.isSuper ? '★ ' : ''}{admin.role}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main content — scrolls below the topbar */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">{render()}</main>
      </div>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile off-canvas sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0f0f10] text-neutral-300 transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarInner(true)}
      </aside>
    </div>
  );
}