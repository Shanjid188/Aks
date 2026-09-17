import { useEffect, useMemo, useState } from 'react';
import type { AdminUser } from './api';
import aksLogo from './assets/AKS.logo.jpg';
import { getStoredAdmin, setStoredAdmin, setToken } from './api';
import { hasPerm, PERM } from './lib/permissions';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ProductsPage } from './pages/Products';
import { OrdersPage } from './pages/Orders';
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
  Activity, BarChart3, Boxes, Calculator, ChevronLeft, ChevronRight,
  FileText, Image, LayoutDashboard, LogOut, Menu, Package,
  PackageCheck, Receipt, RotateCcw, Settings, ShieldCheck, ShoppingBag,
  ShoppingCart, Sparkles, Star, Ticket, Truck, UserCog, Users, X,
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
  | 'settings';

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
];

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

  // Permission-aware navigation — hidden modules never render.
  const allowedNav = useMemo(
    () => (admin ? NAV.filter((item) => hasPerm(admin, item.permission)) : []),
    [admin]
  );

  useEffect(() => {
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('aks-admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('aks-admin-unauthorized', onUnauthorized);
  }, []);

  // Cross-page navigation (Dashboard → Orders etc.) + live pending-order badge.
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (NAV.some((n) => n.key === target)) setPage(target as PageKey);
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
    setPage(key);
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  };

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
        return <OrdersPage />;
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

  const sidebarInner = (inDrawer: boolean) => (
    <>
      {/* Brand */}
      <div className="p-4 flex items-center gap-3 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent">
        <div className="relative shrink-0">
          <img src={aksLogo} alt="AKS Mart" className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#D8232A]/30" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f0f10]" />
        </div>
        {!collapsed && (
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

      {/* Collapse toggle — desktop only */}
      {!inDrawer && (
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center justify-center mx-3 mt-3 mb-1 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {/* Navigation — only modules this admin can access */}
      <nav className={`p-3 space-y-1 flex-1 overflow-y-auto scrollbar-thin ${collapsed ? 'px-2' : ''}`}>
        {allowedNav.length === 0 && (
          <p className="text-[11px] text-neutral-500 px-3 py-4 leading-relaxed">
            No modules assigned to your role. Contact a Super Admin.
          </p>
        )}
        {allowedNav.map((item) => {
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${
                active
                  ? 'bg-gradient-to-r from-[#D8232A] to-[#e53e3e] text-white shadow-lg shadow-red-950/40 shadow-[0_4px_14px_rgba(216,35,42,0.3)]'
                  : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-white/[0.04] text-neutral-400 group-hover:text-white group-hover:bg-white/[0.08]'
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left leading-tight">{item.label}</span>
                  {item.key === 'orders' && pendingOrders > 0 && (
                    <span
                      className="bg-amber-400 text-amber-950 text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center"
                      title={`${pendingOrders} pending orders`}
                    >
                      {pendingOrders}
                    </span>
                  )}
                  {item.key === 'inventory' && lowStockCount > 0 && (
                    <span
                      className="bg-orange-400 text-orange-950 text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center"
                      title={`${lowStockCount} low-stock products at or below threshold`}
                    >
                      {lowStockCount}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar (always visible on all screen sizes) — left side intentionally empty */}
      <header className="sticky top-0 z-30 flex items-center justify-end bg-gradient-to-r from-[#0f0f10] to-[#1a1a1a] text-white px-4 h-14 border-b border-white/[0.06] shadow-lg shrink-0">
        {/* Right: mobile menu toggle + admin profile + sign-out */}
        <div className="flex items-center gap-2 sm:gap-3">
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

      <div className="flex flex-1 overflow-hidden">
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

        {/* Desktop sidebar — navigation only (collaps below topbar) */}
        <aside
          className={`hidden lg:flex lg:sticky lg:top-14 lg:flex-col lg:h-[calc(100vh-3.5rem)] bg-[#0f0f10] text-neutral-300 shrink-0 transition-all duration-200 border-r border-white/[0.04] ${
            collapsed ? 'lg:w-[76px]' : 'lg:w-64'
          }`}
        >
          {sidebarInner(false)}
        </aside>

        {/* Main content — scrolls below the topbar */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">{render()}</main>
      </div>
    </div>
  );
}