"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, ArrowLeft, Divide, User, Home } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type TxType = "SATIS" | "KIRA";

function formatTRY(v: number) {
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export default function CommissionCalculatorPage() {
  const [txType, setTxType] = useState<TxType>("SATIS");
  const [amountStr, setAmountStr] = useState("");

  // Satış: alıcı + satıcı ayrı oranlar
  const [buyerRateStr, setBuyerRateStr] = useState("2");
  const [sellerRateStr, setSellerRateStr] = useState("2");

  // Kira: tek oran (genelde 1 aylık kira = %100)
  const [kiraRateStr, setKiraRateStr] = useState("100");

  const [includeVAT, setIncludeVAT] = useState(false);
  const [agencyShareStr, setAgencyShareStr] = useState("100");

  const amount = parseFloat(amountStr) || 0;
  const buyerRate = parseFloat(buyerRateStr) || 0;
  const sellerRate = parseFloat(sellerRateStr) || 0;
  const kiraRate = parseFloat(kiraRateStr) || 0;
  const agencyShare = parseFloat(agencyShareStr) || 100;

  // Satış: iki taraf ayrı hesaplanır
  const buyerGross = (amount * buyerRate) / 100;
  const sellerGross = (amount * sellerRate) / 100;
  const buyerVat = includeVAT ? buyerGross * 0.2 : 0;
  const sellerVat = includeVAT ? sellerGross * 0.2 : 0;
  const buyerTotal = buyerGross + buyerVat;
  const sellerTotal = sellerGross + sellerVat;

  // Kira: tek taraf
  const kiraGross = (amount * kiraRate) / 100;
  const kiraVat = includeVAT ? kiraGross * 0.2 : 0;
  const kiraTotal = kiraGross + kiraVat;

  // Genel toplam
  const grandGross = txType === "SATIS" ? buyerGross + sellerGross : kiraGross;
  const grandVat = txType === "SATIS" ? buyerVat + sellerVat : kiraVat;
  const grandTotal = txType === "SATIS" ? buyerTotal + sellerTotal : kiraTotal;

  const agencyPortion = (grandTotal * agencyShare) / 100;
  const partnerPortion = grandTotal - agencyPortion;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center hover:bg-surface-container">
          <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Komisyon Hesaplayıcı</h1>
            <p className="text-sm text-on-surface-variant">Satış/kira komisyonu + KDV + paylaşım</p>
          </div>
        </div>
      </div>

      {/* İşlem tipi */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant">İşlem Tipi</label>
        <div className="grid grid-cols-2 gap-3">
          {(["SATIS", "KIRA"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTxType(t)}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-bold transition-all",
                txType === t
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {t === "SATIS" ? "Satış" : "Kira"}
            </button>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant">
          {txType === "SATIS"
            ? "Satışta alıcı ve satıcı ayrı komisyon öder (tipik: her taraftan %2)"
            : "Kira bedelinin % oranıdır (tipik: %100 = 1 aylık kira)"}
        </p>
      </div>

      {/* Girdiler */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
            {txType === "SATIS" ? "Satış Bedeli" : "Aylık Kira"} (₺)
          </label>
          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {txType === "SATIS" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Alıcı Komisyon Oranı (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={buyerRateStr}
                onChange={(e) => setBuyerRateStr(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
                <Home className="w-3 h-3" /> Satıcı Komisyon Oranı (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={sellerRateStr}
                onChange={(e) => setSellerRateStr(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Komisyon Oranı (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={kiraRateStr}
              onChange={(e) => setKiraRateStr(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeVAT}
            onChange={(e) => setIncludeVAT(e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
          <span className="text-sm font-medium text-on-surface">KDV dahil (%20)</span>
        </label>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
            <Divide className="inline w-3 h-3 mr-1" />
            Ofis Payı (%)
          </label>
          <input
            type="number"
            value={agencyShareStr}
            onChange={(e) => setAgencyShareStr(e.target.value)}
            min="0"
            max="100"
            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-on-surface-variant mt-2">
            Partner acentayla paylaşıyorsanız kendi ofisinizin oranı. Kalanı partner ofiste kalır.
          </p>
        </div>
      </div>

      {/* Sonuç */}
      <div className="bg-primary-fixed rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-primary">Hesaplama</h3>

        {txType === "SATIS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alıcı kartı */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <User className="w-4 h-4" />
                <p className="text-xs font-black uppercase tracking-wider">Alıcı ({buyerRate}%)</p>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-on-surface-variant">Brüt</span>
                <span className="font-bold text-on-surface">{formatTRY(buyerGross)} ₺</span>
              </div>
              {includeVAT && (
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">KDV (%20)</span>
                  <span className="font-bold text-on-surface">{formatTRY(buyerVat)} ₺</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-outline-variant/20">
                <span className="text-xs text-on-surface-variant">Toplam</span>
                <span className="font-black text-primary">{formatTRY(buyerTotal)} ₺</span>
              </div>
            </div>

            {/* Satıcı kartı */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Home className="w-4 h-4" />
                <p className="text-xs font-black uppercase tracking-wider">Satıcı ({sellerRate}%)</p>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-on-surface-variant">Brüt</span>
                <span className="font-bold text-on-surface">{formatTRY(sellerGross)} ₺</span>
              </div>
              {includeVAT && (
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">KDV (%20)</span>
                  <span className="font-bold text-on-surface">{formatTRY(sellerVat)} ₺</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-outline-variant/20">
                <span className="text-xs text-on-surface-variant">Toplam</span>
                <span className="font-black text-primary">{formatTRY(sellerTotal)} ₺</span>
              </div>
            </div>
          </div>
        )}

        {/* Kira veya genel toplam */}
        <div className="bg-primary text-on-primary rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
            {txType === "SATIS" ? "Toplam (Alıcı + Satıcı)" : "Toplam"}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] opacity-80">Brüt</p>
              <p className="text-lg font-black">{formatTRY(grandGross)} ₺</p>
            </div>
            {includeVAT && (
              <div>
                <p className="text-[10px] opacity-80">KDV</p>
                <p className="text-lg font-black">{formatTRY(grandVat)} ₺</p>
              </div>
            )}
            <div>
              <p className="text-[10px] opacity-80">Genel Toplam</p>
              <p className="text-lg font-black">{formatTRY(grandTotal)} ₺</p>
            </div>
          </div>
        </div>

        {agencyShare < 100 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant">Ofis Payı ({agencyShare}%)</p>
              <p className="text-xl font-black text-on-surface mt-1">{formatTRY(agencyPortion)} ₺</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-4">
              <p className="text-xs text-on-surface-variant">Partner Payı ({(100 - agencyShare).toFixed(1)}%)</p>
              <p className="text-xl font-black text-on-surface mt-1">{formatTRY(partnerPortion)} ₺</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-on-surface-variant text-center">
        Hesaplamalar bilgi amaçlıdır. Vergi ve yasal oranlar için muhasebeye danışın.
      </p>
    </motion.div>
  );
}
