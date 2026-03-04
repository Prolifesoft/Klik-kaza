import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { Save, Lock, Wallet, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Settings() {
  const { user, setUser } = useAuthStore();
  const [tronWallet, setTronWallet] = useState(user?.tron_wallet || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`/api/users/${user?.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tron_wallet: tronWallet,
          password: password || undefined
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Ayarlar başarıyla güncellendi.' });
        setUser(data.user);
        setPassword('');
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t('nav.settings')}</h1>
        <p className="text-zinc-500 mt-1">Hesap bilgilerinizi ve ödeme tercihlerinizi yönetin</p>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium border mb-6 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-2xl">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{user?.username}</h2>
            <p className="text-zinc-500">{user?.email}</p>
            <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
              Seviye {user?.level}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">TRC-20 Cüzdan Adresi</label>
            <p className="text-xs text-zinc-500 mb-2">Para çekim işlemleriniz bu adrese yapılacaktır.</p>
            <div className="relative">
              <Wallet className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tronWallet}
                onChange={(e) => setTronWallet(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                placeholder="T..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Yeni Şifre (İsteğe Bağlı)</label>
            <p className="text-xs text-zinc-500 mb-2">Şifrenizi değiştirmek istemiyorsanız boş bırakın.</p>
            <div className="relative">
              <Lock className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </form>
      </div>
    </div>
  );
}
