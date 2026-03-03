import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { Coins, Target, Zap, TrendingUp, ArrowRight, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setUser(data);
          setLoading(false);
        });
    }
  }, []);

  if (loading || !user) return <div className="p-8 text-center text-zinc-500">Yükleniyor...</div>;

  const clickProgress = (user.today_clicks! / user.daily_click_limit) * 100;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Merhaba, {user.username}! 👋</h1>
        <p className="text-zinc-500 mt-1">Bugün kazanmaya hazır mısın?</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-emerald-600 mb-4">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <span className="font-semibold">Kullanılabilir Kredi</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{user.available_credits.toFixed(2)}</div>
          <p className="text-sm text-zinc-500 mt-1">~ ${(user.available_credits / 100).toFixed(2)} USDT</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <div className="p-2 bg-blue-50 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="font-semibold">Toplam Kazanılan</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{user.total_credits.toFixed(2)}</div>
          <p className="text-sm text-zinc-500 mt-1">Tüm zamanlar</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-purple-600 mb-4">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <span className="font-semibold">Seviye</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">Seviye {user.level}</div>
          <p className="text-sm text-zinc-500 mt-1">1.0x Çarpan</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col">
          <div className="flex items-center gap-3 text-orange-600 mb-4">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <span className="font-semibold">Günlük Kota</span>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Link to="/ads" className="group bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Reklam İzle & Kazan</h3>
            <p className="text-emerald-100 text-sm">Hemen tıkla, kredileri topla</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowRight className="w-6 h-6" />
          </div>
        </Link>

        <Link to="/campaigns" className="group bg-white border border-zinc-200 p-6 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 mb-1">Reklam Ver</h3>
            <p className="text-zinc-500 text-sm">Kendi siteni binlerce kişiye ulaştır</p>
          </div>
          <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
            <PlusCircle className="w-6 h-6" />
          </div>
        </Link>
      </div>
    </div>
  );
}
