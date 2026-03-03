import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { ShieldAlert, CheckCircle, XCircle, Users, PlaySquare, Wallet } from 'lucide-react';

export function Admin() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, adsRes, withRes] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/admin/ads').then(r => r.json()),
      fetch('/api/admin/withdrawals').then(r => r.json())
    ]);
    setStats(statsRes);
    setAds(adsRes);
    setWithdrawals(withRes);
    setLoading(false);
  };

  const updateAdStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/ads/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  const updateWithdrawalStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/withdrawals/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Yetkisiz Erişim</div>;
  }

  if (loading) return <div className="p-8 text-center text-zinc-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-emerald-600" />
          Admin Paneli
        </h1>
        <p className="text-zinc-500 mt-1">Platform genel bakış ve yönetim</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 font-medium">Toplam Kullanıcı</p>
            <p className="text-3xl font-bold text-zinc-900">{stats?.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <PlaySquare className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 font-medium">Toplam Reklam</p>
            <p className="text-3xl font-bold text-zinc-900">{stats?.totalAds}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 font-medium">Toplam Tıklama</p>
            <p className="text-3xl font-bold text-zinc-900">{stats?.totalClicks}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ads Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50">
            <h2 className="text-xl font-bold text-zinc-900">Reklam Onayları</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {ads.filter(a => a.status === 'pending').length === 0 ? (
              <div className="p-6 text-center text-zinc-500">Bekleyen reklam yok.</div>
            ) : (
              ads.filter(a => a.status === 'pending').map(ad => (
                <div key={ad.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-zinc-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-zinc-900">{ad.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{ad.target_url}</p>
                    <div className="flex gap-3 mt-2 text-xs font-medium text-zinc-500">
                      <span className="bg-zinc-100 px-2 py-1 rounded-md">Bütçe: {ad.total_budget}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded-md">Tık Başı: {ad.credits_per_click}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => updateAdStatus(ad.id, 'active')} className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      <CheckCircle className="w-4 h-4" /> Onayla
                    </button>
                    <button onClick={() => updateAdStatus(ad.id, 'rejected')} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      <XCircle className="w-4 h-4" /> Reddet
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Withdrawals Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50">
            <h2 className="text-xl font-bold text-zinc-900">Para Çekim Talepleri</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
              <div className="p-6 text-center text-zinc-500">Bekleyen talep yok.</div>
            ) : (
              withdrawals.filter(w => w.status === 'pending').map(w => (
                <div key={w.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-zinc-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900">{w.username}</h3>
                      <span className="text-xs text-zinc-400">({w.email})</span>
                    </div>
                    <p className="text-sm font-mono text-zinc-500 mt-1 bg-zinc-100 px-2 py-1 rounded-md inline-block">{w.tron_wallet}</p>
                    <div className="flex gap-3 mt-2 text-sm font-bold text-emerald-600">
                      <span>{w.amount_credits} Kredi</span>
                      <span>=</span>
                      <span>${w.amount_usdt} USDT</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => updateWithdrawalStatus(w.id, 'completed')} className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      <CheckCircle className="w-4 h-4" /> Ödendi
                    </button>
                    <button onClick={() => updateWithdrawalStatus(w.id, 'rejected')} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      <XCircle className="w-4 h-4" /> Reddet
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
