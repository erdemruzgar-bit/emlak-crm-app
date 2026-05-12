"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calculator, ArrowLeft, Search, Home, User, X, Plus, FileSignature,
  Loader2, Trash2, Settings as SettingsIcon, Info,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// ============== TYPES ==============

type TxType = "SATIS" | "KIRA";
type ShareType = "PERCENT" | "FIXED";
type PayoutTemplate = "CLASSIC" | "COBROKER" | "DOUBLE_AGENT" | "COBROKER_DOUBLE";

interface PropertyOpt {
  id: string;
  title: string;
  price: number;
  currency: string;
  listingType: string;        // SATILIK / KIRALIK / ARSIV
  propertyType: string;
  city: string | null;
  district: string | null;
  assignedAgent: { id: string; name: string } | null;
  branch: { name: string } | null;
}

interface CustomerOpt {
  id: string;
  firstName: string;
  lastName: string;
  customerType: string;
  phone: string | null;
}

interface UserOpt { id: string; name: string }

interface ShareItem {
  id: string;
  label: string;                       // "Bizim Ofis", "Partner Ofis", "Ahmet (alıcı tarafı)"
  type: ShareType;                     // PERCENT | FIXED
  value: number;                       // % veya ₺
  payeeUserId?: string | null;         // sistem kullanıcısı varsa
  category: "OFFICE" | "PARTNER_OFFICE" | "AGENT_BUYER_SIDE" | "AGENT_SELLER_SIDE" | "REFERRAL" | "OTHER";
}

interface CommissionPolicy {
  salesBuyerRate: number;
  salesSellerRate: number;
  rentTenantRate: number;
  rentLandlordRate: number;
  vatRate: number;
  vatIncludedDefault: boolean;
  cobrokerOwnShare: number;
  agentShareOfOwnOffice: number;
  buyerSideAgentShare: number;
  payoutTemplate: PayoutTemplate;
}

// ============== UTIL ==============

