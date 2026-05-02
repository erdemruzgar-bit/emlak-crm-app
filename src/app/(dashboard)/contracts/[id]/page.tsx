"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSignature,
  ArrowLeft,
  Calendar,
  Home,
  User as UserIcon,
  Phone,
  Trash2,
  FileText,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { DocumentUploader, DocumentItem } from "@/components/ui/document-uploader";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: string;
  uploadedAt: string;
  uploadedBy: { name: string };
}

interface Contract {
  id: string;
  contractType: "KIRA" | "SATIS" | "KOMISYON";
  title: string;
  amount: number;
  currency: string;
  depositAmount: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  startDate: string;
  endDate: string | null;
  signedAt: string | null;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "RENEWED" | "TERMINATED";
  notes: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    address: string | null;
    city: string | null;
    district: string | null;
    listingType: string;
    propertyType: string;
  } | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  } | null;
  ownerCustomer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  createdBy: { id: string; name: string };
  attachments: Attachment[];
}

const typeLabels: Record<string, string> = { KIRA: "Kira", SATIS: "Satış", KOMISYON: "Komisyon" };
const statusLabels: Record<string, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Aktif",
  EXPIRED: "Süresi Doldu",
  RENEWED: "Yenilendi",
  TERMINATED: "Feshedildi",
};
const categoryLabels: Record<string, string> = {
  KONTRAT_PDF: "Kontrat PDF",
  KOMISYON_SOZLESMESI: "Komisyon Sözleşmesi",
  TAPU: "Tapu",
  KIMLIK: "Kimlik",
  DEPOZITO_DEKONTU: "Depozito Dekontu",
  EK_DOKUMAN: "Ek Doküman",
};

const distributionCategoryLabels: Record<string, string> = {
  OFFICE: "Bizim Ofis",
  PARTNER_OFFICE: "Partner Ofis",
  AGENT_BUYER_SIDE: "Alıcı Tarafı Danışman",
  AGENT_SELLER_SIDE: "Satıcı Tarafı Danışman",
  REFERRAL: "Yönlendirme",
  OTHER: "Diğer",
};

const templateLabels: Record<string, string> = {
  CLASSIC: "Klasik (Tek Ofis)",
  COBROKER: "Co-Broker (İki Ofis)",
  DOUBLE_AGENT: "Çift Danışman",
  COBROKER_DOUBLE: "Co-Broker + Çift Danışman",
};

interface DistributionItem {
  label: string;
  type: "PERCENT" | "FIXED";
  value: number;
  category: string;
  payeeUserId: string | null;
  amount: number;
}

interface CommissionNotes {
  template?: string;
  vatRate?: number;
  vatIncluded?: boolean;
  distribution?: DistributionItem[];
}

function parseCommissionNotes(notes: string | null): CommissionNotes | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.distribution)) {
      return parsed as CommissionNotes;
    }
  } catch {
    // not JSON, treat as plain text
  }
  return null;
}

