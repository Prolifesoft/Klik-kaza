import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { Play, CheckCircle, Clock, ExternalLink, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface Ad {
  id: number;
  title: string;
  description: string;
  target_url: string;
  iframe_code?: string;
  type?: string;
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
      const m = Math.floor(globalCooldown / 60);
      const s = globalCooldown % 60;
      const timeStr = m > 0 ? `${m} dk ${s} sn` : `${s} sn`;
      setMessage({ type: 'error', text: `${timeStr} sonra tekrar gel` });
      return;
    }
    if (user!.today_clicks! >= user!.daily_click_limit) {
      setMessage({ type: 'error', text: 'Günlük limitinize ulaştınız!' });
      return;
    }
    
    try {
      const res = await fetch(`/api/ads/${ad.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });
      const data = await res.json();
      
      if (!data.success) {
        if (data.remainingSeconds) {
          setGlobalCooldown(data.remainingSeconds);
        }
        setMessage({ type: 'error', text: data.message });
        return;
      }
    } catch (e) {
      console.error('Failed to start ad session', e);
      return;
    }

    setActiveAd(ad);
    setCountdown(ad.min_view_seconds || 10);
    setMessage(null);
    // Open ad in new tab if it's a URL
    if (ad.type !== 'iframe' && ad.target_url) {
      window.open(ad.target_url, '_blank');
    }
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
        const cooldownMinutes = user?.level_info?.ad_cooldown_minutes || 20;
        setGlobalCooldown(cooldownMinutes * 60);
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
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
          <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white">{activeAd.title}</h3>
                <p className="text-zinc-400 text-sm mt-1 line-clamp-1">{activeAd.description}</p>
              </div>
              <div className="flex flex-col items-end shrink-0 ml-4 gap-2">
                <button 
                  onClick={() => setActiveAd(null)}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
                {countdown > 0 ? (
                  <div className="flex items-center gap-2 text-xl md:text-2xl font-mono font-bold text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl">
                    <Clock className="w-5 h-5 md:w-6 md:h-6" />
                    00:{countdown.toString().padStart(2, '0')}
                  </div>
                ) : (
                  <button
                    onClick={claimReward}
                    disabled={claiming}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {claiming ? 'Bekleniyor...' : 'Krediyi Al'}
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-black relative flex items-center justify-center p-4">
              {activeAd.type === 'iframe' && activeAd.iframe_code ? (
                <div 
                  className="w-full h-full max-h-[70vh] rounded-xl overflow-hidden flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:max-w-4xl [&>iframe]:aspect-video [&>iframe]:rounded-xl [&>iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: activeAd.iframe_code }} 
                />
              ) : (
                <div className="text-center max-w-md">
                  <ExternalLink className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">Yeni Sekmede Açıldı</h4>
                  <p className="text-zinc-400 mb-6">Reklam yeni bir sekmede açıldı. Lütfen sürenin dolmasını bekleyin ve ardından kredinizi alın.</p>
                  {activeAd.target_url && (
                    <a 
                      href={activeAd.target_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium bg-emerald-400/10 px-4 py-2 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Tekrar Aç
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
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
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg leading-tight flex items-center gap-2">
                    {ad.title}
                    {ad.type === 'iframe' ? (
                      <span className="bg-purple-100 text-purple-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Site İçi</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Dış Bağlantı</span>
                    )}
                  </h3>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg shrink-0 ml-2">
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
