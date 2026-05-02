"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Info, AlertCircle, Loader2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

// "Oda" alanları yalnızca oda kavramı olan mülk tiplerinde gösterilir.
// ARSA için saklı, diğerleri (DAIRE, VILLA, MUSTAKILEV, ISYERI) için açık.
const TYPES_WITH_ROOMS = new Set(["DAIRE", "VILLA", "MUSTAKILEV", "ISYERI"]);

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [preferredFeatures, setPreferredFeatures] = useState<string[]>([]);
  const [customerTypeOptions, setCustomerTypeOptions] = useState<{ code: string; label: string }[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [minRooms, setMinRooms] = useState("");
  const [maxRooms, setMaxRooms] = useState("");

  useEffect(() => {
    fetch("/api/customer-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCustomerTypeOptions(data);
      })
      .catch(() => setCustomerTypeOptions([]));

    fetch("/api/room-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setRoomTypeOptions(data);
      })
      .catch(() => setRoomTypeOptions([]));
  }, []);

  // Oda alanları: tercih edilen tipler arasında oda kavramı olan en az bir tip varsa açık
  const showRoomFields =
    preferredTypes.length === 0 ||
    preferredTypes.some((t) => TYPES_WITH_ROOMS.has(t));

  // ARSA seçilip kaldırılırsa eski oda değerlerini sıfırla
  useEffect(() => {
    if (!showRoomFields) {
      setMinRooms("");
      setMaxRooms("");
    }
  }, [showRoomFields]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const body = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      tcKimlikNo: formData.get("tcKimlikNo") || "",
      address: formData.get("address") || "",
      customerType: formData.get("customerType"),
      source: formData.get("source") || "",
      consents: {
        acikRiza: formData.get("acikRiza") === "on",
        aydinlatma: formData.get("aydinlatma") === "on",
        pazarlama: formData.get("pazarlama") === "on",
      },
      stage: "LEAD",
      urgency,
      minBudget: formData.get("minBudget") ? parseFloat(formData.get("minBudget") as string) : undefined,
      maxBudget: formData.get("maxBudget") ? parseFloat(formData.get("maxBudget") as string) : undefined,
      preferredTypes: preferredTypes.length > 0 ? preferredTypes : undefined,
      preferredCities: formData.get("preferredCities") ? (formData.get("preferredCities") as string).split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      preferredFeatures: preferredFeatures.length > 0 ? preferredFeatures : undefined,
      minRooms: showRoomFields && minRooms ? minRooms : undefined,
      maxRooms: showRoomFields && maxRooms ? maxRooms : undefined,
    };

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ? JSON.stringify(data.error) : "Bir hata oluştu");
      return;
    }

    router.push("/customers");
  }

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <Link
          href="/customers"
          className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">
          Yeni Müşteri
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-error-container text-on-error-container text-sm p-4 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-5 sm:p-8 space-y-5 border border-outline-variant/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-on-surface tracking-tight">
              Kişisel Bilgiler
            </h2>
            <p className="text-xs text-on-surface-variant">
              <span className="text-error font-bold">*</span> işaretli alanlar zorunludur
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Ad <span className="text-error">*</span></label>
              <input name="firstName" required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Soyad <span className="text-error">*</span></label>
              <input name="lastName" required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">E-posta</label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Telefon</label>
              <input name="phone" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">TC Kimlik No</label>
              <input name="tcKimlikNo" maxLength={11} className={inputClass} placeholder="Şifrelenecektir (KVKK)" />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Müşteri Tipi <span className="text-error">*</span></label>
              <select name="customerType" required className={inputClass} defaultValue="">
                <option value="" disabled>Seçiniz</option>
                {customerTypeOptions.map((t) => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Adres</label>
            <textarea name="address" rows={2} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Kaynak</label>
            <select name="source" className={inputClass}>
              <option value="">Seçiniz</option>
              <option value="referans">Referans</option>
              <option value="internet">İnternet</option>
              <option value="sahibinden">Sahibinden.com</option>
              <option value="hepsiemlak">Hepsiemlak</option>
              <option value="walkin">Ofis Ziyareti</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
        </div>

        {/* Talep Bilgileri */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-5 sm:p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Talep Bilgileri (Opsiyonel)
          </h2>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Aciliyet</label>
            <div className="flex gap-2">
              {[{ key: "LOW", label: "Düşük" }, { key: "MEDIUM", label: "Orta" }, { key: "HIGH", label: "Yüksek" }, { key: "URGENT", label: "Acil" }].map((u) => (
                <button key={u.key} type="button" onClick={() => setUrgency(u.key)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    urgency === u.key ? "primary-gradient text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  )}>{u.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Min Bütçe (₺)</label>
              <input name="minBudget" type="number" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Max Bütçe (₺)</label>
              <input name="maxBudget" type="number" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Tercih Edilen Mülk Tipi</label>
            <div className="flex flex-wrap gap-2">
              {[{ key: "DAIRE", label: "Daire" }, { key: "VILLA", label: "Villa" }, { key: "ARSA", label: "Arsa" }, { key: "ISYERI", label: "İşyeri" }, { key: "MUSTAKILEV", label: "Müstakil Ev" }].map((pt) => (
                <button key={pt.key} type="button" onClick={() => setPreferredTypes((prev) => prev.includes(pt.key) ? prev.filter((t) => t !== pt.key) : [...prev, pt.key])}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    preferredTypes.includes(pt.key) ? "primary-gradient text-white shadow-sm" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  )}>{pt.label}</button>
              ))}
            </div>
          </div>
          {showRoomFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Min Oda Tipi</label>
                <select value={minRooms} onChange={(e) => setMinRooms(e.target.value)} className={inputClass}>
                  <option value="">Seçiniz</option>
                  {roomTypeOptions.map((rt) => (
                    <option key={rt.id} value={rt.name}>{rt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Max Oda Tipi</label>
                <select value={maxRooms} onChange={(e) => setMaxRooms(e.target.value)} className={inputClass}>
                  <option value="">Seçiniz</option>
                  {roomTypeOptions.map((rt) => (
                    <option key={rt.id} value={rt.name}>{rt.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Tercih Edilen Şehirler</label>
            <input name="preferredCities" className={inputClass} placeholder="İstanbul, Ankara (virgülle ayırın)" />
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">İstenen Özellikler</label>
            <div className="flex flex-wrap gap-2">
              {["Otopark", "Havuz", "Asansör", "Balkon", "Güvenlik", "Bahçe", "Manzara", "Metro Yakın"].map((f) => (
                <button key={f} type="button" onClick={() => setPreferredFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    preferredFeatures.includes(f) ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  )}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-5 sm:p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            KVKK Rıza Yönetimi
          </h2>

          <div className="bg-secondary-container/30 p-5 rounded-2xl flex items-center gap-3 text-sm text-on-surface-variant">
            <Info className="w-5 h-5 text-primary shrink-0" />
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında müşteriden aşağıdaki rızaların alınması gerekmektedir.
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-4 p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer">
              <input type="checkbox" name="acikRiza" className="mt-0.5 w-4 h-4 text-primary rounded-md" />
              <div>
                <p className="text-sm font-bold text-on-surface">Açık Rıza *</p>
                <p className="text-xs text-on-surface-variant mt-1">Kişisel verilerimin emlak hizmeti kapsamında işlenmesine açık rıza veriyorum.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer">
              <input type="checkbox" name="aydinlatma" className="mt-0.5 w-4 h-4 text-primary rounded-md" />
              <div>
                <p className="text-sm font-bold text-on-surface">Aydınlatma Metni *</p>
                <p className="text-xs text-on-surface-variant mt-1">KVKK aydınlatma metnini okudum ve anladım. Verilerimin grubumuzun tüm şubelerindeki yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceğini kabul ediyorum.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer">
              <input type="checkbox" name="pazarlama" className="mt-0.5 w-4 h-4 text-primary rounded-md" />
              <div>
                <p className="text-sm font-bold text-on-surface">Pazarlama İzni</p>
                <p className="text-xs text-on-surface-variant mt-1">Ticari elektronik ileti (SMS, e-posta) gönderilmesine izin veriyorum.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 text-sm text-white primary-gradient font-bold rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Müşteriyi Kaydet"
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
