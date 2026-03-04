import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { ShieldCheck, Upload, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

export function Kyc() {
  const { user, setUser } = useAuthStore();
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [form, setForm] = useState({
    document_type: 'TC Kimlik',
    front_image: '',
    back_image: '',
    selfie_image: ''
  });

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/kyc`)
        .then(res => res.json())
        .then(data => {
          setKycData(data);
          setLoading(false);
        });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.front_image || !form.back_image || !form.selfie_image) {
      setMessage({ type: 'error', text: 'Lütfen tüm görselleri yükleyin.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user?.id}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setKycData({ ...form, status: 'pending' });
        setMessage({ type: 'success', text: 'KYC belgeleriniz başarıyla gönderildi.' });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Yükleniyor...</div>;

  const status = user?.kyc_status || 'unverified';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
          Kimlik Doğrulama (KYC)
        </h1>
        <p className="text-zinc-500 mt-1">Para çekim işlemleri için kimliğinizi doğrulamanız gerekmektedir.</p>
      </header>

      {status === 'approved' && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-emerald-600 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Kimliğiniz Doğrulandı</h2>
            <p className="text-emerald-700 text-sm mt-1">Tebrikler, hesabınız tamamen onaylı. Para çekim işlemlerini sorunsuz gerçekleştirebilirsiniz.</p>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl flex items-center gap-4">
          <Clock className="w-10 h-10 text-orange-600 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-orange-900">İnceleme Bekleniyor</h2>
            <p className="text-orange-700 text-sm mt-1">Belgeleriniz alındı ve ekibimiz tarafından inceleniyor. Bu işlem genellikle 24 saat sürer.</p>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-start gap-4 mb-6">
          <XCircle className="w-10 h-10 text-red-600 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-red-900">Başvurunuz Reddedildi</h2>
            <p className="text-red-700 text-sm mt-1">Maalesef belgeleriniz onaylanmadı. Lütfen aşağıdaki nedene göre belgelerinizi tekrar yükleyin.</p>
            {kycData?.rejection_reason && (
              <div className="mt-3 p-3 bg-white/50 rounded-lg text-sm text-red-800 font-medium border border-red-100">
                Sebep: {kycData.rejection_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {(status === 'unverified' || status === 'rejected') && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium border mb-6 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Belge Türü</label>
              <select
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="TC Kimlik">TC Kimlik Kartı</option>
                <option value="Pasaport">Pasaport</option>
                <option value="Ehliyet">Sürücü Belgesi</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Kimlik Ön Yüzü</label>
                <div className="relative border-2 border-dashed border-zinc-300 rounded-xl p-4 text-center hover:bg-zinc-50 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front_image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {form.front_image ? (
                    <img src={form.front_image} alt="Ön Yüz" className="h-32 mx-auto object-contain" />
                  ) : (
                    <div className="py-6">
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <span className="text-sm text-zinc-500">Görsel Seçin</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Kimlik Arka Yüzü</label>
                <div className="relative border-2 border-dashed border-zinc-300 rounded-xl p-4 text-center hover:bg-zinc-50 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back_image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {form.back_image ? (
                    <img src={form.back_image} alt="Arka Yüz" className="h-32 mx-auto object-contain" />
                  ) : (
                    <div className="py-6">
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <span className="text-sm text-zinc-500">Görsel Seçin</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-2">Selfie (Kimliğinizle Birlikte)</label>
                <div className="relative border-2 border-dashed border-zinc-300 rounded-xl p-4 text-center hover:bg-zinc-50 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie_image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {form.selfie_image ? (
                    <img src={form.selfie_image} alt="Selfie" className="h-48 mx-auto object-contain" />
                  ) : (
                    <div className="py-8">
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <span className="text-sm text-zinc-500">Yüzünüzün ve kimliğinizin net göründüğü bir fotoğraf yükleyin</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Yüklediğiniz belgeler sadece kimlik doğrulama amacıyla kullanılacak olup, güvenli bir şekilde şifrelenerek saklanmaktadır.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? 'Gönderiliyor...' : 'Belgeleri Gönder'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
