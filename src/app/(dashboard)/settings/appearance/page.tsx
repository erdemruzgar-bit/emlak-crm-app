"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Palette, Upload, X, Check, Loader2, RotateCcw, Image as ImageIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// Unsplash'ten curated emlak temalı yüksek kaliteli arka planlar (ücretsiz, Unsplash License)
const PRESET_BACKGROUNDS = [
  {
    name: "Modern Villa",
    description: "Lüks modern villa, gün ışığı",
    url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=3840&q=80&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=60&auto=format&fit=crop",
  },
  {
    name: "İç Mekan",
    description: "Minimal beyaz oturma odası",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=3840&q=80&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=60&auto=format&fit=crop",
  },
  {
    name: "İstanbul Silueti",
    description: "Boğaz manzarası, alacakaranlık",
    url: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=3840&q=80&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&q=60&auto=format&fit=crop",
  },
  {
    name: "Modern Bina",
    description: "Çağdaş mimari, cam cephe",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=3840&q=80&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=60&auto=format&fit=crop",
  },
  {
    name: "Anahtar Teslimi",
    description: "Sıcak ton, ahşap detaylar",
    url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=3840&q=80&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=60&auto=format&fit=crop",
  },
];

export default function AppearancePage() {
  const { backgroundUrl, overlayOpacity, setBackgroundUrl, setOverlayOpacity, reset } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setBackgroundUrl(data.url);
      } else {
        const data = await res.json();
        setUploadError(data.error || "Yükleme başarısız");
      }
    } catch {
      setUploadError("Bağlantı hatası");
    } finally {
      setUploading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface flex items-center gap-3">
          <Palette className="w-7 h-7 text-primary" /> Görünüm ve Tema
        </h1>
        <p className="text-sm text-on-surface-variant mt-1 font-medium">
          Arka plan görselinizi seçin veya kendi fotoğrafınızı yükleyin. Tercihiniz bu cihazda saklanır.
        </p>
      </div>

      {/* Mevcut durum */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 relative">
              {backgroundUrl ? (
                <img src={backgroundUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Mevcut Arka Plan</p>
              <p className="text-sm font-bold text-on-surface mt-1">
                {backgroundUrl ? "Özel görsel aktif" : "Varsayılan (düz renk)"}
              </p>
              {backgroundUrl && (
                <button onClick={() => setBackgroundUrl(null)}
                  className="text-xs text-error hover:underline mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> Kaldır
                </button>
              )}
            </div>
          </div>
          <button onClick={reset}
            className="px-4 py-2 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant flex items-center gap-2 transition-all">
            <RotateCcw className="w-4 h-4" /> Varsayılana Dön
          </button>
        </div>
      </div>

      {/* Hazır Arka Planlar */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface mb-4 tracking-tight">Hazır Arka Planlar</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESET_BACKGROUNDS.map((bg) => {
            const active = backgroundUrl === bg.url;
            return (
              <button
                key={bg.url}
                onClick={() => setBackgroundUrl(bg.url)}
                className={cn(
                  "group relative aspect-[4/3] rounded-2xl overflow-hidden text-left transition-all",
                  active ? "ring-4 ring-primary shadow-lg" : "ring-1 ring-outline-variant/10 hover:ring-primary/40 hover:shadow-md"
                )}
              >
                <img src={bg.thumb} alt={bg.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="text-xs font-black">{bg.name}</p>
                  <p className="text-[10px] opacity-80">{bg.description}</p>
                </div>
                {active && (
                  <div className="absolute top-2 right-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kendi Görselini Yükle */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface mb-2 tracking-tight">Kendi Görselinizi Yükleyin</h2>
        <p className="text-xs text-on-surface-variant mb-4">
          4K çözünürlükte (3840 × 2160 önerilir) bir fotoğraf yükleyin. JPG, PNG veya WEBP. En fazla 100 MB.
        </p>
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-8 flex flex-col items-center gap-3 transition-all hover:bg-surface-container-low/50">
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-bold text-on-surface">Yükleniyor...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-primary-fixed rounded-2xl flex items-center justify-center">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-on-surface">Tıklayın veya sürükleyip bırakın</p>
                  <p className="text-xs text-on-surface-variant mt-1">JPG, PNG, WEBP · 4K çözünürlük önerilir</p>
                </div>
              </>
            )}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadError && (
          <p className="text-xs text-error bg-error-container/30 px-3 py-2 rounded-lg mt-3">{uploadError}</p>
        )}
      </div>

      {/* Opaklık ayarı */}
      {backgroundUrl && (
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-on-surface tracking-tight">İçerik Opaklığı</h2>
            <span className="text-sm font-bold text-primary">%{overlayOpacity}</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-4">
            Arka plan ile içerik arasındaki beyaz örtünün yoğunluğu. Düşük değer: arka plan daha belirgin, okunabilirlik düşer.
          </p>
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-on-surface-variant font-bold mt-1">
            <span>Daha şeffaf</span>
            <span>Daha okunaklı</span>
          </div>
        </div>
      )}

      {/* Bilgilendirme */}
      <p className="text-xs text-on-surface-variant text-center pt-2">
        Bu ayar sadece <strong>sizin cihazınızda</strong> saklanır. Başka kullanıcıları etkilemez.
      </p>
    </motion.div>
  );
}
