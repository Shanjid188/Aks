import { useEffect, useState } from 'react';
import type { AdminUser } from './api';
import aksLogo from './assets/AKS.logo.jpg';
import { getStoredAdmin, setStoredAdmin, setToken } from './api';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ProductsPage } from './pages/Products';
import { OrdersPage } from './pages/Orders';
import { CouponsPage } from './pages/Coupons';
import { StoresPage } from './pages/Stores';
import { ReviewsPage } from './pages/Reviews';
import { HeroSlidesPage } from './pages/HeroSlides';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Store,
  MessageSquare,
  Images,
  LogOut,
} from 'lucide-react';

type PageKey = 'dashboard' | 'products' | 'orders' | 'coupons' | 'stores' | 'reviews' | 'slides';

const NAV: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'coupons', label: 'Coupons', icon: <Tag className="w-4 h-4" /> },
  { key: 'slides', label: 'Hero Slides', icon: <Images className="w-4 h-4" /> },
    { key: 'stores', label: 'Stores', icon: <Store className="w-4 h-4" /> },
  { key: 'reviews', label: 'Reviews', icon: <MessageSquare className="w-4 h-4" /> },
];

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(() => getStoredAdmin());
  const [page, setPage] = useState<PageKey>('dashboard');

  useEffect(() => {
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('aks-admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('aks-admin-unauthorized', onUnauthorized);
  }, []);

  if (!admin) {
    return <LoginPage onSuccess={(a) => setAdmin(a)} />;
  }

  const logout = () => {
    setToken(null);
    setStoredAdmin(null);
    setAdmin(null);
  };

  const render = () => {
    switch (page) {
      case 'products':
        return <ProductsPage />;
      case 'orders':
        return <OrdersPage />;
      case 'coupons':
        return <CouponsPage />;
      case 'slides':
        return <HeroSlidesPage />;
      case 'stores':
        return <StoresPage />;
      case 'reviews':
        return <ReviewsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="bg-neutral-900 text-neutral-300 lg:min-h-screen lg:w-56 shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-neutral-800">
          <img src={aksLogo} alt="AKS Mart" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          <div>
            <p className="text-sm font-black text-white leading-tight">AKS Admin</p>
            <p className="text-[10px] text-neutral-400">AKS Mart Management</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                page === item.key
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-neutral-800 mt-auto">
          <div className="px-3 pb-3">
            <p className="text-xs font-bold text-white truncate">{admin.name}</p>
            <p className="text-[10px] text-neutral-400 truncate">{admin.email}</p>
            <span className="inline-block mt-1 text-[9px] font-bold uppercase bg-white/10 px-1.5 py-0.5 rounded">
              {admin.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-neutral-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{render()}</main>
    </div>
  );
}