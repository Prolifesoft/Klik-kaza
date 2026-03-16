import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { PlusCircle, Link as LinkIcon, DollarSign, Clock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Campaigns() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  
  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  
  // Step 2
  const [dailyBudget, setDailyBudget] = useState(10);
  const [days, setDays] = useState(1);
  
  // Settings
  const [settings, setSettings] = useState<any>(null);
  const minViewSeconds = 5;
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/campaign-settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  // Calculate totals
  let rawTotalBudget = dailyBudget * days;
  let totalBudget = rawTotalBudget;
  let estimatedClicks = 0;
  let creditsPerClick = 0.5;
  let discountAmount = 0;
  let bonusClicks = 0;
  let baseClicks = 0;
  let impressionMultiplier = 10;

  if (settings) {
    creditsPerClick = settings.cpc;
    if (settings.impression_multiplier) {
      impressionMultiplier = settings.impression_multiplier;
    }
    
    // Calculate duration discount
    if (days >= settings.duration_discount_step) {
      const discountMultiplier = Math.floor(days / settings.duration_discount_step);
      const discountPercent = Math.min(discountMultiplier * settings.duration_discount_rate, 50); // Max 50% discount
      discountAmount = rawTotalBudget * (discountPercent / 100);
      totalBudget = rawTotalBudget - discountAmount;
    }

    // Calculate base clicks
    baseClicks = Math.floor(totalBudget / creditsPerClick);

    // Calculate budget bonus
    if (totalBudget >= settings.budget_bonus_step) {
      const bonusMultiplier = Math.floor(totalBudget / settings.budget_bonus_step);
      const bonusPercent = Math.min(bonusMultiplier * settings.budget_bonus_rate, 100); // Max 100% bonus
      bonusClicks = Math.floor(baseClicks * (bonusPercent / 100));
    }

    estimatedClicks = baseClicks + bonusClicks;
  } else {
    estimatedClicks = Math.floor(totalBudget / creditsPerClick);
  }
  
  const effectiveCreditsPerClick = estimatedClicks > 0 ? totalBudget / estimatedClicks : creditsPerClick;

  const handleNext = () => {
    if (step === 1) {
      if (!title || !description || !targetUrl) {
        setMessage({ type: 'error', text: 'Lütfen tüm alanları doldurun.' });
        return;
      }
    }
    if (step === 2) {
      if (dailyBudget < 1) {
        setMessage({ type: 'error', text: 'Günlük bütçe en az 1 kredi olmalıdır.' });
        return;
      }
    }
    setMessage(null);
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setMessage(null);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
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
          credits_per_click: effectiveCreditsPerClick,
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
        setStep(1);
        setTitle('');
        setDescription('');
        setTargetUrl('');
        setDailyBudget(10);
        setDays(1);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 relative px-2">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-100 rounded-full -z-10"></div>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full -z-10 transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
      
      {[1, 2, 3].map((i) => (
        <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= i ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white text-zinc-400 border-2 border-zinc-100'}`}>
          {step > i ? <CheckCircle className="w-5 h-5" /> : i}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t('nav.campaigns')}</h1>
        <p className="text-zinc-500 mt-1">Kendi reklamınızı verin ve binlerce kişiye ulaşın</p>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-[12px] border-zinc-200 max-w-2xl">
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

        {renderStepIndicator()}

        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-700">Günlük Bütçe: <span className="text-emerald-600 font-bold">{dailyBudget} Kredi</span></label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(parseFloat(e.target.value) || 1)}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-2">
                  <span>1 Kredi</span>
                  <span>1000 Kredi</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-700">Kampanya Süresi: <span className="text-emerald-600 font-bold">{days} Gün</span></label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-2">
                  <span>1 Gün</span>
                  <span>60 Gün</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mt-6">
                <h4 className="text-emerald-800 font-medium mb-4">Tahmini Erişim İstatistikleri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                    <p className="text-xs text-emerald-600/70 mb-1">Toplam Bütçe</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-emerald-700">{totalBudget} Kredi</p>
                      {discountAmount > 0 && (
                        <span className="text-xs text-emerald-500 line-through">{rawTotalBudget}</span>
                      )}
                    </div>
                    {discountAmount > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">Süre indirimi uygulandı</p>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                    <p className="text-xs text-emerald-600/70 mb-1">Tahmini Tıklama</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-emerald-700">{estimatedClicks}</p>
                      {bonusClicks > 0 && (
                        <span className="text-xs text-emerald-500">+{bonusClicks} Bonus</span>
                      )}
                    </div>
                    {bonusClicks > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">Bütçe bonusu eklendi</p>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                    <p className="text-xs text-emerald-600/70 mb-1">Tahmini Gösterim</p>
                    <p className="text-xl font-bold text-emerald-700">{estimatedClicks * impressionMultiplier}</p>
                    <p className="text-xs text-emerald-600 mt-1">Görüntülenme sayısı</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                <h3 className="font-bold text-zinc-900 mb-4 border-b border-zinc-200 pb-2">Kampanya Önizlemesi</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500">Başlık</p>
                    <p className="font-medium text-zinc-900">{title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Açıklama</p>
                    <p className="text-sm text-zinc-700">{description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Hedef URL</p>
                    <a href={targetUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline break-all">{targetUrl}</a>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl p-5 text-white">
                <h3 className="font-bold mb-4 border-b border-zinc-700 pb-2">Ödeme Özeti</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Günlük Bütçe</span>
                    <span>{dailyBudget} Kredi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Süre</span>
                    <span>{days} Gün</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Tıklama Başı Maliyet (Liste)</span>
                    <span>{creditsPerClick} Kredi</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Süre İndirimi</span>
                      <span>-{discountAmount.toFixed(2)} Kredi</span>
                    </div>
                  )}
                  {bonusClicks > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Bütçe Bonusu</span>
                      <span>+{bonusClicks} Tıklama</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-zinc-700 font-bold text-lg">
                    <span>Toplam Ödenecek</span>
                    <span className="text-emerald-400">{totalBudget.toFixed(2)} Kredi</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Tahmini Tıklama</span>
                    <span>{estimatedClicks}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Tahmini Gösterim (Erişim)</span>
                    <span>{estimatedClicks * impressionMultiplier}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Efektif Tıklama Başı Maliyet</span>
                    <span>{effectiveCreditsPerClick.toFixed(4)} Kredi</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 mt-8 border-t border-zinc-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Geri
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              İleri
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  İşleniyor...
                </span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Öde ve Başlat
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
