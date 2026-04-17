"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, ImagePlus, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [propertyType, setPropertyType] = useState("DAIRE");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);

    const body = {
      title: fd.get("title"),
      listingType: fd.get("listingType"),
      propertyType,
      price: parseFloat(fd.get("price") as string),
      currency: fd.get("currency") || "TRY",
      area: fd.get("area")
        ? parseFloat(fd.get("area") as string)
        : undefined,
      rooms: fd.get("rooms") || undefined,
      bathrooms: fd.get("bathrooms")
        ? parseInt(fd.get("bathrooms") as string)
        : undefined,
      floor: fd.get("floor")
        ? parseInt(fd.get("floor") as string)
        : undefined,
      totalFloors: fd.get("totalFloors")
        ? parseInt(fd.get("totalFloors") as string)
        : undefined,
      age: fd.get("age") ? parseInt(fd.get("age") as string) : undefined,
      heating: fd.get("heating") || undefined,
      city: fd.get("city") || undefined,
      district: fd.get("district") || undefined,
      neighborhood: fd.get("neighborhood") || undefined,
      address: fd.get("address") || undefined,
      description: fd.get("description") || undefined,
    };

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ? JSON.stringify(data.error) : "Bir hata oluştu");
      return;
    }

    // Add images if any
    if (imageUrls.length > 0) {
      await fetch(`/api/properties/${data.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: imageUrls }),
      });
    }

    router.push("/properties");
  }

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

  const propertyTypes = [
    { value: "DAIRE", label: "Daire" },
    { value: "VILLA", label: "Villa" },
    { value: "ARSA", label: "Arsa" },
    { value: "ISYERI", label: "İşyeri" },
    { value: "MUSTAKILEV", label: "Müstakil Ev" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <Link
          href="/properties"
          className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">
          Yeni İlan
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-error-container text-on-error-container text-sm p-4 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">
            Genel Bilgiler
          </h2>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
              İlan Başlığı *
            </label>
            <input
              name="title"
              required
              className={inputClass}
              placeholder="Kadıköy'de Deniz Manzaralı 3+1 Daire"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                İlan Tipi *
              </label>
              <select name="listingType" required className={inputClass}>
                <option value="SATILIK">Satılık</option>
                <option value="KIRALIK">Kiralık</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Fiyat (TL) *
              </label>
              <input name="price" type="number" required className={inputClass} />
            </div>
          </div>

          {/* Property Type Buttons */}
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">
              Emlak Tipi
            </label>
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPropertyType(pt.value)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                    propertyType === pt.value
                      ? "primary-gradient text-white shadow-lg shadow-primary/10"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">
            Detaylar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                m²
              </label>
              <input name="area" type="number" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Oda
              </label>
              <input name="rooms" placeholder="3+1" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Banyo
              </label>
              <input name="bathrooms" type="number" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Kat
              </label>
              <input name="floor" type="number" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Toplam Kat
              </label>
              <input name="totalFloors" type="number" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Bina Yaşı
              </label>
              <input name="age" type="number" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Isıtma
              </label>
              <select name="heating" className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="dogalgaz">Doğalgaz</option>
                <option value="merkezi">Merkezi</option>
                <option value="kombi">Kombi</option>
                <option value="soba">Soba</option>
                <option value="klima">Klima</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">
            Konum
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Şehir
              </label>
              <input name="city" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                İlçe
              </label>
              <input name="district" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Mahalle
              </label>
              <input name="neighborhood" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
              Adres
            </label>
            <input name="address" className={inputClass} />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
            Açıklama
          </label>
          <textarea name="description" rows={4} className={inputClass} />
        </div>

        {/* Photo URLs */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            Fotoğraflar
          </h2>
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="Fotoğraf URL'si yapıştırın..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className={cn("flex-1", inputClass)}
            />
            <button
              type="button"
              onClick={() => {
                if (newImageUrl.trim()) {
                  setImageUrls([...imageUrls, newImageUrl.trim()]);
                  setNewImageUrl("");
                }
              }}
              disabled={!newImageUrl.trim()}
              className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              Ekle
            </button>
          </div>
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative group rounded-2xl overflow-hidden aspect-video bg-surface-container-low">
                  <img
                    src={url}
                    alt={`Fotoğraf ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                  />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">
                      Ana Fotoğraf
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-on-surface-variant">
            İlk eklenen fotoğraf ana fotoğraf olarak ayarlanır. Unsplash veya diğer kaynaklardan URL yapıştırabilirsiniz.
          </p>
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
              "İlanı Kaydet"
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
