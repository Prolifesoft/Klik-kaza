import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { Wallet, ArrowRight, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Withdraw() {
  const { user, setUser } = useAuthStore();
  const [amountCredits, setAmountCredits] = useState(100);
  const [tronWallet, setTronWallet] = useState(user?.tron_wallet || '');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Email verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    setIsSendingCode(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user?.id}/send-verification`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setMessage({ type: 'success', text: 'Doğrulama kodu e-posta adresinize gönderildi.' });
        // For testing purposes, we alert the code. In production, this would be sent via email.
        if (data.code) {
          alert(`TEST MODU: Doğrulama Kodunuz: ${data.code}`);
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Kod gönderilemedi.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;
    
    setIsVerifying(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user?.id}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'E-posta adresiniz başarıyla doğrulandı.' });
        setUser(data.user);
      } else {
        setMessage({ type: 'error', text: data.message || 'Geçersiz kod.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user!.available_credits < amountCredits) {
      setMessage({ type: 'error', text: 'Yetersiz bakiye.' });
      return;
    }
    if (amountCredits < 100) {
      setMessage({ type: 'error', text: 'Minimum çekim tutarı 100 Kredi (1 USDT).' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          amount_credits: amountCredits,
          tron_wallet: tronWallet,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Para çekme talebiniz başarıyla oluşturuldu.' });
        // Update user state
        fetch(`/api/users/${user?.id}`)
          .then(r => r.json())
          .then(u => setUser(u));
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user?.email_verified && !user?.is_verified) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">E-posta Onayı Gerekiyor</h2>
        <p className="text-zinc-500 mb-8">
          Para çekme işlemi yapabilmek için öncelikle e-posta adresinizi doğrulamanız gerekmektedir.
        </p>
        
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium border mb-6 text-left ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {message.text}
          </div>
        )}

        {!codeSent ? (
          <button 
            onClick={handleSendCode}
            disabled={isSendingCode}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {isSendingCode ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'} <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <form onSubmit={handleVerifyCode} className="max-w-sm mx-auto space-y-4">
            <div>
              <input
                type="text"
                placeholder="6 Haneli Kod"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                required
              />
            </div>
            <button 
              type="submit"
              disabled={isVerifying || verificationCode.length < 6}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {isVerifying ? 'Doğrulanıyor...' : 'Doğrula'} <CheckCircle2 className="w-5 h-5" />
            </button>
            <button 
              type="button"
              onClick={handleSendCode}
              disabled={isSendingCode}
              className="text-sm text-emerald-600 hover:underline mt-4 block w-full"
            >
              Kodu tekrar gönder
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Para Çek</h1>
        <p className="text-zinc-500 mt-1">Kazançlarınızı TRC-20 ağı üzerinden USDT olarak çekin</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium border mb-6 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {message.text}
            </div>
          )}

          <div className="mb-8 p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 font-medium">Kullanılabilir Bakiye</span>
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-4xl font-bold mb-2">{user?.available_credits.toFixed(2)} <span className="text-lg text-zinc-400 font-normal">Kredi</span></div>
            <div className="text-emerald-400 font-medium">~ ${(user!.available_credits / 100).toFixed(2)} USDT</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Çekilecek Tutar (Kredi)</label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="1"
                  required
                  value={amountCredits}
                  onChange={(e) => setAmountCredits(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-semibold"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">
                  = ${(amountCredits / 100).toFixed(2)} USDT
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Minimum çekim tutarı 100 Kredi (1 USDT)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">TRC-20 Cüzdan Adresi</label>
              <input
                type="text"
                required
                value={tronWallet}
                onChange={(e) => setTronWallet(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                placeholder="T..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 mt-4"
            >
              {loading ? 'İşleniyor...' : 'Çekim Talebi Oluştur'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-200 h-fit">
          <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-emerald-600" />
            Önemli Bilgiler
          </h3>
          <ul className="space-y-4 text-sm text-zinc-600">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p>Çekim talepleri yönetici onayından geçtikten sonra işleme alınır. Bu işlem genellikle 24-48 saat sürebilir.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p>Lütfen cüzdan adresinizin <strong>TRC-20</strong> ağına ait olduğundan emin olun. Yanlış ağa veya adrese yapılan transferler geri alınamaz.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p>Dönüşüm kuru sabittir: <strong>100 Kredi = 1 USDT</strong></p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p>Platform, çekim işlemlerinden herhangi bir komisyon almamaktadır. Ağ ücretleri tarafımızca karşılanır.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
