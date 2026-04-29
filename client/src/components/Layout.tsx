import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, RefreshCw, Tags, BarChart2, Wallet, Building2, Package, ShoppingCart, TrendingUp, BookOpen, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: List },
  { to: '/recurring', label: 'Recurring', icon: RefreshCw },
  { to: '/merchants', label: 'Merchants', icon: Building2 },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
];

const inventoryNav = [
  { to: '/products', label: 'Product Catalog', icon: BookOpen },
  { to: '/skus', label: 'SKU / Products', icon: Package },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/sell-orders', label: 'Sell Orders', icon: TrendingUp },
];

export function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0].toUpperCase() ?? '?';

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Expense</p>
            <p className="text-xs text-gray-400">Manager</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Inventory</p>
          </div>

          {inventoryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName ?? 'User'}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.displayName ?? 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
