"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileSignature, ArrowLeft, Save, Calculator } from "lucide-react";
import { motion } from "motion/react";
import { DocumentUploader, DocumentItem } from "@/components/ui/document-uploader";

interface PropertyOption {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  listingType: string;
  ownerId: string | null;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  customerType: string;
}

const attachmentCategoryOptions = [
  { value: "KONTRAT_PDF", label: "Kontrat PDF" },
  { value: "KOMISYON_SOZLESMESI", label: "Komisyon Sözleşmesi" },
  { value: "TAPU", label: "Tapu" },
  { value: "KIMLIK", label: "Kimlik" },
  { value: "DEPOZITO_DEKONTU", label: "Depozito Dekontu" },
  { value: "EK_DOKUMAN", label: "Ek Doküman" },
];

const DEFAULT_CUSTOMER_TYPE_LABELS: Record<string, string> = {
  BUYER: "Alıcı",
  SELLER: "Satıcı",
  TENANT: "Kiracı",
  TENANT_CANDIDATE: "Kiracı Adayı",
  LANDLORD: "Mülk Sahibi",
};

export default function NewContractPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [contractType, setContractType] = useState<"KIRA" | "SATIS" | "KOMISYON">("KIRA");
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [ownerCustomerId, setOwnerCustomerId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [depositAmount, setDepositAmount] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<DocumentItem[]>([]);

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [typeCatalog, setTypeCatalog] = useState<
    { code: string; label: string; isTenantSide: boolean; isOwnerSide: boolean }[]
  >([]);

  const customerTypeLabels: Record<string, string> = {
    ...DEFAULT_CUSTOMER_TYPE_LABELS,
    ...Object.fromEntries(typeCatalog.map((t) => [t.code, t.label])),
  };
  const tenantSideCodes = new Set(typeCatalog.filter((t) => t.isTenantSide).map((t) => t.code));
  const ownerSideCodes = new Set(typeCatalog.filter((t) => t.isOwnerSide).map((t) => t.code));

  useEffect(() => {
    fetch("/api/properties?limit=1000")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.properties)
          ? data.properties
          : Array.isArray(data)
          ? data
          : [];
        setProperties(list);
      })
      .catch(() => setProperties([]));
    fetch("/api/customers?limit=1000")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data)
          ? data
          : [];
        setCustomers(list);
      })
      .catch(() => setCustomers([]));
    fetch("/api/customer-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setTypeCatalog(data);
      })
      .catch(() => setTypeCatalog([]));
  }, []);

  // URL query: ?propertyId=xxx veya ?customerId=xxx ile preset
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const pId = sp.get("propertyId");
    const cId = sp.get("customerId");
    if (pId) setPropertyId(pId);
    if (cId) setCustomerId(cId);
  }, []);

  // Property listesi geldiğinde, preset propertyId varsa sahibini otomatik doldur
  useEffect(() => {
    if (!propertyId || properties.length === 0 || ownerCustomerId) return;
    const prop = properties.find((p) => p.id === propertyId);
    if (prop?.ownerId) setOwnerCustomerId(prop.ownerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, properties]);

  // Müşteri tipine göre kiracı/alıcı vs sahip listesi (catalog flag'leri üzerinden)
  const tenantCandidates = customers.filter((c) => tenantSideCodes.has(c.customerType));
  const ownerCandidates = customers.filter((c) => ownerSideCodes.has(c.customerType));

  // Mülk seçilince, mülkün kayıtlı sahibini otomatik doldur
  function handlePropertyChange(newId: string) {
    setPropertyId(newId);
    if (!newId) return;
    const prop = properties.find((p) => p.id === newId);
    if (prop?.ownerId && !ownerCustomerId) {
      setOwnerCustomerId(prop.ownerId);
    }
  }

  // Komisyon otomatik hesaplama
  const calculatedCommission =
    amount && commissionRate
      ? (parseFloat(amount) * parseFloat(commissionRate)) / 100
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !amount) {
      setError("Başlık ve tutar zorunludur.");
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      contractType,
      title: title.trim(),
      startDate,
      amount: parseFloat(amount),
      currency,
    };
    if (propertyId) payload.propertyId = propertyId;
    if (customerId) payload.customerId = customerId;
    if (ownerCustomerId) payload.ownerCustomerId = ownerCustomerId;
    if (endDate) payload.endDate = endDate;
    if (depositAmount) payload.depositAmount = parseFloat(depositAmount);
    if (commissionRate) payload.commissionRate = parseFloat(commissionRate);
    if (calculatedCommission !== null) payload.commissionAmount = calculatedCommission;
    if (notes.trim()) payload.notes = notes.trim();

    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Sözleşme oluşturulamadı");
        setSaving(false);
        return;
      }

      const contract = await res.json();

      // Ekleri yükle
      for (const att of attachments) {
        await fetch(`/api/contracts/${contract.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: att.name,
            fileUrl: att.url,
            fileSize: att.size,
            mimeType: att.mimeType,
            category: att.category || "EK_DOKUMAN",
          }),
        });
      }

      router.push(`/contracts/${contract.id}`);
    } catch {
      setError("Bağlantı hatası");
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/contracts"
          className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center hover:bg-surface-container"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Yeni Sözleşme</h1>
            <p className="text-sm text-on-surface-variant">Kira, satış veya komisyon sözleşmesi</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tip seçimi */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
          <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-3">
            Sözleşme Tipi
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["KIRA", "SATIS", "KOMISYON"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setContractType(t)}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  contractType === t
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {t === "KIRA" ? "Kira" : t === "SATIS" ? "Satış" : "Komisyon"}
              </button>
            ))}
          </div>
        </div>

        {/* Temel bilgiler */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: AVRASYA 1 / D/01-026 Kira Sözleşmesi"
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Mülk
              </label>
              {properties.length === 0 ? (
                <div className="px-4 py-3 bg-surface-container-low rounded-xl text-sm text-on-surface-variant">
                  Kayıtlı mülk yok.{" "}
                  <Link href="/properties/new" className="text-primary font-bold hover:underline">
                    Yeni mülk ekle →
                  </Link>
                </div>
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seçiniz</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {p.city ? ` · ${p.city}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                {contractType === "KIRA" ? "Kiracı" : contractType === "SATIS" ? "Alıcı" : "Müşteri"}
              </label>
              {tenantCandidates.length === 0 ? (
                <div className="px-4 py-3 bg-surface-container-low rounded-xl text-sm text-on-surface-variant">
                  {contractType === "KIRA" ? "Kiracı" : "Alıcı"} tipinde müşteri yok.{" "}
                  <Link href="/customers/new" className="text-primary font-bold hover:underline">
                    Yeni müşteri ekle →
                  </Link>
                </div>
              ) : (
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seçiniz</option>
                  {tenantCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} · {customerTypeLabels[c.customerType]}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Mülk Sahibi (opsiyonel)
              </label>
              {ownerCandidates.length === 0 ? (
                <div className="px-4 py-3 bg-surface-container-low rounded-xl text-sm text-on-surface-variant">
                  Sahip/Satıcı tipinde müşteri yok.{" "}
                  <Link href="/customers/new" className="text-primary font-bold hover:underline">
                    Yeni müşteri ekle →
                  </Link>
                </div>
              ) : (
                <select
                  value={ownerCustomerId}
                  onChange={(e) => setOwnerCustomerId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seçiniz</option>
                  {ownerCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} · {customerTypeLabels[c.customerType]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tarih ve tutar */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                {contractType === "KIRA" ? "Bitiş Tarihi *" : "Bitiş Tarihi"}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                {contractType === "KIRA" ? "Aylık Kira" : contractType === "SATIS" ? "Satış Bedeli" : "Hizmet Bedeli"} *
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Para Birimi
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {contractType === "KIRA" && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                  Depozito
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Komisyon Oranı (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="2.0"
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
              {calculatedCommission !== null && (
                <p className="mt-2 text-xs font-bold text-primary flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  Komisyon: {calculatedCommission.toLocaleString("tr-TR")} {currency}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notlar */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
          <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
            Notlar
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Özel şartlar, müzakere notları..."
            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Eklentiler */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
          <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant mb-3">
            Ek Dokümanlar
          </h3>
          <p className="text-xs text-on-surface-variant mb-4">
            Kira kontratı PDF'i, komisyon sözleşmesi, tapu fotokopisi, kimlik vb.
          </p>
          <DocumentUploader
            value={attachments}
            onChange={setAttachments}
            folder="contracts"
            categoryOptions={attachmentCategoryOptions}
          />
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl p-4 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/contracts"
            className="px-5 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor..." : "Sözleşme Oluştur"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
