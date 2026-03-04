import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { PlusCircle, Link as LinkIcon, DollarSign, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Campaigns() {
  const { user, setUser } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [creditsPerClick, setCreditsPerClick] = useState(0.5);
  const [totalBudget, setTotalBudget] = useState(10);
  const [minViewSeconds, setMinViewSeconds] = useState(5);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user!.available_credits < totalBudget) {
      setMessage({ type: 'error', text: 'Yetersiz bakiye.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: user?.id,
          title,
          description,
          target_url: targetUrl,
          credits_per_click: creditsPerClick,
          total_budget: totalBudget,
          min_view_seconds: minViewSeconds,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Kampanya başarıyla oluşturuldu ve onaya gönderildi.' });
        // Update user state
        fetch(`/api/users/${user?.id}`)
          .then(r => r.json())
          .then(u => setUser(u));
        // Reset form
        setTitle('');
        setDescription('');
        setTargetUrl('');
        setCreditsPerClick(0.5);
        setTotalBudget(10);
        setMinViewSeconds(5);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t('nav.campaigns')}</h1>
        <p className="text-zinc-500 mt-1">Kendi reklamınızı verin ve binlerce kişiye ulaşın</p>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100 max-w-2xl">
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium border mb-6 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {message.text}
          </div>
        )}

        <div className="mb-8 p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 font-medium">Kullanılabilir Bakiye</p>
            <p className="text-2xl font-bold text-zinc-900">{user?.available_credits.toFixed(2)} Kredi</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kampanya Başlığı</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Örn: Yeni Web Sitemi Ziyaret Edin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none h-24"
              placeholder="Kampanyanız hakkında kısa bir açıklama..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Hedef URL</label>
            <div className="relative">
              <LinkIcon className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="https://ornek.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Tıklama Başı Kredi</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={creditsPerClick}
                onChange={(e) => setCreditsPerClick(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Toplam Bütçe (Kredi)</label>
              <input
                type="number"
                min="1"
                required
                value={totalBudget}
                onChange={(e) => setTotalBudget(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">İzleme Süresi (sn)</label>
              <div className="relative">
                <Clock className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="5"
                  max="60"
                  required
                  value={minViewSeconds}
                  onChange={(e) => setMinViewSeconds(parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Tahmini Tıklama: <strong className="text-zinc-900">{Math.floor(totalBudget / creditsPerClick)}</strong>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
              {loading ? 'Oluşturuluyor...' : 'Kampanyayı Başlat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
