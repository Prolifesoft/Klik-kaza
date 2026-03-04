import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { Users, Copy, CheckCircle, Gift, TrendingUp } from 'lucide-react';

export function Referrals() {
  const { user } = useAuthStore();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/referrals`)
        .then(res => res.json())
        .then(data => {
          setReferrals(data);
          setLoading(false);
        });
    }
  }, [user]);

  const referralLink = `${window.location.origin}/register?ref=${user?.referral_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Yükleniyor...</div>;

  const approvedCount = referrals.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Davet Et & Kazan</h1>
        <p className="text-zinc-500 mt-1">Arkadaşlarınızı davet edin, günlük tıklama limitinizi artırın</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Gift className="w-6 h-6" />
            </div>
            <span className="font-semibold">Davet Bonusu</span>
          </div>
          <div>
            <div className="text-3xl font-bold">+5 Limit</div>
            <p className="text-emerald-100 text-sm mt-1">Her onaylı davet için</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <span className="font-semibold">Toplam Davet</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-zinc-900">{referrals.length}</div>
            <p className="text-zinc-500 text-sm mt-1">Kayıt olan kişi sayısı</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between">
          <div className="flex items-center gap-3 text-purple-600 mb-4">
            <div className="p-2 bg-purple-50 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="font-semibold">Kazanılan Ek Limit</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-zinc-900">+{approvedCount * 5}</div>
            <p className="text-zinc-500 text-sm mt-1">Günlük tıklama limitine eklendi</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100 mb-8">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Davet Linkiniz</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-mono text-sm text-zinc-600 overflow-x-auto whitespace-nowrap">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            {copied ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Kopyalandı!' : 'Kopyala'}
          </button>
        </div>
        <p className="text-sm text-zinc-500 mt-4">
          Davet kodunuz: <strong className="text-zinc-900 font-mono bg-zinc-100 px-2 py-1 rounded-md">{user?.referral_code}</strong>
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50">
          <h2 className="text-xl font-bold text-zinc-900">Davet Edilen Kişiler</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {referrals.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              Henüz kimseyi davet etmediniz. Linkinizi paylaşarak kazanmaya başlayın!
            </div>
          ) : (
            referrals.map((ref, idx) => (
              <div key={idx} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                    {ref.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{ref.username}</h3>
                    <p className="text-xs text-zinc-500">Seviye {ref.level} • {new Date(ref.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ref.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {ref.status === 'approved' ? 'Onaylandı (+5 Limit)' : 'Bekliyor'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
