// src/components/Layout.tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Car, Users, MapPin, CreditCard, Tag,
  HeadphonesIcon, Settings, LogOut, Menu, X, Bell, ChevronRight,
  Zap
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/bookings',   icon: Car,             label: 'Bookings' },
  { to: '/drivers',    icon: Zap,             label: 'Drivers' },
  { to: '/passengers', icon: Users,           label: 'Passengers' },
  { to: '/pricing',    icon: MapPin,          label: 'Pricing & Zones' },
  { to: '/payments',   icon: CreditCard,      label: 'Payments' },
  { to: '/promotions', icon: Tag,             label: 'Promotions' },
  { to: '/support',    icon: HeadphonesIcon,  label: 'Support' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      navigate('/login');
      toast.success('Logged out');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0`}
        style={{ background: 'var(--sidebar-bg)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Car size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in">
              <div className="text-white font-bold text-sm leading-tight">TaxiFlow</div>
              <div className="text-slate-400 text-xs">Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group
                ${isActive
                  ? 'bg-amber-500/10 text-amber-400 font-medium'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}`
              }>
              <Icon size={17} className="flex-shrink-0" />
              {sidebarOpen && <span className="animate-slide-in truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-2 py-3 border-t border-white/5">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium truncate">{user?.firstName} {user?.lastName}</div>
                <div className="text-slate-500 text-xs truncate">{user?.role?.replace('_', ' ')}</div>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center py-2 text-slate-500 hover:text-red-400 transition-colors">
              <LogOut size={17} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
