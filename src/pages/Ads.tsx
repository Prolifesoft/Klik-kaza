import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { Play, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface Ad {
  id: number;
  title: string;
  description: string;
  target_url: string;
  credits_per_click: number;
  min_view_seconds: number;
}

export function Ads() {
  const { user, setUser } = useAuthStore();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAd, setActiveAd] = useState<Ad | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [globalCooldown, setGlobalCooldown] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const res = await fetch('/api/ads');
    const data = await res.json();
    setAds(data);
    setLoading(false);
  };

  useEffect(() => {
    let timer: any;
    if (activeAd && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeAd, countdown]);

  useEffect(() => {
    let timer: any;
    if (globalCooldown > 0) {
      timer = setInterval(() => {
        setGlobalCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [globalCooldown]);

  const startAd = async (ad: Ad) => {
    if (globalCooldown > 0) {
      setMessage({ type: 'error', text: `Lütfen ${globalCooldown} saniye bekleyin.` });
      return;
    }
    if (user!.today_clicks! >= user!.daily_click_limit) {
      setMessage({ type: 'error', text: 'Günlük limitinize ulaştınız!' });
      return;
    }
    
    try {
      await fetch(`/api/ads/${ad.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });
    } catch (e) {
      console.error('Failed to start ad session', e);
    }

    setActiveAd(ad);
    setCountdown(ad.min_view_seconds);
    setMessage(null);
    // Open ad in new tab
    window.open(ad.target_url, '_blank');
  };

  const claimReward = async () => {
    if (!activeAd || claiming) return;
    setClaiming(true);
    
    try {
      const res = await fetch(`/api/ads/${activeAd.id}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `+${data.credits_earned.toFixed(2)} Kredi kazandınız!` });
        if (data.leveledUp) {
          setLevelUpMessage(`Tebrikler! Seviye ${data.newLevel}'e yükseldiniz! Yeni çarpan ve limitleriniz aktif.`);
          setTimeout(() => setLevelUpMessage(null), 5000);
        }
        // Update user state
        fetch(`/api/users/${user?.id}`)
          .then(r => r.json())
          .then(u => setUser(u));
        // Remove ad from list
        setAds(ads.filter(a => a.id !== activeAd.id));
        setGlobalCooldown(5); // 5 seconds cooldown between ads
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setClaiming(false);
      setActiveAd(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t('nav.ads')}</h1>
          <p className="text-zinc-500 mt-1">{t('dashboard.watch_ads_desc')}</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-500">{t('dashboard.daily_quota')}:</span>
            <span className="text-sm font-bold text-zinc-900">{user?.today_clicks || 0} / {user?.daily_click_limit}</span>
          </div>
          <div className="w-px h-4 bg-zinc-200"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-500">Çarpan:</span>
            <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{user?.level_info?.multiplier.toFixed(2)}x</span>
          </div>
        </div>
      </header>

      {levelUpMessage && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 p-4 rounded-xl flex items-center gap-3 mb-6 animate-bounce">
          <span className="text-2xl">🎉</span>
          <p className="font-bold">{levelUpMessage}</p>
        </div>
      )}

      {message && (
        <div className={clsx(
          "p-4 rounded-xl text-sm font-medium border",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
        )}>
          {message.text}
        </div>
      )}

      {activeAd && (
        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl border border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 fixed bottom-20 left-4 right-4 md:static md:bottom-auto md:left-auto md:right-auto z-50">
          <h3 className="text-xl font-bold">{activeAd.title} izleniyor...</h3>
          <p className="text-zinc-400 text-sm">Lütfen sekmeyi kapatmayın.</p>
          
          {countdown > 0 ? (
            <div className="flex items-center gap-2 text-3xl font-mono font-bold text-emerald-400">
              <Clock className="w-8 h-8" />
              00:{countdown.toString().padStart(2, '0')}
            </div>
          ) : (
            <button
              onClick={claimReward}
              disabled={claiming}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              <CheckCircle className="w-6 h-6" />
              {claiming ? 'Bekleniyor...' : 'Krediyi Al'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-zinc-100">
            <p className="text-zinc-500">Şu an için izlenecek reklam bulunmuyor.</p>
          </div>
        ) : (
          ads.map(ad => (
            <div key={ad.id} className="bg-white p-5 rounded-2xl border border-zinc-200 hover:border-emerald-500 transition-colors shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-zinc-900 text-lg leading-tight">{ad.title}</h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                  +{(ad.credits_per_click * (user?.level_info?.multiplier || 1.0)).toFixed(2)} Kredi
                </span>
              </div>
              <p className="text-zinc-500 text-sm mb-6 flex-1 line-clamp-2">{ad.description}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                  <Clock className="w-4 h-4" />
                  {ad.min_view_seconds} sn
                </div>
                <button
                  onClick={() => startAd(ad)}
                  disabled={activeAd !== null || globalCooldown > 0}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {globalCooldown > 0 ? `Bekle (${globalCooldown}s)` : 'İzle'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
