"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Shield, History, EyeOff } from "lucide-react";
import { motion } from "motion/react";

export default function KVKKSettingsPage() {
  const [aydinlatmaMetni, setAydinlatmaMetni] = useState(
    `6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu olarak şirketimiz tarafından aşağıda açıklanan kapsamda işlenebilecektir.

1. Kişisel Verilerinizin İşlenme Amacı:
Kişisel verileriniz; gayrimenkul alım-satım ve kiralama hizmetlerinin yürütülmesi, müşteri ilişkilerinin yönetilmesi, yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.

2. İşlenen Kişisel Veri Kategorileri:
- Kimlik bilgileri (ad, soyad, TC kimlik numarası)
- İletişim bilgileri (telefon, e-posta, adres)
- Gayrimenkul tercihleri ve talepleri

3. Kişisel Verilerinizin Aktarılması:
Kişisel verileriniz, yasal zorunluluklar ve hizmet gereklilikleri kapsamında ilgili kamu kurum ve kuruluşlarına aktarılabilir.

4. Veri Saklama Süresi:
Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca saklanacaktır.

5. Haklarınız:
KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme, silinmesini veya yok edilmesini isteme haklarına sahipsiniz.`
  );

  const [retentionDays, setRetentionDays] = useState(730);

  const complianceItems = [
    { label: "Veri Şifreleme", value: "AES-256-GCM", icon: Lock },
    { label: "Erişim Kontrolü", value: "RBAC Aktif", icon: Shield },
    { label: "Audit Log", value: "Aktif", icon: History },
    { label: "Anonimleştirme", value: "Aktif", icon: EyeOff },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">KVKK Ayarları</h1>
        <p className="text-sm text-on-surface-variant mt-1 font-medium">Kişisel veri koruma ayarlarını yönetin</p>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-5">
          <ShieldCheck className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="font-bold text-on-surface">KVKK Uyumlu</h2>
            <p className="text-sm text-on-surface-variant">Sistem tüm KVKK gereksinimlerini karşılamaktadır</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {complianceItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-green-600" />
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{item.label}</p>
                </div>
                <p className="text-sm font-bold text-on-surface">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface tracking-tight">Aydınlatma Metni</h2>
        <p className="text-sm text-on-surface-variant">Müşteri kayıt formunda gösterilecek KVKK aydınlatma metni</p>
        <textarea
          value={aydinlatmaMetni}
          onChange={(e) => setAydinlatmaMetni(e.target.value)}
          rows={12}
          className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
        />
        <button className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:opacity-90 transition-all active:scale-[0.98]">
          Metni Güncelle
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface tracking-tight">Veri Saklama Süresi</h2>
        <p className="text-sm text-on-surface-variant">Müşteri verilerinin otomatik anonimleştirilme süresi</p>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value))}
            className="w-32 px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
          />
          <span className="text-sm text-on-surface-variant">gün ({(retentionDays / 365).toFixed(1)} yıl)</span>
        </div>
        <button className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:opacity-90 transition-all active:scale-[0.98]">
          Süreyi Güncelle
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface tracking-tight">Rıza Şablonları</h2>
        <div className="space-y-4">
          {[
            { type: "Açık Rıza", text: "Kişisel verilerimin emlak hizmeti kapsamında işlenmesine açık rıza veriyorum.", required: true },
            { type: "Aydınlatma", text: "KVKK aydınlatma metnini okudum ve anladım.", required: true },
            { type: "Pazarlama", text: "Pazarlama amaçlı iletişim kurulmasına izin veriyorum.", required: false },
          ].map((consent) => (
            <div key={consent.type} className="p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-on-surface">{consent.type}</span>
                {consent.required && (
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider">Zorunlu</span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant">{consent.text}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
