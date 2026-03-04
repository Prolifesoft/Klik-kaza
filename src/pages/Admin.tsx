import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { ShieldAlert, CheckCircle, XCircle, Users, PlaySquare, Wallet, Trash2, Plus, Minus, ShieldCheck, Bell } from 'lucide-react';

export function Admin() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notification state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    user_id: 'all',
    title: '',
    message: '',
    type: 'info'
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  // Iframe Task state
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [iframeData, setIframeData] = useState({
    title: '',
    description: '',
    iframe_code: '',
    credits_per_click: 1,
    total_budget: 1000,
    min_view_seconds: 10
  });
  const [addingIframe, setAddingIframe] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, adsRes, withRes, usersRes, kycRes] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/admin/ads').then(r => r.json()),
      fetch('/api/admin/withdrawals').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/kyc').then(r => r.json())
    ]);
    setStats(statsRes);
    setAds(adsRes);
    setWithdrawals(withRes);
    setUsers(usersRes);
    setKycDocs(kycRes);
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

  const deleteAd = async (id: number) => {
    if (!confirm('Bu reklamı silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/admin/ads/${id}`, {
      method: 'DELETE'
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

  const updateUserCredits = async (id: number, amount: number, type: 'add' | 'subtract') => {
    const amountStr = prompt(`Kullanıcıya eklenecek/çıkarılacak kredi miktarını girin (${type === 'add' ? 'Ekle' : 'Çıkar'}):`);
    if (!amountStr) return;
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) return;

    await fetch(`/api/admin/users/${id}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: val, type })
    });
    fetchData();
  };

  const updateKycStatus = async (id: number, status: string) => {
    let reason = '';
    if (status === 'rejected') {
      const input = prompt('Reddetme sebebini girin (Kullanıcıya gösterilecek):');
      if (input === null) return;
      reason = input;
    }

    await fetch(`/api/admin/kyc/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejection_reason: reason })
    });
    fetchData();
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingNotification(true);
    
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      
      if (res.ok) {
        alert('Bildirim başarıyla gönderildi!');
        setShowNotificationModal(false);
        setNotificationData({ user_id: 'all', title: '', message: '', type: 'info' });
      } else {
        const data = await res.json();
        alert(`Hata: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to send notification', error);
      alert('Bildirim gönderilirken bir hata oluştu.');
    } finally {
      setSendingNotification(false);
    }
  };

  const addIframeTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingIframe(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: user?.id,
          type: 'iframe',
          ...iframeData
        })
      });
      if (res.ok) {
        alert('İframe görevi başarıyla eklendi!');
        setShowIframeModal(false);
        setIframeData({ title: '', description: '', iframe_code: '', credits_per_click: 1, total_budget: 1000, min_view_seconds: 10 });
        fetchData();
      } else {
        const data = await res.json();
        alert(`Hata: ${data.message}`);
      }
    } catch (error) {
      alert('Görev eklenirken bir hata oluştu.');
    } finally {
      setAddingIframe(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Yetkisiz Erişim</div>;
  }

  if (loading) return <div className="p-8 text-center text-zinc-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-emerald-600" />
            Admin Paneli
          </h1>
          <p className="text-zinc-500 mt-1">Platform genel bakış ve yönetim</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIframeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            İframe Görevi Ekle
          </button>
          <button
            onClick={() => setShowNotificationModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
          >
            <Bell className="w-5 h-5" />
            Bildirim Gönder
          </button>
        </div>
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
        {/* Users Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50">
            <h2 className="text-xl font-bold text-zinc-900">Kullanıcı Yönetimi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-100">
                <tr>
                  <th className="p-4 font-medium">Kullanıcı</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Rol</th>
                  <th className="p-4 font-medium">Bakiye</th>
                  <th className="p-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50/50">
                    <td className="p-4 font-medium text-zinc-900">{u.username}</td>
                    <td className="p-4 text-zinc-500">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-zinc-100 text-zinc-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-600">{u.available_credits.toFixed(2)}</td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button onClick={() => updateUserCredits(u.id, 0, 'add')} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200" title="Kredi Ekle">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateUserCredits(u.id, 0, 'subtract')} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" title="Kredi Çıkar">
                        <Minus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ads Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900">Reklam ve Görev Yönetimi</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {ads.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">Reklam yok.</div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-zinc-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-zinc-900">{ad.title}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        ad.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        ad.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ad.status === 'active' ? 'Aktif' : ad.status === 'pending' ? 'Bekliyor' : ad.status === 'rejected' ? 'Reddedildi' : 'Tamamlandı'}
                      </span>
                      {ad.type === 'iframe' && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-700">İframe Görevi</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mb-1">{ad.description}</p>
                    {ad.type === 'iframe' ? (
                      <p className="text-sm text-zinc-500 mt-1 font-mono text-xs bg-zinc-100 p-1 rounded truncate max-w-md">{ad.iframe_code}</p>
                    ) : (
                      <p className="text-sm text-zinc-500 mt-1">{ad.target_url}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs font-medium text-zinc-500">
                      <span className="bg-zinc-100 px-2 py-1 rounded-md">Bütçe: {ad.spent_budget}/{ad.total_budget}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded-md">Tık Başı: {ad.credits_per_click}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded-md">Tıklama: {ad.total_clicks}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {ad.status === 'pending' && (
                      <>
                        <button onClick={() => updateAdStatus(ad.id, 'active')} className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <CheckCircle className="w-4 h-4" /> Onayla
                        </button>
                        <button onClick={() => updateAdStatus(ad.id, 'rejected')} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <XCircle className="w-4 h-4" /> Reddet
                        </button>
                      </>
                    )}
                    {ad.status === 'active' && (
                      <button onClick={() => updateAdStatus(ad.id, 'paused')} className="flex-1 sm:flex-none bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        Durdur
                      </button>
                    )}
                    {(ad.status === 'paused' || ad.status === 'rejected') && (
                      <button onClick={() => updateAdStatus(ad.id, 'active')} className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        Aktifleştir
                      </button>
                    )}
                    <button onClick={() => deleteAd(ad.id)} className="flex-1 sm:flex-none bg-zinc-100 hover:bg-red-100 text-zinc-600 hover:text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      <Trash2 className="w-4 h-4" /> Sil
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KYC Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-zinc-900">KYC Onayları</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {kycDocs.filter(k => k.status === 'pending').length === 0 ? (
              <div className="p-6 text-center text-zinc-500">Bekleyen KYC başvurusu yok.</div>
            ) : (
              kycDocs.filter(k => k.status === 'pending').map(doc => (
                <div key={doc.id} className="p-6 flex flex-col gap-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-zinc-900 text-lg">{doc.username}</h3>
                      <p className="text-sm text-zinc-500">{doc.email}</p>
                      <span className="inline-block mt-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                        {doc.document_type}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateKycStatus(doc.id, 'approved')} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <CheckCircle className="w-4 h-4" /> Onayla
                      </button>
                      <button onClick={() => updateKycStatus(doc.id, 'rejected')} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <XCircle className="w-4 h-4" /> Reddet
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="border border-zinc-200 rounded-xl p-2 bg-white">
                      <p className="text-xs font-bold text-zinc-500 mb-2 text-center">Ön Yüz</p>
                      <img src={doc.front_image} alt="Ön Yüz" className="w-full h-32 object-contain rounded-lg" />
                    </div>
                    <div className="border border-zinc-200 rounded-xl p-2 bg-white">
                      <p className="text-xs font-bold text-zinc-500 mb-2 text-center">Arka Yüz</p>
                      <img src={doc.back_image} alt="Arka Yüz" className="w-full h-32 object-contain rounded-lg" />
                    </div>
                    <div className="border border-zinc-200 rounded-xl p-2 bg-white">
                      <p className="text-xs font-bold text-zinc-500 mb-2 text-center">Selfie</p>
                      <img src={doc.selfie_image} alt="Selfie" className="w-full h-32 object-contain rounded-lg" />
                    </div>
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
      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Bildirim Gönder
              </h3>
              <button 
                onClick={() => setShowNotificationModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={sendNotification} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Alıcı</label>
                <select
                  value={notificationData.user_id}
                  onChange={(e) => setNotificationData({...notificationData, user_id: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">Tüm Kullanıcılar</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Bildirim Türü</label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData({...notificationData, type: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="info">Bilgi (Mavi)</option>
                  <option value="success">Başarılı (Yeşil)</option>
                  <option value="error">Hata/Uyarı (Kırmızı)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Başlık</label>
                <input
                  type="text"
                  required
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Örn: Sistem Bakımı"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Mesaj</label>
                <textarea
                  required
                  rows={4}
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  placeholder="Bildirim içeriği..."
                ></textarea>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingNotification ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Iframe Task Modal */}
      {showIframeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                İframe Görevi Ekle
              </h3>
              <button 
                onClick={() => setShowIframeModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={addIframeTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Görev Başlığı</label>
                <input
                  type="text"
                  required
                  value={iframeData.title}
                  onChange={(e) => setIframeData({...iframeData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Örn: Sponsorlu Görev"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  required
                  value={iframeData.description}
                  onChange={(e) => setIframeData({...iframeData, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Kullanıcıya gösterilecek açıklama"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">İframe Kodu</label>
                <textarea
                  required
                  rows={3}
                  value={iframeData.iframe_code}
                  onChange={(e) => setIframeData({...iframeData, iframe_code: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-mono text-sm"
                  placeholder='<iframe src="..."></iframe>'
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tık Başı Kredi</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={iframeData.credits_per_click}
                    onChange={(e) => setIframeData({...iframeData, credits_per_click: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Toplam Bütçe</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={iframeData.total_budget}
                    onChange={(e) => setIframeData({...iframeData, total_budget: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Bekleme Süresi (Saniye)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={iframeData.min_view_seconds}
                  onChange={(e) => setIframeData({...iframeData, min_view_seconds: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIframeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addingIframe}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {addingIframe ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