const attachmentCategoryOptions = [
  { value: "KONTRAT_PDF", label: "Kontrat PDF" },
  { value: "KOMISYON_SOZLESMESI", label: "Komisyon Sözleşmesi" },
  { value: "TAPU", label: "Tapu" },
  { value: "KIMLIK", label: "Kimlik" },
  { value: "DEPOZITO_DEKONTU", label: "Depozito Dekontu" },
  { value: "EK_DOKUMAN", label: "Ek Doküman" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newAttachments, setNewAttachments] = useState<DocumentItem[]>([]);
  const [savingAttachments, setSavingAttachments] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/contracts/${id}`);
    if (res.ok) {
      setContract(await res.json());
    } else {
      const data = await res.json();
      setError(data.error || "Sözleşme yüklenemedi");
    }
    setLoading(false);
  }

  async function changeStatus(status: string) {
    const res = await fetch(`/api/contracts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

  async function deleteContract() {
    if (!confirm("Bu sözleşmeyi silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/contracts");
  }

  async function uploadNewAttachments() {
    if (newAttachments.length === 0) return;
    setSavingAttachments(true);
    for (const att of newAttachments) {
      await fetch(`/api/contracts/${id}/attachments`, {
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
    setNewAttachments([]);
    setUploadOpen(false);
    setSavingAttachments(false);
    load();
  }

  async function deleteAttachment(attachmentId: string) {
    if (!confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/contracts/${id}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    if (res.ok) load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-error">{error || "Sözleşme bulunamadı"}</p>
        <Link href="/contracts" className="text-sm font-bold text-primary mt-4 inline-block">
          ← Sözleşmeler
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-on-surface">{contract.title}</h1>
                <span className="px-2.5 py-1 bg-primary-fixed text-primary text-[10px] font-black uppercase rounded-full">
                  {typeLabels[contract.contractType]}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant">
                Oluşturan: {contract.createdBy.name} · {formatDate(contract.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={deleteContract}
          className="px-4 py-2 bg-error-container text-on-error-container rounded-xl text-sm font-bold hover:opacity-90 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Sil
        </button>
      </div>

      {/* DRAFT uyarı bandı: kullanıcıya net yönlendirme + ACTIVE'in etkilerini açıkla */}
      {contract.status === "DRAFT" && (
        <div className="bg-tertiary-fixed border border-tertiary/20 rounded-3xl p-5 flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-2xl bg-tertiary/20 flex items-center justify-center text-tertiary shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm font-black text-tertiary mb-1">Bu sözleşme henüz Taslak durumunda</p>
            <p className="text-xs text-on-surface leading-relaxed">
              <strong>Aktif Yap</strong> dediğinizde otomatik olarak:
              {contract.contractType === "KIRA" && " ilan durumu Kiralandı, müşteri tipi Kiracı olur."}
              {contract.contractType === "SATIS" && " ilan durumu Satıldı, müşteri tipi Ev Sahibi olur."}
              {contract.contractType === "KOMISYON" && " sadece sözleşme aktive olur (ilan/müşteri durumu değişmez)."}
            </p>
          </div>
          <button
            onClick={() => changeStatus("ACTIVE")}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-tertiary text-on-tertiary hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
          >
            <CheckCircle className="w-4 h-4" />
            Aktif Yap
          </button>
        </div>
      )}

      {/* Status */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">Durum</p>
            <p className="text-xl font-black text-on-surface">{statusLabels[contract.status]}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["DRAFT", "ACTIVE", "EXPIRED", "RENEWED", "TERMINATED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={contract.status === s}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  contract.status === s
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* İlişkili Kayıtlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contract.property && (
          <Link
            href={`/properties/${contract.property.id}`}
            className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)] hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Mülk</p>
            </div>
            <p className="text-sm font-bold text-on-surface">{contract.property.title}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              {[contract.property.city, contract.property.district].filter(Boolean).join(" / ") || "—"}
            </p>
          </Link>
        )}
        {contract.customer && (
          <Link
            href={`/customers/${contract.customer.id}`}
            className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)] hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                {contract.contractType === "KIRA" ? "Kiracı" : contract.contractType === "SATIS" ? "Alıcı" : "Müşteri"}
              </p>
            </div>
            <p className="text-sm font-bold text-on-surface">
              {contract.customer.firstName} {contract.customer.lastName}
            </p>
            {contract.customer.phone && (
              <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> {contract.customer.phone}
              </p>
            )}
          </Link>
        )}
        {contract.ownerCustomer && (
          <Link
            href={`/customers/${contract.ownerCustomer.id}`}
            className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)] hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-tertiary" />
              <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Mülk Sahibi</p>
            </div>
            <p className="text-sm font-bold text-on-surface">
              {contract.ownerCustomer.firstName} {contract.ownerCustomer.lastName}
            </p>
            {contract.ownerCustomer.phone && (
              <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> {contract.ownerCustomer.phone}
              </p>
            )}
          </Link>
        )}
      </div>

      {/* Finansal */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
        <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant mb-4">Finansal Bilgiler</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-on-surface-variant">
              {contract.contractType === "KIRA" ? "Aylık Kira" : "Tutar"}
            </p>
            <p className="text-lg font-black text-on-surface mt-1">
              {contract.amount.toLocaleString("tr-TR")} {contract.currency}
            </p>
          </div>
          {contract.depositAmount !== null && (
            <div>
              <p className="text-xs text-on-surface-variant">Depozito</p>
              <p className="text-lg font-black text-on-surface mt-1">
                {contract.depositAmount.toLocaleString("tr-TR")} {contract.currency}
              </p>
            </div>
          )}
          {contract.commissionRate !== null && (
            <div>
              <p className="text-xs text-on-surface-variant">Komisyon Oranı</p>
              <p className="text-lg font-black text-on-surface mt-1">%{contract.commissionRate}</p>
            </div>
          )}
          {contract.commissionAmount !== null && (
            <div>
              <p className="text-xs text-on-surface-variant">Komisyon Tutarı</p>
              <p className="text-lg font-black text-primary mt-1">
                {contract.commissionAmount.toLocaleString("tr-TR")} {contract.currency}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tarihler */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
        <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant mb-4">Tarihler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-on-surface-variant mt-0.5" />
            <div>
              <p className="text-xs text-on-surface-variant">Başlangıç</p>
              <p className="text-sm font-bold text-on-surface">{formatDate(contract.startDate)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-on-surface-variant mt-0.5" />
            <div>
              <p className="text-xs text-on-surface-variant">Bitiş</p>
              <p className="text-sm font-bold text-on-surface">{formatDate(contract.endDate)}</p>
            </div>
          </div>
          {contract.signedAt && (
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-on-surface-variant mt-0.5" />
              <div>
                <p className="text-xs text-on-surface-variant">İmzalandı</p>
                <p className="text-sm font-bold text-on-surface">{formatDate(contract.signedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notlar / Komisyon Dağılımı */}
      {contract.notes && (() => {
        const commission = parseCommissionNotes(contract.notes);
        if (commission && commission.distribution) {
          const totalAmount = commission.distribution.reduce((sum, d) => sum + (d.amount || 0), 0);
          return (
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
              <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant mb-4">
                Komisyon Dağılımı
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {commission.template && (
                  <div className="px-3 py-2 bg-surface-container-low rounded-xl">
                    <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Şablon</p>
                    <p className="text-sm font-bold text-on-surface mt-0.5">
                      {templateLabels[commission.template] || commission.template}
                    </p>
                  </div>
                )}
                {commission.vatRate !== undefined && (
                  <div className="px-3 py-2 bg-surface-container-low rounded-xl">
                    <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">KDV</p>
                    <p className="text-sm font-bold text-on-surface mt-0.5">
                      %{commission.vatRate} {commission.vatIncluded ? "(dahil)" : "(hariç)"}
                    </p>
                  </div>
                )}
              </div>
              <ul className="space-y-2">
                {commission.distribution.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">{item.label}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {distributionCategoryLabels[item.category] || item.category}
                        {" · "}
                        {item.type === "PERCENT" ? `%${item.value}` : `Sabit ${item.value.toLocaleString("tr-TR")} ${contract.currency}`}
                      </p>
                    </div>
                    <p className="text-sm font-black text-primary shrink-0">
                      {item.amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {contract.currency}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Toplam</p>
                <p className="text-base font-black text-on-surface">
                  {totalAmount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {contract.currency}
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant mb-2">Notlar</h2>
            <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{contract.notes}</p>
          </div>
        );
      })()}

      {/* Ekler */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
            Ek Dokümanlar ({contract.attachments.length})
          </h2>
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            className="primary-gradient text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Doküman
          </button>
        </div>

        {uploadOpen && (
          <div className="mb-4 p-4 bg-surface-container-low rounded-2xl space-y-3">
            <DocumentUploader
              value={newAttachments}
              onChange={setNewAttachments}
              folder="contracts"
              categoryOptions={attachmentCategoryOptions}
            />
            {newAttachments.length > 0 && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setNewAttachments([]);
                    setUploadOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant"
                >
                  İptal
                </button>
                <button
                  onClick={uploadNewAttachments}
                  disabled={savingAttachments}
                  className="primary-gradient text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {savingAttachments ? "Kaydediliyor..." : `${newAttachments.length} dosyayı kaydet`}
                </button>
              </div>
            )}
          </div>
        )}

        {contract.attachments.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-8">Henüz doküman eklenmemiş</p>
        ) : (
          <ul className="space-y-2">
            {contract.attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{att.fileName}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {categoryLabels[att.category]} · {formatBytes(att.fileSize)} · {att.uploadedBy.name} ·{" "}
                    {formatDate(att.uploadedAt)}
                  </p>
                </div>
                <a
                  href={`/api/contracts/${id}/attachments/${att.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container"
                  title="İndir"
                >
                  <Download className="w-4 h-4 text-on-surface-variant" />
                </a>
                <button
                  onClick={() => deleteAttachment(att.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error-container"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4 text-on-surface-variant" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
