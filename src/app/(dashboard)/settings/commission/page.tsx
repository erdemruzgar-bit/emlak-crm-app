"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Calculator, Loader2, Save, Building2, RotateCcw, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommissionPolicy {
  id: string;
  branchId: string | null;
  name: string;
  salesBuyerRate: number;
  salesSellerRate: number;
  rentTenantRate: number;
  rentLandlordRate: number;
  vatRate: number;
  vatIncludedDefault: boolean;
  cobrokerOwnShare: number;
  agentShareOfOwnOffice: number;
  buyerSideAgentShare: number;
  payoutTemplate: "CLASSIC" | "COBROKER" | "DOUBLE_AGENT" | "COBROKER_DOUBLE";
}

interface Branch {
  id: string;
  name: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  CLASSIC: "Klasik (tek ofis, tek danışman)",
  COBROKER: "Co-broker (iki ofis)",
  DOUBLE_AGENT: "Çift danışman (aynı ofis)",
  COBROKER_DOUBLE: "Co-broker + çift danışman",
};

const inputClass =
  "w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20";

export default function CommissionSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(""); // "" = şirket geneli
  const [policy, setPolicy] = useState<CommissionPolicy | null>(null);
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setBranches(data.map((b: Branch) => ({ id: b.id, name: b.name })));
      });
  }, []);

  useEffect(() => {
    loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  async function loadPolicy() {
    setLoading(true);
    setSaved(false);
    const url = selectedBranchId
      ? `/api/commission-policy?branchId=${selectedBranchId}`
      : "/api/commission-policy";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (selectedBranchId) {
        setPolicy(data.effective);
        setHasOverride(!!data.override);
      } else {
        setPolicy(data);
        setHasOverride(false);
      }
    }
    setLoading(false);
  }

  async function save() {
    if (!policy) return;
    setSaving(true);
    setSaved(false);
    const url = selectedBranchId
      ? `/api/commission-policy?branchId=${selectedBranchId}`
      : "/api/commission-policy";
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salesBuyerRate: policy.salesBuyerRate,
        salesSellerRate: policy.salesSellerRate,
        rentTenantRate: policy.rentTenantRate,
        rentLandlordRate: policy.rentLandlordRate,
        vatRate: policy.vatRate,
        vatIncludedDefault: policy.vatIncludedDefault,
        cobrokerOwnShare: policy.cobrokerOwnShare,
        agentShareOfOwnOffice: policy.agentShareOfOwnOffice,
        buyerSideAgentShare: policy.buyerSideAgentShare,
        payoutTemplate: policy.payoutTemplate,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setHasOverride(!!selectedBranchId);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function removeOverride() {
    if (!selectedBranchId) return;
    if (!confirm("Bu şubenin özel politikasını kaldır ve şirket geneline döndür?")) return;
    const res = await fetch(`/api/commission-policy?branchId=${selectedBranchId}`, { method: "DELETE" });
    if (res.ok) loadPolicy();
  }

  if (loading || !policy) {
    return (
      <div className="flex items-center justify-center py-20 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />Yükleniyor...
      </div>
    );
  }

  function update<K extends keyof CommissionPolicy>(key: K, value: CommissionPolicy[K]) {
    setPolicy((p) => (p ? { ...p, [key]: value } : p));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface">Komisyon Politikası</h1>
          <p className="text-sm text-on-surface-variant">Default oranlar, KDV ve paylaşım şablonları. Hesaplayıcı bu değerlerle başlar.</p>
        </div>
      </div>

      {/* Şube seçici */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
        <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-3">Politika Kapsamı</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBranchId("")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              !selectedBranchId ? "bg-primary text-white shadow" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            )}
          >
            <Globe className="w-4 h-4" />
            Şirket Geneli
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                selectedBranchId === b.id ? "bg-primary text-white shadow" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}
            >
              <Building2 className="w-4 h-4" />
              {b.name}
            </button>
          ))}
        </div>
        {selectedBranchId && (
          <div className="mt-3 flex items-center gap-3">
            <span className={cn(
              "text-xs px-2 py-1 rounded-lg font-bold",
              hasOverride ? "bg-tertiary-fixed text-tertiary" : "bg-surface-container text-on-surface-variant"
            )}>
              {hasOverride ? "Bu şube için özel politika tanımlı" : "Şu an şirket genelini kullanıyor"}
            </span>
            {hasOverride && (
              <button onClick={removeOverride}
                className="text-xs text-error font-bold hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />Özel politikayı kaldır
              </button>
            )}
          </div>
        )}
      </div>

      {/* Şablon */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant">Default Paylaşım Şablonu</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(TEMPLATE_LABELS) as Array<keyof typeof TEMPLATE_LABELS>).map((tpl) => (
            <button key={tpl} onClick={() => update("payoutTemplate", tpl as CommissionPolicy["payoutTemplate"])}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-bold transition-all text-left",
                policy.payoutTemplate === tpl
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}>
              {TEMPLATE_LABELS[tpl]}
            </button>
          ))}
        </div>
      </div>

      {/* Oranlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">Satış Oranları</h2>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Alıcıdan komisyon (%)</label>
            <input type="number" step="0.1" value={policy.salesBuyerRate}
              onChange={(e) => update("salesBuyerRate", parseFloat(e.target.value) || 0)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Satıcıdan komisyon (%)</label>
            <input type="number" step="0.1" value={policy.salesSellerRate}
              onChange={(e) => update("salesSellerRate", parseFloat(e.target.value) || 0)} className={inputClass} />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">Kira Oranları</h2>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Kiracıdan komisyon (%)</label>
            <input type="number" step="0.1" value={policy.rentTenantRate}
              onChange={(e) => update("rentTenantRate", parseFloat(e.target.value) || 0)} className={inputClass} />
            <p className="text-[10px] text-on-surface-variant mt-1">100 = 1 aylık kira</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Mülk sahibinden komisyon (%)</label>
            <input type="number" step="0.1" value={policy.rentLandlordRate}
              onChange={(e) => update("rentLandlordRate", parseFloat(e.target.value) || 0)} className={inputClass} />
            <p className="text-[10px] text-on-surface-variant mt-1">Genelde 0 (mülk sahibinden komisyon alınmaz)</p>
          </div>
        </div>
      </div>

      {/* KDV */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">KDV</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">KDV oranı (%)</label>
            <input type="number" step="0.1" value={policy.vatRate}
              onChange={(e) => update("vatRate", parseFloat(e.target.value) || 0)} className={inputClass} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer pt-7">
            <input type="checkbox" checked={policy.vatIncludedDefault}
              onChange={(e) => update("vatIncludedDefault", e.target.checked)}
              className="w-5 h-5 accent-primary" />
            <span className="text-sm font-medium text-on-surface">Hesaplayıcıda KDV varsayılan açık olsun</span>
          </label>
        </div>
      </div>

      {/* Paylaşım oranları */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">Paylaşım Default Oranları</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Bizim ofis (co-broker'da) (%)</label>
            <input type="number" step="1" value={policy.cobrokerOwnShare}
              onChange={(e) => update("cobrokerOwnShare", parseFloat(e.target.value) || 0)} className={inputClass} />
            <p className="text-[10px] text-on-surface-variant mt-1">Partner ofis = {(100 - policy.cobrokerOwnShare).toFixed(0)}%</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Danışman payı (ofise düşenden) (%)</label>
            <input type="number" step="1" value={policy.agentShareOfOwnOffice}
              onChange={(e) => update("agentShareOfOwnOffice", parseFloat(e.target.value) || 0)} className={inputClass} />
            <p className="text-[10px] text-on-surface-variant mt-1">Ofise kalan = {(100 - policy.agentShareOfOwnOffice).toFixed(0)}%</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2">Çift danışmanda alıcı tarafı (%)</label>
            <input type="number" step="1" value={policy.buyerSideAgentShare}
              onChange={(e) => update("buyerSideAgentShare", parseFloat(e.target.value) || 0)} className={inputClass} />
            <p className="text-[10px] text-on-surface-variant mt-1">Satıcı tarafı = {(100 - policy.buyerSideAgentShare).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm font-bold text-green-600">Kaydedildi ✓</span>}
        <button onClick={save} disabled={saving}
          className="px-6 py-3 primary-gradient text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {selectedBranchId ? (hasOverride ? "Şube politikasını güncelle" : "Şube politikasını oluştur") : "Şirket genelini kaydet"}
        </button>
      </div>
    </motion.div>
  );
}
