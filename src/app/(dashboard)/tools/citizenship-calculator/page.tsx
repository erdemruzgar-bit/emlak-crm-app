"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Calculator, Globe, RefreshCw, Info, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TR Vatandaşlığa Uygun Mülk Fiyat Hesaplayıcısı.
 *
 * Türk vatandaşlığı için yabancıya gayrimenkul satışında, programın gerektirdiği
 * minimum tutar (USD cinsinden, mevzuatla değişebilir) üzerinden hesap yapar.
 * Kullanıcı satış fiyatını ve döviz kurunu girer; bağlı sonuçları görür:
 *   - Eşik altı/üstü mü
 *   - Eşiğe ulaşmak için gereken ek tutar (TRY)
 *   - Önerilen "vatandaşlık fiyat farkı"
 *   - Toplam vatandaşlık fiyatı
 */

const DEFAULT_THRESHOLD_USD = 400000;

export default function CitizenshipCalculatorPage() {
  // Form state
  const [salePriceTRY, setSalePriceTRY] = useState("");
  const [usdRate, setUsdRate] = useState(""); // 1 USD = ? TRY
  const [thresholdUSD, setThresholdUSD] = useState(String(DEFAULT_THRESHOLD_USD));
  const [extraDiff, setExtraDiff] = useState(""); // Manuel ek fark (komisyon, dilek)

  // TCMB bağlantısı yok — kullanıcı kuru elle girer. (Otomatik fetch ileriki versiyonda)
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Auto-fetch USD rate from a public proxy (open.er-api.com — no key needed)
  async function fetchUsdRate() {
    setRateLoading(true);
    setRateError(null);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("Kur servisi cevap vermedi");
      const data = await res.json();
      const try_ = data?.rates?.TRY;
      if (typeof try_ === "number") {
        setUsdRate(try_.toFixed(2));
      } else {
        setRateError("TRY kuru bulunamadı");
      }
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "Hata");
    } finally {
      setRateLoading(false);
    }
  }

  useEffect(() => {
    // Sayfa açılışında bir kez kur çek
    fetchUsdRate();
  }, []);

  const calc = useMemo(() => {
    const sale = parseFloat(salePriceTRY) || 0;
    const rate = parseFloat(usdRate) || 0;
    const threshold = parseFloat(thresholdUSD) || 0;
    const extra = parseFloat(extraDiff) || 0;

    if (sale === 0 || rate === 0) {
      return null;
    }

    const saleUSD = sale / rate;
    const thresholdTRY = threshold * rate;
    const isAbove = saleUSD >= threshold;
    const gapTRY = isAbove ? 0 : Math.max(0, thresholdTRY - sale);
    const gapUSD = isAbove ? 0 : Math.max(0, threshold - saleUSD);
    const recommendedDiff = Math.max(extra, gapTRY); // En az eşiğe yetecek + ek fark
    const finalPriceTRY = sale + recommendedDiff;
    const finalPriceUSD = finalPriceTRY / rate;

    return {
      sale,
      rate,
      threshold,
      saleUSD,
      thresholdTRY,
      isAbove,
      gapTRY,
      gapUSD,
      extra,
      recommendedDiff,
      finalPriceTRY,
      finalPriceUSD,
    };
  }, [salePriceTRY, usdRate, thresholdUSD, extraDiff]);

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

  function fmtTRY(n: number) {
    return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
  }
  function fmtUSD(n: number) {
    return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">
            Vatandaşlık Fiyat Hesaplayıcısı
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Yabancıya satışta TR vatandaşlığı için minimum eşik ve fiyat farkı hesabı
          </p>
        </div>
      </div>

      {/* Bilgi notu */}
      <div className="bg-secondary-container/40 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-on-surface-variant leading-relaxed">
          TR vatandaşlığı için gayrimenkul yatırımı asgari tutarı{" "}
          <strong className="text-on-surface">400.000 USD</strong> (mevzuat değişebilir).
          Hesaplayıcı, satış fiyatınızın eşiği karşılayıp karşılamadığını ve gerekirse
          eklenmesi gereken farkı gösterir. Resmi tutarlar için Tapu Müdürlüğü'nü teyit
          edin.
        </div>
      </div>

      {/* Form */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 sm:p-8 space-y-5 border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface">Bilgileri Girin</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">
              Satış Fiyatı (TRY) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={salePriceTRY}
              onChange={(e) => setSalePriceTRY(e.target.value)}
              placeholder="Örn: 12500000"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2 flex items-center justify-between gap-2">
              <span>USD/TRY Kuru <span className="text-error">*</span></span>
              <button
                type="button"
                onClick={fetchUsdRate}
                disabled={rateLoading}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 normal-case tracking-normal"
              >
                <RefreshCw className={cn("w-3 h-3", rateLoading && "animate-spin")} />
                {rateLoading ? "Yükleniyor..." : "Güncel kuru çek"}
              </button>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={usdRate}
              onChange={(e) => setUsdRate(e.target.value)}
              placeholder="Örn: 32.50"
              className={inputClass}
            />
            {rateError && (
              <p className="text-[10px] text-error mt-1">{rateError} — elle girin</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">
              Vatandaşlık Eşiği (USD)
            </label>
            <input
              type="number"
              min="0"
              value={thresholdUSD}
              onChange={(e) => setThresholdUSD(e.target.value)}
              className={inputClass}
            />
            <p className="text-[10px] text-on-surface-variant mt-1">Varsayılan: 400.000 USD</p>
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">
              Ek Fark (TRY, ops.)
            </label>
            <input
              type="number"
              min="0"
              value={extraDiff}
              onChange={(e) => setExtraDiff(e.target.value)}
              placeholder="Komisyon / dilek farkı"
              className={inputClass}
            />
            <p className="text-[10px] text-on-surface-variant mt-1">
              Eşiğe ek olarak istediğiniz tutar (komisyon, dilek vs.)
            </p>
          </div>
        </div>
      </div>

      {/* Sonuç */}
      {calc && (
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 sm:p-8 space-y-5 border border-outline-variant/10">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-on-surface">Sonuç</h2>
          </div>

          {/* Eşik durumu */}
          <div
            className={cn(
              "rounded-2xl p-5 flex items-start gap-4",
              calc.isAbove
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-error-container"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                calc.isAbove
                  ? "bg-green-500/20 text-green-700 dark:text-green-300"
                  : "bg-error/20 text-on-error-container"
              )}
            >
              {calc.isAbove ? "✓" : "!"}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "font-black text-base",
                  calc.isAbove ? "text-green-700 dark:text-green-300" : "text-on-error-container"
                )}
              >
                {calc.isAbove
                  ? "Satış fiyatı vatandaşlık eşiğinin üzerinde"
                  : "Satış fiyatı eşiğin altında — fark eklenmesi gerekiyor"}
              </p>
              <p className="text-sm text-on-surface mt-1">
                Mevcut: <strong>{fmtUSD(calc.saleUSD)}</strong> · Eşik:{" "}
                <strong>{fmtUSD(calc.threshold)}</strong>
                {!calc.isAbove && (
                  <> · Açık: <strong>{fmtUSD(calc.gapUSD)}</strong> ({fmtTRY(calc.gapTRY)})</>
                )}
              </p>
            </div>
          </div>

          {/* Detay tablosu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultRow label="Satış Fiyatı (TRY)" value={fmtTRY(calc.sale)} />
            <ResultRow label="Satış Fiyatı (USD)" value={fmtUSD(calc.saleUSD)} />
            <ResultRow label="Eşik (TRY karşılığı)" value={fmtTRY(calc.thresholdTRY)} />
            <ResultRow label="Kullanılan Kur" value={`1 USD = ${calc.rate.toLocaleString("tr-TR")} TRY`} />
            {calc.gapTRY > 0 && (
              <ResultRow
                label="Eşiğe Yetecek Fark"
                value={fmtTRY(calc.gapTRY)}
                highlight
              />
            )}
            {calc.extra > 0 && (
              <ResultRow label="Manuel Ek Fark" value={fmtTRY(calc.extra)} />
            )}
            <ResultRow
              label="Önerilen Toplam Fark"
              value={fmtTRY(calc.recommendedDiff)}
              highlight
            />
          </div>

          {/* Final */}
          <div className="bg-primary-fixed rounded-2xl p-5 mt-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">
                  Vatandaşlığa Uygun Fiyatı
                </p>
                <p className="text-2xl sm:text-3xl font-black text-primary">
                  {fmtTRY(calc.finalPriceTRY)}
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {fmtUSD(calc.finalPriceUSD)}
                </p>
              </div>
              <div className="text-right text-xs text-on-surface-variant">
                <p>Satış fiyatı: {fmtTRY(calc.sale)}</p>
                {calc.recommendedDiff > 0 && (
                  <p>+ Fark: {fmtTRY(calc.recommendedDiff)}</p>
                )}
                <p className="mt-1 font-bold text-on-surface">= Toplam</p>
              </div>
            </div>
          </div>

          {/* İlan formuna nasıl aktarılır ipucu */}
          <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 text-sm text-on-surface-variant">
            <ArrowDownToLine className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              Yeni ilan eklerken <strong>Sahip ve Kullanım → Vatandaşlığa Uygun: Evet</strong>{" "}
              seçin ve <strong>Fiyat Farkı</strong> alanına{" "}
              <strong className="text-primary">{fmtTRY(calc.recommendedDiff)}</strong>{" "}
              yazın. Sistem otomatik olarak vatandaşlığa uygun fiyatı hesaplar.
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 border",
        highlight
          ? "bg-primary-fixed/40 border-primary/20"
          : "bg-surface-container-low border-outline-variant/10"
      )}
    >
      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{label}</p>
      <p className={cn("text-sm font-bold mt-1", highlight ? "text-primary" : "text-on-surface")}>
        {value}
      </p>
    </div>
  );
}
