import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { Coins, Target, Zap, TrendingUp, ArrowRight, PlusCircle, BarChart3, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any[]>([]);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (user) {
      Promise.all([
        fetch(`/api/users/${user.id}`).then(res => res.json()),
        fetch(`/api/users/${user.id}/earnings`).then(res => res.json())
      ]).then(([userData, earningsData]) => {
        setUser(userData);
        
        // Process earnings to fill last 7 days
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });
        
        const formattedEarnings = last7Days.map(date => {
          const found = earningsData.find((e: any) => e.date === date);
          const d = new Date(date);
          return {
            date: d.toLocaleDateString(i18n.language, { weekday: 'short' }),
            amount: found ? found.amount : 0
          };
        });
        
        setEarnings(formattedEarnings);
        setLoading(false);
      });
    }
  }, []);

  if (loading || !user) return <div className="p-8 text-center text-zinc-500">{t('common.loading')}</div>;

  const clickProgress = (user.today_clicks! / user.daily_click_limit) * 100;
  
  let levelProgress = 100;
  if (user.next_level_info && user.level_info) {
    const clicksInCurrentLevel = user.total_clicks - user.level_info.required_clicks;
    const clicksNeededForNext = user.next_level_info.required_clicks - user.level_info.required_clicks;
    levelProgress = (clicksInCurrentLevel / clicksNeededForNext) * 100;
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t('dashboard.welcome', { name: user.username })}</h1>
        <p className="text-zinc-500 mt-1">{t('dashboard.ready')}</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-emerald-600 mb-4">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <span className="font-semibold">{t('dashboard.available_credits')}</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{user.available_credits.toFixed(2)}</div>
          <p className="text-sm text-zinc-500 mt-1">~ ${(user.available_credits / 100).toFixed(2)} USDT</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <div className="p-2 bg-blue-50 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="font-semibold">{t('dashboard.total_earned')}</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{user.total_credits.toFixed(2)}</div>
          <p className="text-sm text-zinc-500 mt-1">{t('dashboard.all_time')}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 text-purple-600 mb-4 relative z-10">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Star className="w-6 h-6" />
            </div>
            <span className="font-semibold">{t('dashboard.level', { name: user.level_info?.name || 'Bronz' })}</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900 relative z-10">
            {t('dashboard.multiplier', { val: user.level_info?.multiplier.toFixed(2) })}
          </div>
          
          {user.next_level_info ? (
            <div className="mt-4 relative z-10">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{t('dashboard.clicks', { val: user.total_clicks })}</span>
                <span>{t('dashboard.next_level', { name: user.next_level_info.name, val: user.next_level_info.required_clicks })}</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5">
                <div 
                  className="bg-purple-500 h-1.5 rounded-full transition-all" 
                  style={{ width: `${Math.min(levelProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-purple-600 mt-2 font-medium relative z-10">{t('dashboard.max_level')}</p>
          )}
          
          {/* Background decoration */}
          <div className="absolute -right-6 -bottom-6 opacity-5">
            <Star className="w-32 h-32" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-orange-600 mb-4">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <span className="font-semibold">{t('dashboard.daily_quota')}</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{user.today_clicks} / {user.daily_click_limit}</div>
          <div className="w-full bg-zinc-100 rounded-full h-2 mt-3">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all" 
              style={{ width: `${Math.min(clickProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{t('dashboard.earnings_chart')}</h2>
            <p className="text-sm text-zinc-500">{t('dashboard.last_7_days')}</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earnings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                formatter={(value: number) => [`${value.toFixed(2)}`, '']}
              />
              <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Link to="/ads" className="group bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">{t('dashboard.watch_ads')}</h3>
            <p className="text-emerald-100 text-sm">{t('dashboard.watch_ads_desc')}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowRight className="w-6 h-6" />
          </div>
        </Link>

        <Link to="/campaigns" className="group bg-white border border-zinc-200 p-6 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 mb-1">{t('dashboard.create_ad')}</h3>
            <p className="text-zinc-500 text-sm">{t('dashboard.create_ad_desc')}</p>
          </div>
          <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
            <PlusCircle className="w-6 h-6" />
          </div>
        </Link>
      </div>
    </div>
  );
}
