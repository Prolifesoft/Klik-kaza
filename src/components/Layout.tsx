import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Home, PlaySquare, PlusCircle, Wallet, Settings, LogOut, ShieldAlert, Users, ShieldCheck, Globe, Bell, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

export function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/notifications`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch notifications');
          return res.json();
        })
        .then(data => {
          const unread = data.filter((n: any) => !n.is_read).length;
          setUnreadCount(unread);
        })
        .catch(console.error);
    }
  }, [user, location.pathname]); // Refresh when route changes

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: Home },
    { name: t('nav.ads'), path: '/ads', icon: PlaySquare },
    { name: t('nav.campaigns'), path: '/campaigns', icon: PlusCircle },
    { name: t('nav.withdraw'), path: '/withdraw', icon: Wallet },
    { name: 'İşlem Geçmişi', path: '/transactions', icon: FileText },
    { name: t('nav.referrals'), path: '/referrals', icon: Users },
    { name: 'Bildirimler', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: t('nav.settings'), path: '/settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: t('nav.admin'), path: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-zinc-200 p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Klik & Kazan</span>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={twMerge(
                  clsx(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  )
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={clsx('w-5 h-5', isActive ? 'text-emerald-600' : 'text-zinc-400')} />
                  {item.name}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-zinc-200">
          <div className="px-3 py-2 mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-400" />
            <select 
              value={i18n.language} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-transparent text-sm font-medium text-zinc-600 outline-none cursor-pointer hover:text-zinc-900 transition-colors"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="ru">Русский</option>
            </select>
          </div>

          <div className="px-3 py-2 flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{user?.username}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around p-2 pb-safe z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={twMerge(
                clsx(
                  'flex flex-col items-center gap-1 p-2 rounded-lg min-w-[64px] relative',
                  isActive ? 'text-emerald-600' : 'text-zinc-500'
                )
              )}
            >
              <Icon className="w-6 h-6" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {item.badge}
                </span>
              )}
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
