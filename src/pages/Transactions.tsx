import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { ArrowDownRight, ArrowUpRight, Clock, Search } from 'lucide-react';

export function Transactions() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/transactions`)
        .then(res => res.json())
        .then(data => {
          setTransactions(data);
          setLoading(false);
        });
    }
  }, [user]);

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionIcon = (amount: number) => {
    if (amount > 0) {
      return <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><ArrowUpRight className="w-5 h-5" /></div>;
    }
    return <div className="p-2 bg-red-100 rounded-xl text-red-600"><ArrowDownRight className="w-5 h-5" /></div>;
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      earn_click: 'Reklam Kazancı',
      spend_ad: 'Reklam Harcaması',
      spend_withdraw: 'Para Çekme',
      refund_withdraw: 'Çekim İadesi',
      admin_add: 'Yönetici Eklemesi',
      admin_subtract: 'Yönetici Kesintisi'
    };
    return labels[type] || type;
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">İşlem Geçmişi</h1>
        <p className="text-zinc-500 mt-1">Hesabınızdaki tüm kredi hareketlerini inceleyin</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="İşlemlerde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              İşlem bulunamadı.
            </div>
          ) : (
            filteredTransactions.map((t, idx) => (
              <div key={idx} className="p-4 sm:p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  {getTransactionIcon(t.amount)}
                  <div>
                    <h3 className="font-bold text-zinc-900">{getTransactionLabel(t.type)}</h3>
                    <p className="text-sm text-zinc-500">{t.description}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(t.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                  </span>
                  <p className="text-xs text-zinc-500">Kredi</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