function formatTRY(v: number, currency = "TRY") {
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + ` ${currency === "TRY" ? "₺" : currency}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function customerLabel(c: CustomerOpt) {
  return `${c.firstName} ${c.lastName}` + (c.phone ? ` · ${c.phone}` : "");
}

// Şablon → default paylaşım kalemleri üretir.
// Bu sadece BAŞLANGIÇ değerleridir; kullanıcı kalemleri sonradan düzenleyebilir/silebilir/ekleyebilir.
function buildDefaultShares(
  template: PayoutTemplate,
  policy: CommissionPolicy,
  buyerAgent?: UserOpt | null,
  sellerAgent?: UserOpt | null,
): ShareItem[] {
  const own = policy.cobrokerOwnShare;     // bizim ofis %
  const partner = 100 - own;               // partner ofis %
  const agentOfOwn = policy.agentShareOfOwnOffice; // ofise düşenden danışmana %
  const buyerSide = policy.buyerSideAgentShare;    // çift danışmanda alıcı tarafı %

  switch (template) {
    case "CLASSIC": {
      // Tek ofis, tek danışman: ofise (100 - agentOfOwn)%, danışmana agentOfOwn%
      return [
        { id: uid(), label: "Bizim Ofis", type: "PERCENT", value: 100 - agentOfOwn, category: "OFFICE" },
        {
          id: uid(),
          label: buyerAgent?.name ? `${buyerAgent.name} (danışman)` : "Danışman",
          type: "PERCENT",
          value: agentOfOwn,
          payeeUserId: buyerAgent?.id ?? null,
          category: "AGENT_BUYER_SIDE",
        },
      ];
    }
    case "COBROKER": {
      // İki ofis, danışman bir kişi (bizim tarafımız)
      // Önce komisyon ikiye bölünür (bizim/partner), bizim payımızdan danışman alır.
      const ownAgent = own * (agentOfOwn / 100);
      const ownOffice = own - ownAgent;
      return [
        { id: uid(), label: "Partner Ofis", type: "PERCENT", value: partner, category: "PARTNER_OFFICE" },
        { id: uid(), label: "Bizim Ofis", type: "PERCENT", value: ownOffice, category: "OFFICE" },
        {
          id: uid(),
          label: buyerAgent?.name ? `${buyerAgent.name} (danışman)` : "Danışman",
          type: "PERCENT",
          value: ownAgent,
          payeeUserId: buyerAgent?.id ?? null,
          category: "AGENT_BUYER_SIDE",
        },
      ];
    }
    case "DOUBLE_AGENT": {
      // Tek ofis, iki danışman (alıcı tarafı + satıcı tarafı)
      const totalAgentPool = agentOfOwn;          // ofiste danışmanlara giden pay
      const officeKeep = 100 - totalAgentPool;     // ofise kalan
      const buyerAgentShare = totalAgentPool * (buyerSide / 100);
      const sellerAgentShare = totalAgentPool - buyerAgentShare;
      return [
        { id: uid(), label: "Bizim Ofis", type: "PERCENT", value: officeKeep, category: "OFFICE" },
        {
          id: uid(),
          label: buyerAgent?.name ? `${buyerAgent.name} (alıcı tarafı)` : "Alıcı tarafı danışman",
          type: "PERCENT",
          value: buyerAgentShare,
          payeeUserId: buyerAgent?.id ?? null,
          category: "AGENT_BUYER_SIDE",
        },
        {
          id: uid(),
          label: sellerAgent?.name ? `${sellerAgent.name} (satıcı tarafı)` : "Satıcı tarafı danışman",
          type: "PERCENT",
          value: sellerAgentShare,
          payeeUserId: sellerAgent?.id ?? null,
          category: "AGENT_SELLER_SIDE",
        },
      ];
    }
    case "COBROKER_DOUBLE": {
      // Hem co-broker hem çift danışman: önce ikiye, sonra bizim taraftan iki danışman
      const ownPool = own;                           // bizim ofise gelen
      const ownAgentPool = ownPool * (agentOfOwn / 100);
      const ownOffice = ownPool - ownAgentPool;
      const buyerAgentShare = ownAgentPool * (buyerSide / 100);
      const sellerAgentShare = ownAgentPool - buyerAgentShare;
      return [
        { id: uid(), label: "Partner Ofis", type: "PERCENT", value: partner, category: "PARTNER_OFFICE" },
        { id: uid(), label: "Bizim Ofis", type: "PERCENT", value: ownOffice, category: "OFFICE" },
        {
          id: uid(),
          label: buyerAgent?.name ? `${buyerAgent.name} (alıcı tarafı)` : "Alıcı tarafı danışman",
          type: "PERCENT",
          value: buyerAgentShare,
          payeeUserId: buyerAgent?.id ?? null,
          category: "AGENT_BUYER_SIDE",
        },
        {
          id: uid(),
          label: sellerAgent?.name ? `${sellerAgent.name} (satıcı tarafı)` : "Satıcı tarafı danışman",
          type: "PERCENT",
          value: sellerAgentShare,
          payeeUserId: sellerAgent?.id ?? null,
          category: "AGENT_SELLER_SIDE",
        },
      ];
    }
  }
}

// ============== AUTOCOMPLETE ==============

function PropertySearch({
  selected,
  onChange,
}: {
  selected: PropertyOpt | null;
  onChange: (p: PropertyOpt | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PropertyOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      setLoading(true);
      const res = await fetch(`/api/properties?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.properties || []);
      }
      setLoading(false);
    }, 250);
  }, [query, selected]);

  if (selected) {
    return (
      <div className="bg-secondary-container/40 rounded-xl p-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />{selected.title}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {selected.listingType} · {formatTRY(selected.price, selected.currency)}
            {(selected.district || selected.city) && ` · ${[selected.district, selected.city].filter(Boolean).join(", ")}`}
            {selected.branch?.name && ` · ${selected.branch.name}`}
          </p>
        </div>
        <button onClick={() => { onChange(null); setQuery(""); }} className="text-on-surface-variant hover:text-error">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="İlan ara (başlık / şehir / ilçe)..."
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
          {results.map((p) => (
            <button key={p.id} onClick={() => { onChange(p); setOpen(false); setResults([]); }}
              className="w-full text-left px-3 py-2.5 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0">
              <p className="text-sm font-bold text-on-surface">{p.title}</p>
              <p className="text-xs text-on-surface-variant">
                {p.listingType} · {formatTRY(p.price, p.currency)}
                {(p.district || p.city) && ` · ${[p.district, p.city].filter(Boolean).join(", ")}`}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerSearch({
  label,
  selected,
  onChange,
  filterCustomerTypes,
}: {
  label: string;
  selected: CustomerOpt | null;
  onChange: (c: CustomerOpt | null) => void;
  filterCustomerTypes?: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      setLoading(true);
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        let list = (data.customers || []) as CustomerOpt[];
        if (filterCustomerTypes && filterCustomerTypes.length > 0) {
          list = list.filter((c) => filterCustomerTypes.includes(c.customerType));
        }
        setResults(list);
      }
      setLoading(false);
    }, 250);
  }, [query, selected, filterCustomerTypes]);

  if (selected) {
    return (
      <div className="bg-secondary-container/40 rounded-xl p-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />{customerLabel(selected)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">{selected.customerType}</p>
        </div>
        <button onClick={() => { onChange(null); setQuery(""); }} className="text-on-surface-variant hover:text-error">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={`${label} ara (ad / telefon)...`}
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
          {results.map((c) => (
            <button key={c.id} onClick={() => { onChange(c); setOpen(false); setResults([]); }}
              className="w-full text-left px-3 py-2.5 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0">
              <p className="text-sm font-bold text-on-surface">{customerLabel(c)}</p>
              <p className="text-xs text-on-surface-variant">{c.customerType}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== PAGE ==============

export default function CommissionCalculatorPage() {
  const router = useRouter();

  // Eşleştirme
  const [property, setProperty] = useState<PropertyOpt | null>(null);
  const [customer, setCustomer] = useState<CustomerOpt | null>(null);   // alıcı / kiracı
  const [ownerCust, setOwnerCust] = useState<CustomerOpt | null>(null); // mülk sahibi (opsiyonel)

  // Politika
  const [policy, setPolicy] = useState<CommissionPolicy | null>(null);

  // Hesaplama girdileri
  const [txType, setTxType] = useState<TxType>("SATIS");
  const [amountStr, setAmountStr] = useState("");
  const [buyerRateStr, setBuyerRateStr] = useState("2");
  const [sellerRateStr, setSellerRateStr] = useState("2");
  const [tenantRateStr, setTenantRateStr] = useState("100");
  const [landlordRateStr, setLandlordRateStr] = useState("0");
  const [includeVAT, setIncludeVAT] = useState(true);
  const [vatRateStr, setVatRateStr] = useState("20");

  // Şablon ve paylaşım
  const [template, setTemplate] = useState<PayoutTemplate>("CLASSIC");
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [buyerAgent, setBuyerAgent] = useState<UserOpt | null>(null);
  const [sellerAgent, setSellerAgent] = useState<UserOpt | null>(null);

  // Kullanıcı listesi (paylaşım için)
  const [users, setUsers] = useState<UserOpt[]>([]);

  // Kayıt
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Politikayı + kullanıcıları yükle
  useEffect(() => {
    fetch("/api/commission-policy")
      .then((r) => (r.ok ? r.json() : null))
      .then((p: CommissionPolicy | null) => {
        if (!p) return;
        setPolicy(p);
        setBuyerRateStr(String(p.salesBuyerRate));
        setSellerRateStr(String(p.salesSellerRate));
        setTenantRateStr(String(p.rentTenantRate));
        setLandlordRateStr(String(p.rentLandlordRate));
        setVatRateStr(String(p.vatRate));
        setIncludeVAT(p.vatIncludedDefault);
        setTemplate(p.payoutTemplate);
      });
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setUsers(data.filter((u: { isActive: boolean }) => u.isActive));
      });
  }, []);

  // İlan seçilince işlem tipi + tutar + alıcı tarafı danışmanı ön-doldur
  useEffect(() => {
    if (!property) return;
    const isRent = property.listingType === "KIRALIK" || property.listingType.toUpperCase().includes("KIRALIK");
    setTxType(isRent ? "KIRA" : "SATIS");
    setAmountStr(String(property.price));
    if (property.assignedAgent && !buyerAgent) {
      setBuyerAgent({ id: property.assignedAgent.id, name: property.assignedAgent.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property]);

  // Şube seçilirse şube politikasını yükle
  useEffect(() => {
    // Şu an global politika yeterli; şube override ileride eklenebilir
  }, []);

  // Şablon veya seçilen danışman değişince paylaşım kalemlerini yeniden üret
  useEffect(() => {
    if (!policy) return;
    setShares(buildDefaultShares(template, policy, buyerAgent, sellerAgent));
     
  }, [template, policy, buyerAgent, sellerAgent]);

  // ============== HESAP ==============

  const amount = parseFloat(amountStr) || 0;
  const buyerRate = parseFloat(buyerRateStr) || 0;
  const sellerRate = parseFloat(sellerRateStr) || 0;
  const tenantRate = parseFloat(tenantRateStr) || 0;
  const landlordRate = parseFloat(landlordRateStr) || 0;
  const vatRate = parseFloat(vatRateStr) || 0;

  const grossCommission = txType === "SATIS"
    ? (amount * buyerRate / 100) + (amount * sellerRate / 100)
    : (amount * tenantRate / 100) + (amount * landlordRate / 100);
  const vat = includeVAT ? grossCommission * (vatRate / 100) : 0;
  const totalCommission = grossCommission + vat;

  const distributable = grossCommission;

  // Önce sabit tutarlar düşülür, kalan üzerinden yüzde paylaşımı yapılır
  const fixedTotal = shares.filter((s) => s.type === "FIXED").reduce((sum, s) => sum + (s.value || 0), 0);
  const percentTotal = shares.filter((s) => s.type === "PERCENT").reduce((sum, s) => sum + (s.value || 0), 0);
  const remainingAfterFixed = Math.max(0, distributable - fixedTotal);

  const rows = shares.map((s) => {
    const computed = s.type === "FIXED"
      ? s.value
      : (remainingAfterFixed * s.value) / 100;
    return { ...s, computed };
  });
  const distributedTotal = rows.reduce((sum, r) => sum + r.computed, 0);
  const unallocated = distributable - distributedTotal;

  // Doğrulama
  const percentValid = Math.abs(percentTotal - 100) < 0.01;
  const fixedValid = fixedTotal <= distributable;

  // ============== AKSIYONLAR ==============

  function addShare(category: ShareItem["category"] = "OTHER") {
    setShares((arr) => [...arr, { id: uid(), label: "Yeni Kalem", type: "PERCENT", value: 0, category }]);
  }
  function updateShare(id: string, patch: Partial<ShareItem>) {
    setShares((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeShare(id: string) {
    setShares((arr) => arr.filter((s) => s.id !== id));
  }

  async function saveAsContract() {
    if (!property || !customer) {
      setSaveErr("Sözleşmeye dönüştürmek için ilan ve müşteri seçili olmalı");
      return;
    }
    setSaveErr("");
    setSaving(true);
    try {
      const startDate = new Date();
      const endDate = txType === "KIRA" ? new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

      const splitForJson = rows.map((r) => ({
        label: r.label,
        type: r.type,
        value: r.value,
        category: r.category,
        payeeUserId: r.payeeUserId ?? null,
        amount: r.computed,
      }));

      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType: txType,
          title: `${txType === "SATIS" ? "Satış" : "Kira"} - ${property.title}`,
          propertyId: property.id,
          customerId: customer.id,
          ownerCustomerId: ownerCust?.id || undefined,
          startDate: startDate.toISOString(),
          endDate: endDate ? endDate.toISOString() : undefined,
          amount,
          currency: property.currency || "TRY",
          commissionRate: txType === "SATIS" ? (buyerRate + sellerRate) : (tenantRate + landlordRate),
          commissionAmount: grossCommission,
          status: "DRAFT",
          notes: JSON.stringify({ template, vatRate, vatIncluded: includeVAT, distribution: splitForJson }),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveErr(d.error ? JSON.stringify(d.error) : "Sözleşme oluşturulamadı");
        setSaving(false);
        return;
      }
      const c = await res.json();
      router.push(`/contracts/${c.id}`);
    } catch {
      setSaveErr("Sunucu hatası");
      setSaving(false);
    }
  }

  // ============== RENDER ==============

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
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
              <p className="text-sm text-on-surface-variant">Eşleştirme + paylaşım + sözleşmeye dönüştür</p>
            </div>
          </div>
        </div>
        <Link href="/settings/commission" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
          <SettingsIcon className="w-3.5 h-3.5" />Politika ayarı
        </Link>
      </div>

      {/* EŞLEŞTİRME */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Eşleştirme</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-on-surface-variant mb-1">İlan</label>
            <PropertySearch selected={property} onChange={setProperty} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant mb-1">
              {txType === "SATIS" ? "Alıcı" : "Kiracı"}
            </label>
            <CustomerSearch label={txType === "SATIS" ? "Alıcı" : "Kiracı"} selected={customer} onChange={setCustomer} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Mülk Sahibi (ops.)</label>
            <CustomerSearch label="Mülk Sahibi" selected={ownerCust} onChange={setOwnerCust} />
          </div>
        </div>
      </div>

      {/* HESAPLAMA GİRDİLERİ */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Hesaplama</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["SATIS", "KIRA"] as const).map((t) => (
            <button key={t} onClick={() => setTxType(t)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                txType === t ? "bg-primary text-white shadow" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}>
              {t === "SATIS" ? "Satış" : "Kira"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant mb-1">
              {txType === "SATIS" ? "Satış Bedeli" : "Aylık Kira"} (₺)
            </label>
            <input type="number" value={amountStr} onChange={(e) => setAmountStr(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {txType === "SATIS" ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Alıcı %</label>
                  <input type="number" step="0.1" value={buyerRateStr} onChange={(e) => setBuyerRateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Satıcı %</label>
                  <input type="number" step="0.1" value={sellerRateStr} onChange={(e) => setSellerRateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Kiracı %</label>
                  <input type="number" step="0.1" value={tenantRateStr} onChange={(e) => setTenantRateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Mülk Sahibi %</label>
                  <input type="number" step="0.1" value={landlordRateStr} onChange={(e) => setLandlordRateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={includeVAT} onChange={(e) => setIncludeVAT(e.target.checked)}
              className="w-4 h-4 accent-primary" />
            KDV dahil
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">KDV oranı:</span>
            <input type="number" step="0.1" value={vatRateStr} onChange={(e) => setVatRateStr(e.target.value)}
              className="w-20 px-3 py-1.5 bg-surface-container-low rounded-lg text-sm border-none outline-none" />
            <span className="text-xs text-on-surface-variant">%</span>
          </div>
        </div>
      </div>

      {/* KOMİSYON ÖZETİ */}
      <div className="bg-primary text-on-primary rounded-3xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-3">Toplam Komisyon</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] opacity-80">Brüt</p>
            <p className="text-xl font-black">{formatTRY(grossCommission)}</p>
          </div>
          <div>
            <p className="text-[10px] opacity-80">KDV ({includeVAT ? `%${vatRate}` : "yok"})</p>
            <p className="text-xl font-black">{formatTRY(vat)}</p>
          </div>
          <div>
            <p className="text-[10px] opacity-80">Toplam</p>
            <p className="text-xl font-black">{formatTRY(totalCommission)}</p>
          </div>
        </div>
      </div>

      {/* PAYLAŞIM */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Paylaşım</h2>
          <div className="flex flex-wrap gap-2">
            {(["CLASSIC", "COBROKER", "DOUBLE_AGENT", "COBROKER_DOUBLE"] as PayoutTemplate[]).map((t) => (
              <button key={t} onClick={() => setTemplate(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  template === t ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                )}>
                {t === "CLASSIC" ? "Klasik" : t === "COBROKER" ? "Co-broker" : t === "DOUBLE_AGENT" ? "Çift Danışman" : "Co-broker + Çift"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Alıcı tarafı danışman (ops.)</label>
            <select value={buyerAgent?.id || ""}
              onChange={(e) => setBuyerAgent(users.find((u) => u.id === e.target.value) || null)}
              className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-sm border-none outline-none">
              <option value="">— Yok —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          {(template === "DOUBLE_AGENT" || template === "COBROKER_DOUBLE") && (
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Satıcı tarafı danışman</label>
              <select value={sellerAgent?.id || ""}
                onChange={(e) => setSellerAgent(users.find((u) => u.id === e.target.value) || null)}
                className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-sm border-none outline-none">
                <option value="">— Yok —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Kalemler tablosu */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20">
                {["Kalem", "Tip", "Değer", "Hesaplanan", ""].map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/10">
                  <td className="py-2 px-2 w-1/3">
                    <input value={r.label} onChange={(e) => updateShare(r.id, { label: e.target.value })}
                      className="w-full px-2 py-1.5 bg-surface-container-low rounded-lg text-sm border-none outline-none" />
                    {r.payeeUserId && (
                      <p className="text-[9px] text-primary mt-1">→ {users.find((u) => u.id === r.payeeUserId)?.name || "kullanıcı"}</p>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <select value={r.type} onChange={(e) => updateShare(r.id, { type: e.target.value as ShareType })}
                      className="px-2 py-1.5 bg-surface-container-low rounded-lg text-sm border-none outline-none">
                      <option value="PERCENT">%</option>
                      <option value="FIXED">₺ sabit</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" step="0.1" value={r.value}
                      onChange={(e) => updateShare(r.id, { value: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 bg-surface-container-low rounded-lg text-sm border-none outline-none text-right" />
                  </td>
                  <td className="py-2 px-2 text-sm font-bold text-on-surface text-right">{formatTRY(r.computed)}</td>
                  <td className="py-2 px-2">
                    <button onClick={() => removeShare(r.id)} className="text-on-surface-variant hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="py-2 px-2 text-xs text-on-surface-variant">
                  Toplam %: <span className={cn("font-black", percentValid ? "text-green-600" : "text-error")}>{percentTotal.toFixed(2)}%</span>
                  {!percentValid && <span className="ml-1 text-error">(100 olmalı)</span>}
                </td>
                <td className="py-2 px-2 text-right text-xs text-on-surface-variant">Dağıtılan:</td>
                <td className="py-2 px-2 text-right text-sm font-black">{formatTRY(distributedTotal)}</td>
                <td></td>
              </tr>
              {Math.abs(unallocated) > 0.5 && (
                <tr>
                  <td colSpan={3} className="py-2 px-2 text-xs text-on-surface-variant">
                    {unallocated > 0 ? "Dağıtılmayan kalan:" : "Aşım (negatif kalan):"}
                  </td>
                  <td className={cn("py-2 px-2 text-right text-sm font-black", unallocated < 0 ? "text-error" : "text-tertiary")}>
                    {formatTRY(unallocated)}
                  </td>
                  <td></td>
                </tr>
              )}
              {!fixedValid && (
                <tr>
                  <td colSpan={5} className="py-2 px-2 text-xs text-error">
                    ⚠ Sabit tutarlar toplamı brüt komisyondan büyük; oranlar negatif çıkar.
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => addShare("OFFICE")}
            className="text-xs font-bold text-primary px-3 py-1.5 bg-primary-fixed rounded-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-3 h-3" />Ofis
          </button>
          <button onClick={() => addShare("PARTNER_OFFICE")}
            className="text-xs font-bold text-primary px-3 py-1.5 bg-primary-fixed rounded-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-3 h-3" />Partner Ofis
          </button>
          <button onClick={() => addShare("AGENT_BUYER_SIDE")}
            className="text-xs font-bold text-primary px-3 py-1.5 bg-primary-fixed rounded-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-3 h-3" />Danışman
          </button>
          <button onClick={() => addShare("REFERRAL")}
            className="text-xs font-bold text-primary px-3 py-1.5 bg-primary-fixed rounded-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-3 h-3" />Referans
          </button>
          <button onClick={() => addShare("OTHER")}
            className="text-xs font-bold text-primary px-3 py-1.5 bg-primary-fixed rounded-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-3 h-3" />Boş Kalem
          </button>
        </div>

        <p className="text-[10px] text-on-surface-variant flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Sabit tutarlı kalemler önce brütten düşülür; yüzdeli kalemler kalan üzerinden hesaplanır. Yüzdeler toplamı %100 olmalı.
        </p>
      </div>

      {/* KAYDET */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-on-surface-variant">
          Hesabı sözleşmeye dönüştürdüğünüzde DRAFT olarak kaydedilir; sözleşmeyi onayladığınızda mülk ve müşteri durumu otomatik güncellenir.
        </div>
        <div className="flex items-center gap-3">
          {saveErr && <span className="text-xs text-error font-bold">{saveErr}</span>}
          <button
            onClick={saveAsContract}
            disabled={saving || !property || !customer}
            className="px-6 py-3 primary-gradient text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            Sözleşme Olarak Kaydet (DRAFT)
          </button>
        </div>
      </div>
    </motion.div>
  );
}
