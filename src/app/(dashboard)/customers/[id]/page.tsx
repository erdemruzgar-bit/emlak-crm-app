"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, User, StickyNote, MessageCircle, ShieldCheck, Trash2, Loader2, UserX,
  Phone, Mail, Fingerprint, Tag, Globe, Headphones, Building2, MapPin, Calendar, Info,
  Send, PlusCircle, Target, Save, X, Pencil, CheckCircle, Clock, Home, Camera, Search,
  FileSignature, Plus, Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { cn } from "@/lib/utils";
import { EditableText, EditableSelect, EditableTextarea } from "@/components/ui/editable-field";
import { HelpButton } from "@/components/ui/help-button";
import { SafeImage } from "@/components/ui/safe-image";
import { DEFAULT_CUSTOMER_TYPE_LABELS } from "@/lib/customer-type-styles";

interface ActiveAccessSession {
  id: string;
  reasonCategory: string;
  reason: string;
  startedAt: string;
  fields: string[];
}

interface AccessSessionRecord {
  id: string;
  reasonCategory: string;
  reason: string;
  fields: string[];
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  startedAt: string;
  endedAt: string | null;
  ipAddress: string | null;
  user: { id: string; name: string; role: string };
  exitNote: { id: string; content: string; createdAt: string } | null;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  tcKimlikNo: string | null;
  // Hassas veri kapısı (KVKK) — AGENT için maskelenir
  phoneMasked?: string | null;
  emailMasked?: string | null;
  tcKimlikNoMasked?: string | null;
  sensitiveGated?: boolean;
  activeAccessSession?: ActiveAccessSession | null;
  address: string | null;
  customerType: string;
  source: string | null;
  photoUrl: string | null;
  assignedAgent: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  consents: Consent[];
  notes: Note[];
  interactions: Interaction[];
  createdAt: string;
  // Talep profili
  stage: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  budgetCurrency: string | null;
  urgency: string | null;
  desiredMoveDate: string | null;
  preferredTypes: string[];
  preferredCities: string[];
  preferredDistricts: string[];
  minArea: number | null;
  maxArea: number | null;
  minRooms: string | null;
  maxRooms: string | null;
  preferredFeatures: string[];
  financingMethod: string | null;
  preApprovalStatus: string | null;
  downPaymentPercent: number | null;
  tags: string[];
  notesSummary: string | null;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  interestedProjects?: InterestedProjectEntry[];
}

interface InterestedProjectEntry {
  id?: string;
  projectId?: string;
  createdAt?: string;
  note?: string | null;
  project: { id: string; name: string; code?: string | null; city?: string | null; district?: string | null };
}

interface Consent {
  id: string;
  consentType: string;
  consentText: string;
  isGranted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
}

interface Note {
  id: string;
  content: string;
  user: { name: string };
  createdAt: string;
}

interface Interaction {
  id: string;
  type: string;
  summary: string | null;
  user: { name: string };
  date: string;
}

interface Appointment {
  id: string;
  title: string;
  type: string;
  startDate: string;
  status: string;
  location: string | null;
  property: { id: string; title: string } | null;
}

interface PropertyMatchResult {
  id: string;
  matchScore: number | null;
  status: "SUGGESTED" | "INTERESTED" | "REJECTED";
  property: {
    id: string;
    title: string;
    price: number;
    currency: string;
    propertyType: string;
    listingType: string;
    city: string | null;
    district: string | null;
    area: number | null;
    rooms: string | null;
    status: string;
    images: { url: string }[];
  };
}

const DEFAULT_TYPE_LABELS = DEFAULT_CUSTOMER_TYPE_LABELS;
const consentLabels: Record<string, string> = { ACIK_RIZA: "Açık Rıza", AYDINLATMA: "Aydınlatma Metni", PAZARLAMA: "Pazarlama İzni" };
const interactionLabels: Record<string, string> = { CALL: "Telefon", EMAIL: "E-posta", VISIT: "Ziyaret", WHATSAPP: "WhatsApp" };
const interactionIcons: Record<string, React.ComponentType<{ className?: string }>> = { CALL: Phone, EMAIL: Mail, VISIT: MapPin, WHATSAPP: MessageCircle };

const tabs = [
  { key: "info", label: "Bilgiler", icon: User },
  { key: "demand", label: "Talep Profili", icon: Target },
  { key: "notes", label: "Notlar", icon: StickyNote },
  { key: "interactions", label: "İletişim", icon: MessageCircle },
  { key: "appointments", label: "Randevular", icon: Calendar },
  { key: "matches", label: "İlgili İlanlar", icon: Home },
  { key: "contracts", label: "Sözleşmeler", icon: FileSignature },
  { key: "kvkk", label: "KVKK Rızaları", icon: ShieldCheck },
  { key: "access", label: "Erişim Geçmişi", icon: Clock },
] as const;

const ACCESS_REASON_OPTIONS = [
  { code: "GORUSME", label: "Görüşme / Arama" },
  { code: "TAKIP", label: "Takip / Hatırlatma" },
  { code: "TEKLIF", label: "Teklif Hazırlama" },
  { code: "SOZLESME", label: "Sözleşme İşlemi" },
  { code: "DIGER", label: "Diğer" },
];
const ACCESS_REASON_LABELS: Record<string, string> = Object.fromEntries(
  ACCESS_REASON_OPTIONS.map((o) => [o.code, o.label])
);

interface CustomerContract {
  id: string;
  contractType: "KIRA" | "SATIS" | "KOMISYON";
  title: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "RENEWED" | "TERMINATED";
  startDate: string;
  endDate: string | null;
  property: { id: string; title: string } | null;
  _count: { attachments: number };
}

const stageLabels: Record<string, string> = { LEAD: "Aday", QUALIFIED: "Nitelikli", ACTIVE: "Aktif Takip", SHOWING: "Gösterimde", OFFER: "Teklif Aşaması", CONTRACT: "Sözleşme Aşaması", CLOSED: "Kazanıldı", LOST: "Kaybedildi" };
const stageColors: Record<string, string> = { LEAD: "bg-surface-container text-on-surface-variant", QUALIFIED: "bg-secondary-container text-on-secondary-container", ACTIVE: "bg-primary-fixed text-primary", SHOWING: "bg-tertiary-fixed text-tertiary", OFFER: "bg-tertiary-container text-on-tertiary-container", CONTRACT: "bg-primary-container text-on-primary-container", CLOSED: "bg-green-100 text-green-700", LOST: "bg-error-container text-on-error-container" };
const urgencyLabels: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" };
const urgencyColors: Record<string, string> = { LOW: "bg-green-100 text-green-700", MEDIUM: "bg-surface-container text-on-surface-variant", HIGH: "bg-tertiary-fixed text-tertiary", URGENT: "bg-error-container text-on-error-container" };
const propertyTypeOptions = ["DAIRE", "VILLA", "ARSA", "ISYERI", "MUSTAKILEV"];
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil Ev" };
const featureOptions = ["Otopark", "Havuz", "Asansör", "Balkon", "Güvenlik", "Bahçe", "Ebeveyn Banyosu", "Manzara", "Metro Yakın", "Okul Yakın"];
// Oda kavramı olan mülk tipleri (ARSA hariç)
const TYPES_WITH_ROOMS = new Set(["DAIRE", "VILLA", "MUSTAKILEV", "ISYERI"]);

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const confirm = useConfirm();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "demand" | "notes" | "interactions" | "appointments" | "matches" | "contracts" | "kvkk" | "access">("info");
  // Hassas veri erişim kapısı (KVKK)
  const [revealModal, setRevealModal] = useState<{ field: "phone" | "email" | "tc"; reasonCategory: string; reason: string; saving: boolean; error: string | null } | null>(null);
  const [exitModal, setExitModal] = useState<{ note: string; saving: boolean; error: string | null; pendingNav: string | null } | null>(null);
  const [accessHistory, setAccessHistory] = useState<AccessSessionRecord[]>([]);
  const [accessHistoryLoading, setAccessHistoryLoading] = useState(false);
  const [contracts, setContracts] = useState<CustomerContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatchResult[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; role: string; isActive: boolean; branch: { name: string } | null }[]>([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<Array<{ id: string; title: string; price: number; currency: string; city: string | null; district: string | null; propertyType: string }>>([]);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [demandSaving, setDemandSaving] = useState(false);
  const [demandSaved, setDemandSaved] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [customerTypeOptions, setCustomerTypeOptions] = useState<{ code: string; label: string }[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string; code?: string | null; city?: string | null; district?: string | null }[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProjectOptions(data);
      })
      .catch(() => setProjectOptions([]));
  }, []);

  const filteredProjectOptions = useMemo(() => {
    if (!customer) return [];
    const selectedIds = new Set((customer.interestedProjects || []).map((p) => p.project.id));
    const term = projectSearch.trim().toLowerCase();
    return projectOptions
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => {
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          (p.code ?? "").toLowerCase().includes(term) ||
          (p.city ?? "").toLowerCase().includes(term)
        );
      })
      .slice(0, 12);
  }, [projectOptions, customer, projectSearch]);

  const typeLabels: Record<string, string> = {
    ...DEFAULT_TYPE_LABELS,
    ...Object.fromEntries(customerTypeOptions.map((t) => [t.code, t.label])),
  };
  const [interactionType, setInteractionType] = useState("CALL");
  const [interactionSummary, setInteractionSummary] = useState("");
  const [interactionSaving, setInteractionSaving] = useState(false);

  useEffect(() => {
    // Paralel: müşteri detay + randevular + eşleşmeler + sözleşmeler
    setMatchesLoading(true);
    setAppointmentsLoading(true);
    setContractsLoading(true);
    Promise.all([
      fetch(`/api/customers/${params.id}`).then((r) => r.json()),
      fetch(`/api/appointments?customerId=${params.id}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/customers/${params.id}/matches`).then((r) => r.json()).catch(() => []),
      fetch(`/api/contracts?customerId=${params.id}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([cust, appts, matches, ctrs]) => {
      setCustomer(cust);
      setAppointments(Array.isArray(appts) ? appts : []);
      setPropertyMatches(Array.isArray(matches) ? matches : []);
      setContracts(Array.isArray(ctrs) ? ctrs : []);
      setLoading(false);
      setAppointmentsLoading(false);
      setMatchesLoading(false);
      setContractsLoading(false);
    }).catch(() => {
      setLoading(false);
      setAppointmentsLoading(false);
      setMatchesLoading(false);
      setContractsLoading(false);
    });
  }, [params.id]);

  const sessionUser = session?.user as unknown as { id?: string; role?: string } | undefined;
  const canEdit = useMemo(() => {
    if (!sessionUser || !customer) return false;
    if (sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER") return true;
    return customer.assignedAgent?.id === sessionUser.id;
  }, [sessionUser, customer]);
  const canAnonymize = sessionUser?.role === "ADMIN";
  const canReassign = sessionUser?.role === "ADMIN" || sessionUser?.role === "MANAGER"; // sadece m\u00fcd\u00fcr + admin

  useEffect(() => {
    if (canReassign && editingInfo && users.length === 0) {
      fetch("/api/users").then((r) => r.ok ? r.json() : []).then((data) => {
        if (Array.isArray(data)) setUsers(data.filter((u: { isActive: boolean }) => u.isActive));
      }).catch(() => {});
    }
  }, [canReassign, editingInfo, users.length]);

  useEffect(() => {
    fetch("/api/customer-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCustomerTypeOptions(data);
      })
      .catch(() => {});

    fetch("/api/room-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setRoomTypeOptions(data);
      })
      .catch(() => {});
  }, []);

  // Erişim geçmişi: tab açıldığında fetch et
  useEffect(() => {
    if (activeTab !== "access" || !customer) return;
    setAccessHistoryLoading(true);
    fetch(`/api/customers/${customer.id}/access-sessions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAccessHistory(Array.isArray(data) ? data : []))
      .catch(() => setAccessHistory([]))
      .finally(() => setAccessHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customer?.id]);

  // Aktif erişim oturumu varsa, sayfadan ayrılırken (tab kapatma / refresh) tarayıcıya uyarı bastır.
  // Servis arkaplanda beacon ile oturumu ABANDONED olarak işaretler.
  useEffect(() => {
    const active = customer?.activeAccessSession;
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      // Beacon: tab kapanırsa oturumu ABANDONED olarak yaz
      try {
        const blob = new Blob([JSON.stringify({ abandon: true })], { type: "application/json" });
        navigator.sendBeacon(`/api/customers/${customer!.id}/access-sessions/${active.id}`, blob);
      } catch {}
      e.preventDefault();
      e.returnValue = "Aktif bir erişim oturumunuz var. Sonuç notunuzu kaydetmediniz.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.activeAccessSession?.id, customer?.id]);

  // Müşterinin tercih ettiği tipler arasında oda kavramı olan en az bir tip varsa oda alanları görünür
  const showRoomFields = useMemo(() => {
    const types = customer?.preferredTypes ?? [];
    if (types.length === 0) return true;
    return types.some((t) => TYPES_WITH_ROOMS.has(t));
  }, [customer?.preferredTypes]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
    </div>
  );
  if (!customer) return (
    <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
      <UserX className="w-12 h-12 opacity-30 mb-4" /> Müşteri bulunamadı
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={(e) => {
              if (customer.activeAccessSession) {
                e.preventDefault();
                setExitModal({ note: "", saving: false, error: null, pendingNav: "BACK" });
              } else {
                router.push("/customers");
              }
            }}
            className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Avatar / Photo */}
          {customer.photoUrl ? (
            <SafeImage src={customer.photoUrl} alt={`${customer.firstName} ${customer.lastName}`} width={64} height={64}
              className="w-16 h-16 rounded-2xl object-cover object-top shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/70 flex items-center justify-center shadow-md">
              <span className="text-xl font-black text-white select-none">
                {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tighter text-on-surface">{customer.firstName} {customer.lastName}</h1>
              <HelpButton page="customers-detail" title="Müşteri Detayı" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium">{typeLabels[customer.customerType]}</p>
          </div>
        </div>
        {canAnonymize && (
          <button
            onClick={async () => {
              const ok = await confirm({
                title: "Müşteri verisini anonimleştir?",
                message: "KVKK Unutulma Hakkı kapsamında müşterinin kişisel bilgileri silinir, sözleşme/rapor bağları korunur. Bu işlem geri alınamaz.",
                tone: "danger",
                confirmText: "Anonimleştir",
              });
              if (!ok) return;
              const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
              if (res.ok) {
                toast.success("Müşteri verileri anonimleştirildi");
                router.push("/customers");
              } else {
                toast.error("İşlem başarısız");
              }
            }}
            className="px-5 py-3 text-sm text-error bg-error-container/30 hover:bg-error-container/50 rounded-xl transition-all font-bold flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Veriyi Anonimleştir
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === "notes" ? customer.notes.length : tab.key === "interactions" ? customer.interactions.length : tab.key === "appointments" ? appointments.length : tab.key === "matches" ? propertyMatches.length : tab.key === "contracts" ? contracts.length : null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === tab.key ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}{count != null ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "info" && (
          <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Kişisel Bilgiler</h3>
              {canEdit ? (
                <button onClick={() => { setEditingInfo(!editingInfo); setInfoSaved(false); }}
                  className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    editingInfo ? "bg-surface-container text-on-surface-variant" : "bg-primary-fixed text-primary hover:bg-primary-container"
                  )}>
                  {editingInfo ? <><X className="w-4 h-4" />İptal</> : <><Pencil className="w-4 h-4" />Düzenle</>}
                </button>
              ) : (
                <span className="text-xs text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-xl">
                  Sadece atanan danışman ({customer.assignedAgent?.name || "—"}) düzenleyebilir
                </span>
              )}
            </div>

            {/* Fotoğraf bölümü — her zaman aynı yerde; upload butonu sadece düzenleme modunda */}
            <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl min-h-[112px]">
              {customer.photoUrl ? (
                <SafeImage src={customer.photoUrl} alt="" width={80} height={80} className="w-20 h-20 rounded-2xl object-cover object-top shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/70 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-white select-none">
                    {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-1">Profil Fotoğrafı</p>
                <p className="text-sm font-bold text-on-surface">{customer.firstName} {customer.lastName}</p>
                {editingInfo && (
                  <div className="flex items-center gap-2 mt-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-white rounded-lg text-xs font-bold hover:bg-surface-container transition-all flex items-center gap-2 shadow-sm">
                      {photoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                      {photoUploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
                      <input type="file" accept="image/*" className="hidden" disabled={photoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setPhotoUploading(true);
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/upload", { method: "POST", body: fd });
                          if (res.ok) {
                            const data = await res.json();
                            setCustomer({ ...customer, photoUrl: data.url });
                          }
                          setPhotoUploading(false);
                        }} />
                    </label>
                    {customer.photoUrl && (
                      <button type="button" onClick={() => setCustomer({ ...customer, photoUrl: null })}
                        className="text-xs text-on-surface-variant hover:text-error transition-colors flex items-center gap-1">
                        <X className="w-3 h-3" /> Kaldır
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Alanlar: view+edit aynı layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditableText icon={User} label="Ad" editing={editingInfo}
                value={customer.firstName}
                onChange={(v) => setCustomer({ ...customer, firstName: v })} />
              <EditableText icon={User} label="Soyad" editing={editingInfo}
                value={customer.lastName}
                onChange={(v) => setCustomer({ ...customer, lastName: v })} />
              {(() => {
                const gated = customer.sensitiveGated === true;
                const phoneRevealed = !gated || customer.phone != null;
                const emailRevealed = !gated || customer.email != null;
                const tcRevealed = !gated || customer.tcKimlikNo != null;
                return (
                  <>
                    <SensitiveField
                      icon={Mail}
                      label="E-posta"
                      revealed={emailRevealed}
                      maskedValue={customer.emailMasked ?? null}
                      value={customer.email}
                      editable={editingInfo && emailRevealed}
                      type="email"
                      onChange={(v) => setCustomer({ ...customer, email: v })}
                      onReveal={() => setRevealModal({ field: "email", reasonCategory: "GORUSME", reason: "", saving: false, error: null })}
                    />
                    <SensitiveField
                      icon={Phone}
                      label="Telefon"
                      revealed={phoneRevealed}
                      maskedValue={customer.phoneMasked ?? null}
                      value={customer.phone}
                      editable={editingInfo && phoneRevealed}
                      type="tel"
                      onChange={(v) => setCustomer({ ...customer, phone: v })}
                      onReveal={() => setRevealModal({ field: "phone", reasonCategory: "GORUSME", reason: "", saving: false, error: null })}
                    />
                    <SensitiveField
                      icon={Fingerprint}
                      label="TC Kimlik No"
                      revealed={tcRevealed}
                      maskedValue={customer.tcKimlikNoMasked ?? null}
                      value={customer.tcKimlikNo}
                      editable={false}
                      onChange={() => {}}
                      onReveal={() => setRevealModal({ field: "tc", reasonCategory: "SOZLESME", reason: "", saving: false, error: null })}
                    />
                  </>
                );
              })()}
              <EditableSelect icon={Tag} label="Müşteri Tipi" editing={editingInfo}
                value={customer.customerType}
                onChange={(v) => setCustomer({ ...customer, customerType: v })}
                options={[
                  ...customerTypeOptions.map((t) => ({ value: t.code, label: t.label })),
                ]} />
              <EditableSelect icon={Globe} label="Kaynak" editing={editingInfo}
                value={customer.source}
                onChange={(v) => setCustomer({ ...customer, source: v || null })}
                options={[
                  { value: "referans", label: "Referans" },
                  { value: "internet", label: "İnternet" },
                  { value: "sahibinden", label: "Sahibinden.com" },
                  { value: "hepsiemlak", label: "Hepsiemlak" },
                  { value: "walkin", label: "Ofis Ziyareti" },
                  { value: "diger", label: "Diğer" },
                ]} />
              <EditableSelect icon={Headphones} label="Danışman" editing={editingInfo && canReassign}
                value={customer.assignedAgent?.id || ""}
                onChange={(id) => {
                  const u = users.find((x) => x.id === id);
                  setCustomer({ ...customer, assignedAgent: id ? { id, name: u?.name || "" } : null });
                }}
                options={users.length > 0
                  ? users.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.branch?.name ? ` · ${u.branch.name}` : ""}`,
                    }))
                  : customer.assignedAgent
                  ? [{ value: customer.assignedAgent.id, label: customer.assignedAgent.name }]
                  : []} />
              <EditableText icon={Building2} label="Şube" editing={false}
                value={customer.branch?.name}
                onChange={() => {}} />
              <EditableTextarea icon={MapPin} label="Adres" editing={editingInfo}
                value={customer.address}
                onChange={(v) => setCustomer({ ...customer, address: v || null })}
                className="sm:col-span-2" />
              <EditableText icon={Calendar} label="Kayıt Tarihi" editing={false}
                value={new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                onChange={() => {}} />
            </div>

            {/* Kaydet butonu yer rezerve eden sabit konteyner (yüksekliği değişmesin) */}
            <div className="flex justify-end min-h-[52px] items-center">
              {editingInfo && (
                <button onClick={async () => {
                  setInfoSaving(true);
                  try {
                    const res = await fetch(`/api/customers/${customer.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phone: customer.phone,
                        address: customer.address,
                        customerType: customer.customerType,
                        source: customer.source,
                        photoUrl: customer.photoUrl,
                        ...(canReassign ? { assignedAgentId: customer.assignedAgent?.id || null } : {}),
                      }),
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      const msg = typeof body.error === "string" ? body.error
                        : Array.isArray(body.error) ? (body.error[0]?.message || "Doğrulama hatası")
                        : `Sunucu hatası (${res.status})`;
                      toast.error(msg);
                      return;
                    }
                    const updated = await res.json();
                    setCustomer((prev) => prev ? { ...prev, ...updated } : updated);
                    setInfoSaved(true);
                    setEditingInfo(false);
                    toast.success("Bilgiler kaydedildi");
                    setTimeout(() => setInfoSaved(false), 2000);
                  } catch (err) {
                    console.error("Customer info save failed:", err);
                    toast.error("Bağlantı hatası — kaydedilemedi");
                  } finally {
                    setInfoSaving(false);
                  }
                }} disabled={infoSaving}
                  className={cn("px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
                    infoSaved ? "bg-green-100 text-green-700" : "primary-gradient text-white shadow-lg shadow-primary/10"
                  )}>
                  {infoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : infoSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {infoSaved ? "Kaydedildi!" : "Kaydet"}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "demand" && (
          <motion.div key="demand" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Aşama & Aciliyet */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
              <h3 className="text-sm font-bold text-on-surface">Müşteri Aşaması & Aciliyet</h3>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Aşama</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stageLabels).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setCustomer({ ...customer, stage: key })}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", customer.stage === key ? stageColors[key] + " ring-2 ring-primary/30" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container")}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Aciliyet</label>
                <div className="flex gap-2">
                  {Object.entries(urgencyLabels).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setCustomer({ ...customer, urgency: key })}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", customer.urgency === key ? urgencyColors[key] + " ring-2 ring-primary/30" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container")}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Sonraki Takip Tarihi</label>
                  <input type="date" value={customer.nextFollowUpDate?.split("T")[0] || ""} onChange={(e) => setCustomer({ ...customer, nextFollowUpDate: e.target.value || null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Taşınma Tarihi</label>
                  <input type="date" value={customer.desiredMoveDate?.split("T")[0] || ""} onChange={(e) => setCustomer({ ...customer, desiredMoveDate: e.target.value || null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Kısa Özet Not</label>
                <textarea value={customer.notesSummary || ""} onChange={(e) => setCustomer({ ...customer, notesSummary: e.target.value || null })} rows={2}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="Danışman için kısa özet..." />
              </div>
            </div>

            {/* Bütçe & Finansman */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
              <h3 className="text-sm font-bold text-on-surface">Bütçe & Finansman</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Min Bütçe (₺)</label>
                  <input type="number" value={customer.minBudget || ""} onChange={(e) => setCustomer({ ...customer, minBudget: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Max Bütçe (₺)</label>
                  <input type="number" value={customer.maxBudget || ""} onChange={(e) => setCustomer({ ...customer, maxBudget: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Finansman</label>
                  <select value={customer.financingMethod || ""} onChange={(e) => setCustomer({ ...customer, financingMethod: e.target.value || null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Seçiniz</option>
                    <option value="NAKIT">Nakit</option>
                    <option value="KREDI">Kredi</option>
                    <option value="TAKAS">Takas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Peşinat %</label>
                  <input type="number" min={0} max={100} value={customer.downPaymentPercent || ""} onChange={(e) => setCustomer({ ...customer, downPaymentPercent: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Ön Onay Durumu</label>
                <div className="flex gap-2">
                  {[{ key: "NONE", label: "Yok" }, { key: "PENDING", label: "Beklemede" }, { key: "APPROVED", label: "Onaylandı" }, { key: "REJECTED", label: "Reddedildi" }].map((opt) => (
                    <button key={opt.key} type="button" onClick={() => setCustomer({ ...customer, preApprovalStatus: opt.key })}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all",
                        customer.preApprovalStatus === opt.key ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      )}>{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mülk Tercihleri */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
              <h3 className="text-sm font-bold text-on-surface">Mülk Tercihleri</h3>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Mülk Tipi</label>
                <div className="flex flex-wrap gap-2">
                  {propertyTypeOptions.map((pt) => (
                    <button key={pt} type="button" onClick={() => {
                      const types = customer.preferredTypes || [];
                      setCustomer({ ...customer, preferredTypes: types.includes(pt) ? types.filter((t) => t !== pt) : [...types, pt] });
                    }} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      (customer.preferredTypes || []).includes(pt) ? "primary-gradient text-white shadow-sm" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    )}>{propertyTypeLabels[pt]}</button>
                  ))}
                </div>
              </div>
              <div className={cn("grid gap-4", showRoomFields ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Min m²</label>
                  <input type="number" value={customer.minArea || ""} onChange={(e) => setCustomer({ ...customer, minArea: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Max m²</label>
                  <input type="number" value={customer.maxArea || ""} onChange={(e) => setCustomer({ ...customer, maxArea: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                {showRoomFields && (
                  <>
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Min Oda Tipi</label>
                      <select value={customer.minRooms || ""} onChange={(e) => setCustomer({ ...customer, minRooms: e.target.value || null })}
                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm">
                        <option value="">Seçiniz</option>
                        {roomTypeOptions.map((rt) => (
                          <option key={rt.id} value={rt.name}>{rt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Max Oda Tipi</label>
                      <select value={customer.maxRooms || ""} onChange={(e) => setCustomer({ ...customer, maxRooms: e.target.value || null })}
                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm">
                        <option value="">Seçiniz</option>
                        {roomTypeOptions.map((rt) => (
                          <option key={rt.id} value={rt.name}>{rt.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">İstenen Özellikler</label>
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map((f) => (
                    <button key={f} type="button" onClick={() => {
                      const feats = customer.preferredFeatures || [];
                      setCustomer({ ...customer, preferredFeatures: feats.includes(f) ? feats.filter((x) => x !== f) : [...feats, f] });
                    }} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      (customer.preferredFeatures || []).includes(f) ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    )}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Tercih Edilen Şehirler</label>
                  <input value={(customer.preferredCities || []).join(", ")} onChange={(e) => setCustomer({ ...customer, preferredCities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="İstanbul, Ankara" className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Tercih Edilen İlçeler</label>
                  <input value={(customer.preferredDistricts || []).join(", ")} onChange={(e) => setCustomer({ ...customer, preferredDistricts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Kadıköy, Beşiktaş" className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* İlgilendiği Projeler / Siteler */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                İlgilendiği Projeler / Siteler
              </h3>
              <div className="flex flex-wrap gap-2">
                {(customer.interestedProjects || []).map((entry) => (
                  <span key={entry.project.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold">
                    {entry.project.name}
                    {entry.project.code ? <span className="opacity-70">({entry.project.code})</span> : null}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setCustomer({ ...customer, interestedProjects: (customer.interestedProjects || []).filter((x) => x.project.id !== entry.project.id) })}
                        className="ml-1 h-5 w-5 inline-flex items-center justify-center rounded-md hover:bg-white/15"
                        aria-label="Kaldır"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {(customer.interestedProjects || []).length === 0 && (
                  <span className="text-xs text-on-surface-variant">Henüz proje eklenmedi.</span>
                )}
              </div>
              {canEdit && (
                <div className="relative">
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDropdown(true); }}
                    onFocus={() => setShowProjectDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProjectDropdown(false), 150)}
                    placeholder="Proje ara ve ekle (örn. Marina Park)"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                  {showProjectDropdown && filteredProjectOptions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 z-20 max-h-64 overflow-auto rounded-xl bg-surface-container-lowest shadow-lg border border-outline-variant/20">
                      {filteredProjectOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const next = [
                              ...(customer.interestedProjects || []),
                              { project: { id: p.id, name: p.name, code: p.code, city: p.city, district: p.district } },
                            ];
                            setCustomer({ ...customer, interestedProjects: next });
                            setProjectSearch("");
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-container-low flex items-center justify-between"
                        >
                          <span className="font-medium text-on-surface">
                            {p.name}
                            {p.code ? <span className="text-on-surface-variant"> ({p.code})</span> : null}
                          </span>
                          {(p.city || p.district) && (
                            <span className="text-xs text-on-surface-variant">
                              {[p.city, p.district].filter(Boolean).join(" / ")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-on-surface-variant">
                Bu projelerle eşleşen müşterileri proje sayfası üzerinden filtreleyebilirsiniz.
              </p>
            </div>

            {/* Etiketler */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
              <h3 className="text-sm font-bold text-on-surface">Etiketler</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {(customer.tags || []).map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-primary-fixed text-primary text-xs font-bold rounded-lg flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => setCustomer({ ...customer, tags: (customer.tags || []).filter((t) => t !== tag) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input id="tagInput" placeholder="Yeni etiket..." className="flex-1 px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !(customer.tags || []).includes(val)) {
                        setCustomer({ ...customer, tags: [...(customer.tags || []), val] });
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }} />
              </div>
              <p className="text-xs text-on-surface-variant">Enter tuşuyla ekleyin. Örn: VIP, Yatırımcı, Acil, Kurumsal, İlk Alıcı</p>
            </div>

            {/* Kaydet */}
            <div className="flex justify-end">
              {!canEdit && (
                <span className="text-xs text-on-surface-variant bg-surface-container-low px-4 py-3 rounded-xl">
                  Sadece atanan danışman talep profilini düzenleyebilir
                </span>
              )}
              {canEdit && <button
                onClick={async () => {
                  setDemandSaving(true);
                  try {
                    const res = await fetch(`/api/customers/${customer.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        stage: customer.stage,
                        minBudget: customer.minBudget,
                        maxBudget: customer.maxBudget,
                        urgency: customer.urgency,
                        desiredMoveDate: customer.desiredMoveDate,
                        preferredTypes: customer.preferredTypes,
                        preferredCities: customer.preferredCities,
                        preferredDistricts: customer.preferredDistricts,
                        minArea: customer.minArea,
                        maxArea: customer.maxArea,
                        minRooms: customer.minRooms,
                        maxRooms: customer.maxRooms,
                        preferredFeatures: customer.preferredFeatures,
                        financingMethod: customer.financingMethod,
                        preApprovalStatus: customer.preApprovalStatus,
                        downPaymentPercent: customer.downPaymentPercent,
                        tags: customer.tags,
                        notesSummary: customer.notesSummary,
                        nextFollowUpDate: customer.nextFollowUpDate,
                        interestedProjectIds: (customer.interestedProjects || []).map((p) => p.project.id),
                      }),
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      const msg = typeof body.error === "string" ? body.error
                        : Array.isArray(body.error) ? (body.error[0]?.message || "Doğrulama hatası")
                        : `Sunucu hatası (${res.status})`;
                      toast.error(msg);
                      return;
                    }
                    const updated = await res.json();
                    setCustomer((prev) => prev ? { ...prev, ...updated } : updated);
                    setDemandSaved(true);
                    toast.success("Talep profili kaydedildi");
                    setTimeout(() => setDemandSaved(false), 2000);
                  } catch (err) {
                    console.error("Demand profile save failed:", err);
                    toast.error("Bağlantı hatası — kaydedilemedi");
                  } finally {
                    setDemandSaving(false);
                  }
                }}
                disabled={demandSaving}
                className={cn(
                  "px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-[0.98] transition-all",
                  demandSaved ? "bg-green-100 text-green-700" : "primary-gradient text-white shadow-lg shadow-primary/10"
                )}
              >
                {demandSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : demandSaved ? <> Kaydedildi</> : <><Save className="w-4 h-4" /> Talep Profilini Kaydet</>}
              </button>}
            </div>
          </motion.div>
        )}

        {activeTab === "notes" && (
          <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10"
          >
            {/* Add Note Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newNote.trim()) return;
              setNoteSaving(true);
              const res = await fetch(`/api/customers/${customer.id}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newNote }),
              });
              if (res.ok) {
                const note = await res.json();
                customer.notes = [note, ...customer.notes];
                setNewNote("");
                setCustomer({ ...customer });
              }
              setNoteSaving(false);
            }} className="flex gap-3">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Yeni not ekle..."
                className="flex-1 px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
              <button
                type="submit"
                disabled={noteSaving || !newNote.trim()}
                className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 active:scale-[0.98] transition-all"
              >
                <Send className="w-4 h-4" />
                {noteSaving ? "..." : "Ekle"}
              </button>
            </form>

            {customer.notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <StickyNote className="w-10 h-10 opacity-30 mb-2" />
                Henüz not eklenmemiş
              </div>
            ) : (
              customer.notes.map((note) => (
                <div key={note.id} className="p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all">
                  <LinkifiedText text={note.content} className="text-sm text-on-surface block" />
                  <p className="text-xs text-on-surface-variant mt-3">{note.user.name} - {new Date(note.createdAt).toLocaleString("tr-TR")}</p>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "interactions" && (
          <motion.div key="interactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10"
          >
            {/* Add Interaction Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!interactionSummary.trim()) return;
              setInteractionSaving(true);
              try {
                const res = await fetch(`/api/customers/${customer.id}/interactions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ type: interactionType, summary: interactionSummary.trim() }),
                });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  const msg = typeof body.error === "string" ? body.error
                    : Array.isArray(body.error) ? (body.error[0]?.message || "Doğrulama hatası")
                    : `Sunucu hatası (${res.status})`;
                  toast.error(msg);
                  return;
                }
                const interaction = await res.json();
                setCustomer((prev) => prev ? { ...prev, interactions: [interaction, ...prev.interactions] } : prev);
                setInteractionSummary("");
                toast.success("İletişim kaydedildi");
              } catch (err) {
                console.error("Interaction save failed:", err);
                toast.error("Bağlantı hatası — kaydedilemedi");
              } finally {
                setInteractionSaving(false);
              }
            }} className="flex flex-col sm:flex-row gap-3">
              <select
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                className="px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm font-medium"
              >
                <option value="CALL">Telefon</option>
                <option value="EMAIL">E-posta</option>
                <option value="VISIT">Ziyaret</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
              <input
                value={interactionSummary}
                onChange={(e) => setInteractionSummary(e.target.value)}
                placeholder="Özet (opsiyonel)..."
                className="flex-1 px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
              <button
                type="submit"
                disabled={interactionSaving}
                className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 active:scale-[0.98] transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                {interactionSaving ? "..." : "Kaydet"}
              </button>
            </form>

            {customer.interactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <MessageCircle className="w-10 h-10 opacity-30 mb-2" />
                Henüz iletişim kaydı yok
              </div>
            ) : (
              customer.interactions.map((inter) => {
                const Icon = interactionIcons[inter.type] || MessageCircle;
                return (
                  <div key={inter.id} className="flex items-start gap-4 p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all">
                    <div className="w-10 h-10 bg-secondary-container rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-on-secondary-container" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-on-primary-fixed-variant rounded-lg font-bold uppercase tracking-wider">
                        {interactionLabels[inter.type]}
                      </span>
                      <p className="text-sm text-on-surface mt-2">{inter.summary || "-"}</p>
                      <p className="text-xs text-on-surface-variant mt-2">{inter.user.name} - {new Date(inter.date).toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === "appointments" && (
          <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Randevular</h3>
              <Link href="/calendar" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                Takvime Git <Calendar className="w-3 h-3" />
              </Link>
            </div>
            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-12 text-on-surface-variant">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <Calendar className="w-10 h-10 opacity-30 mb-2" />
                Bu müşteri için randevu yok
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => (
                  <div key={a.id} className="flex items-start gap-4 p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all">
                    <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0 text-on-primary-container text-xs font-bold">
                      {new Date(a.startDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-on-surface">{a.title}</p>
                        <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold uppercase",
                          a.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          a.status === "CANCELLED" ? "bg-error-container text-on-error-container" :
                          "bg-surface-container text-on-surface-variant"
                        )}>
                          {a.status === "PLANNED" ? "Planlandı" : a.status === "COMPLETED" ? "Tamamlandı" : "İptal"}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {new Date(a.startDate).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {a.property && (
                        <Link href={`/properties/${a.property.id}`}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                          <Home className="w-3 h-3" />{a.property.title}
                        </Link>
                      )}
                      {a.location && (
                        <p className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                          <MapPin className="w-3 h-3" />{a.location}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <Clock className="w-4 h-4 text-on-surface-variant" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "matches" && (
          <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">İlgili İlanlar</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant">{propertyMatches.length} kayıt</span>
                <button onClick={async () => {
                  const willOpen = !showAddProperty;
                  setShowAddProperty(willOpen);
                  if (willOpen) {
                    // açıldığında son eklenen aktif ilanları göster
                    setAddQuery("");
                    const res = await fetch(`/api/properties?status=ACTIVE&sortBy=createdAt&sortOrder=desc&limit=10`);
                    const data = await res.json();
                    setAddResults(Array.isArray(data.properties) ? data.properties : []);
                  }
                }}
                  className="text-xs font-bold text-primary hover:bg-primary-fixed px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" />İlan Ekle
                </button>
              </div>
            </div>

            <div className="bg-primary-fixed/60 p-4 rounded-xl text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-primary">⚡ Öneriler</strong> müşterinin talep profiline (bütçe, şehir, tip, m²) göre otomatik hesaplanır.
              ✓ <strong>İlgileniyor</strong> olarak işaretledikleriniz üste gelir, ✗ ile reddettikleriniz bir daha önerilmez. Öneri gelmese de <strong>İlan Ekle</strong> ile manuel bağlayabilirsiniz.
            </div>

            {showAddProperty && (
              <div className="bg-surface-container-low p-4 rounded-2xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    value={addQuery}
                    autoFocus
                    onChange={(e) => {
                      const q = e.target.value;
                      setAddQuery(q);
                      if (addTimer.current) clearTimeout(addTimer.current);
                      addTimer.current = setTimeout(async () => {
                        const url = q.length >= 2
                          ? `/api/properties?search=${encodeURIComponent(q)}&limit=10`
                          : `/api/properties?status=ACTIVE&sortBy=createdAt&sortOrder=desc&limit=10`;
                        const res = await fetch(url);
                        const data = await res.json();
                        setAddResults(Array.isArray(data.properties) ? data.properties : []);
                      }, 200);
                    }}
                    placeholder="İlan ara (başlık, şehir, ilçe)..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {addResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto space-y-1.5">
                    {addResults.map((p) => (
                      <button key={p.id} type="button"
                        onClick={async () => {
                          await fetch(`/api/customers/${customer.id}/matches`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ propertyId: p.id }),
                          });
                          setShowAddProperty(false);
                          setAddQuery("");
                          setAddResults([]);
                          // yeniden yükle
                          setMatchesLoading(true);
                          const r = await fetch(`/api/customers/${customer.id}/matches`);
                          const d = await r.json();
                          setPropertyMatches(Array.isArray(d) ? d : []);
                          setMatchesLoading(false);
                        }}
                        className="w-full text-left p-3 bg-white hover:bg-surface-container-low rounded-xl transition-colors flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-on-surface truncate">{p.title}</p>
                          <p className="text-xs text-on-surface-variant">
                            {[p.district, p.city].filter(Boolean).join(", ") || "-"}
                            {" · "}
                            <span className="font-semibold text-primary">
                              {new Intl.NumberFormat("tr-TR", { style: "currency", currency: p.currency || "TRY" }).format(p.price)}
                            </span>
                          </p>
                        </div>
                        <PlusCircle className="w-4 h-4 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {addQuery.length >= 2 && addResults.length === 0 && (
                  <p className="text-xs text-on-surface-variant text-center py-2">Bu aramaya uygun ilan bulunamadı</p>
                )}
                {addQuery.length < 2 && addResults.length > 0 && (
                  <p className="text-[10px] text-on-surface-variant text-center pt-1">Son eklenen ilanlar · aramak için yazın</p>
                )}
              </div>
            )}

            {matchesLoading ? (
              <div className="flex items-center justify-center py-12 text-on-surface-variant">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Hesaplanıyor...
              </div>
            ) : propertyMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <Home className="w-10 h-10 opacity-30 mb-2" />
                Talep profiline uygun ilan bulunamadı
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {propertyMatches.map((m) => {
                  const p = m.property;
                  const img = p.images[0]?.url;
                  const typeLabelsMap: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil" };
                  return (
                    <div key={m.id}
                      className={cn("p-3 rounded-2xl transition-all group",
                        m.status === "INTERESTED" ? "bg-green-50 border border-green-200" : "bg-surface-container-low hover:bg-surface-container"
                      )}>
                      <Link href={`/properties/${p.id}`} className="flex gap-3">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-surface-container-high">
                          {img ? <SafeImage src={img} alt={p.title} className="object-cover" /> : <Home className="w-6 h-6 text-on-surface-variant m-auto mt-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors flex-1">{p.title}</p>
                            {m.status === "INTERESTED" ? (
                              <span className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded font-black uppercase shrink-0">✓ İlgili</span>
                            ) : (
                              <span className="text-[9px] text-on-surface-variant shrink-0">⚡</span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant">{[p.district, p.city].filter(Boolean).join(", ")}</p>
                          <p className="text-xs font-bold text-primary mt-1">
                            {new Intl.NumberFormat("tr-TR", { style: "currency", currency: p.currency }).format(p.price)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] px-1.5 py-0.5 bg-primary-fixed text-primary rounded font-bold">
                              {typeLabelsMap[p.propertyType] || p.propertyType}
                            </span>
                            {p.area && <span className="text-[9px] text-on-surface-variant">{p.area} m²</span>}
                            {p.rooms && <span className="text-[9px] text-on-surface-variant">{p.rooms}</span>}
                          </div>
                        </div>
                        {m.matchScore != null && (
                          <div className={cn("shrink-0 text-xs font-black px-2 py-1 rounded-lg h-fit",
                            m.matchScore >= 70 ? "bg-green-100 text-green-700" :
                            m.matchScore >= 50 ? "bg-tertiary-fixed text-tertiary" :
                            "bg-surface-container text-on-surface-variant"
                          )}>%{Math.round(m.matchScore)}</div>
                        )}
                      </Link>
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.status !== "INTERESTED" ? (
                          <button onClick={async () => {
                            await fetch(`/api/matches/${m.id}`, {
                              method: "PATCH", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "INTERESTED" }),
                            });
                            setPropertyMatches((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "INTERESTED" } : x));
                          }} className="flex-1 text-[10px] font-bold py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" /> İlgileniyor
                          </button>
                        ) : (
                          <button onClick={async () => {
                            await fetch(`/api/matches/${m.id}`, {
                              method: "PATCH", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "SUGGESTED" }),
                            });
                            setPropertyMatches((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "SUGGESTED" } : x));
                          }} className="flex-1 text-[10px] font-bold py-1.5 bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-container-high">
                            Geri Al
                          </button>
                        )}
                        <button onClick={async () => {
                          await fetch(`/api/matches/${m.id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "REJECTED" }),
                          });
                          setPropertyMatches((prev) => prev.filter((x) => x.id !== m.id));
                        }} className="flex-1 text-[10px] font-bold py-1.5 bg-error-container/30 text-error rounded-lg hover:bg-error-container/50 flex items-center justify-center gap-1">
                          <X className="w-3 h-3" /> Reddet
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "contracts" && (
          <motion.div key="contracts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold text-on-surface">Sözleşmeler</h2>
              <Link
                href={`/contracts/new?customerId=${customer.id}`}
                className="primary-gradient text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Yeni Sözleşme
              </Link>
            </div>
            {contractsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <FileSignature className="w-10 h-10 opacity-30 mb-2" />
                <p className="text-sm">Bu müşteri için sözleşme yok</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/contracts/${c.id}`}
                      className="flex items-center justify-between gap-3 p-4 bg-surface-container-low hover:bg-surface-container rounded-2xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-on-surface truncate">{c.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-primary-fixed text-primary rounded font-black uppercase">
                            {c.contractType === "KIRA" ? "Kira" : c.contractType === "SATIS" ? "Satış" : "Komisyon"}
                          </span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                            c.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                            c.status === "EXPIRED" ? "bg-error-container text-on-error-container" :
                            "bg-surface-container text-on-surface-variant"
                          )}>
                            {c.status === "ACTIVE" ? "Aktif" : c.status === "DRAFT" ? "Taslak" : c.status === "EXPIRED" ? "Süresi Doldu" : c.status === "RENEWED" ? "Yenilendi" : "Feshedildi"}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {c.property ? `${c.property.title} · ` : ""}
                          {c.amount.toLocaleString("tr-TR")} {c.currency}
                          {c._count.attachments > 0 && (
                            <span className="inline-flex items-center gap-1 ml-2 text-primary font-bold">
                              <Paperclip className="w-3 h-3" /> {c._count.attachments}
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {activeTab === "kvkk" && (
          <motion.div key="kvkk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10"
          >
            <div className="bg-secondary-container/30 p-5 rounded-2xl flex items-center gap-3 text-sm text-on-surface-variant">
              <Info className="w-5 h-5 text-primary shrink-0" />
              KVKK kapsamında alınan rıza kayıtları. Bu kayıtlar değiştirilemez, sadece yeni rıza eklenebilir veya mevcut rıza geri çekilebilir.
            </div>
            {customer.consents.map((consent) => (
              <div key={consent.id} className="flex items-center justify-between p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all">
                <div>
                  <p className="text-sm font-bold text-on-surface">{consentLabels[consent.consentType]}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{consent.consentText}</p>
                </div>
                <div className="text-right">
                  {consent.isGranted ? (
                    <span className="text-[10px] px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-bold uppercase">Onaylandı</span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-1 bg-error-container text-on-error-container rounded-lg font-bold uppercase">Reddedildi</span>
                  )}
                  <p className="text-xs text-on-surface-variant mt-1">
                    {consent.grantedAt ? new Date(consent.grantedAt).toLocaleString("tr-TR") : "-"}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "access" && (
          <motion.div key="access" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Hassas Veri Erişim Geçmişi</h3>
                <p className="text-xs text-on-surface-variant mt-1">Kim, ne zaman, hangi gerekçeyle bu müşterinin telefon/email/TC bilgisine baktı? (KVKK)</p>
              </div>
              <button
                onClick={() => {
                  setAccessHistoryLoading(true);
                  fetch(`/api/customers/${customer.id}/access-sessions`)
                    .then((r) => (r.ok ? r.json() : []))
                    .then((data) => setAccessHistory(Array.isArray(data) ? data : []))
                    .finally(() => setAccessHistoryLoading(false));
                }}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                Yenile
              </button>
            </div>

            {accessHistoryLoading ? (
              <div className="flex items-center justify-center py-12 text-on-surface-variant">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
              </div>
            ) : accessHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <Clock className="w-10 h-10 opacity-30 mb-2" />
                Henüz erişim kaydı yok
              </div>
            ) : (
              <div className="space-y-3">
                {accessHistory.map((s) => (
                  <div key={s.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-on-surface">{s.user.name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded font-bold uppercase tracking-wider text-on-surface-variant">{s.user.role}</span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                            s.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            s.status === "ABANDONED" ? "bg-error-container text-on-error-container" :
                            "bg-tertiary-fixed text-tertiary"
                          )}>
                            {s.status === "COMPLETED" ? "Tamamlandı" : s.status === "ABANDONED" ? "Notsuz Kapandı" : "Aktif"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-primary rounded font-bold uppercase tracking-wider">
                            {ACCESS_REASON_LABELS[s.reasonCategory] || s.reasonCategory}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface mt-2">{s.reason}</p>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          Erişilen alanlar: {s.fields.join(", ") || "-"}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-on-surface-variant">
                        <p>{new Date(s.startedAt).toLocaleString("tr-TR")}</p>
                        {s.endedAt && (
                          <p className="mt-0.5">→ {new Date(s.endedAt).toLocaleString("tr-TR")}</p>
                        )}
                      </div>
                    </div>
                    {s.exitNote && (
                      <div className="mt-3 p-3 bg-surface-container rounded-xl">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Sonuç Notu</p>
                        <p className="text-sm text-on-surface">{s.exitNote.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal Modal — Hassas alana erişim gerekçesi */}
      <AnimatePresence>
        {revealModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => { if (!revealModal.saving) setRevealModal(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface">Hassas Veri Erişimi</h3>
                  <p className="text-xs text-on-surface-variant">
                    {revealModal.field === "phone" ? "Telefon numarası" : revealModal.field === "email" ? "E-posta adresi" : "TC Kimlik No"} açılacak. Lütfen gerekçenizi belirtin.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Gerekçe Kategorisi</label>
                <select
                  value={revealModal.reasonCategory}
                  onChange={(e) => setRevealModal({ ...revealModal, reasonCategory: e.target.value, error: null })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm font-medium outline-none"
                >
                  {ACCESS_REASON_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Açıklama (zorunlu)</label>
                <textarea
                  value={revealModal.reason}
                  onChange={(e) => setRevealModal({ ...revealModal, reason: e.target.value, error: null })}
                  placeholder="Örn: 'Yarın gösterimi teyit etmek için arıyorum.'"
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {revealModal.error && (
                <p className="text-xs text-error font-bold">{revealModal.error}</p>
              )}

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  disabled={revealModal.saving}
                  onClick={() => setRevealModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-surface-container text-on-surface-variant"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={revealModal.saving || revealModal.reason.trim().length < 3}
                  onClick={async () => {
                    setRevealModal({ ...revealModal, saving: true, error: null });
                    const fieldKey = revealModal.field;
                    const res = await fetch(`/api/customers/${customer.id}/access-sessions`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        reasonCategory: revealModal.reasonCategory,
                        reason: revealModal.reason.trim(),
                        fields: [fieldKey],
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      setRevealModal({ ...revealModal, saving: false, error: err.error || "İşlem başarısız" });
                      return;
                    }
                    // Müşteriyi yeniden yükle: API artık ilgili alanı açık döner
                    const refreshed = await fetch(`/api/customers/${customer.id}`).then((r) => r.json()).catch(() => null);
                    if (refreshed) setCustomer(refreshed);
                    setRevealModal(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold primary-gradient text-white shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
                >
                  {revealModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Gerekçeyi Onayla & Aç
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Modal — Sonuç notu zorunlu */}
      <AnimatePresence>
        {exitModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tertiary-fixed rounded-xl flex items-center justify-center text-tertiary">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface">Sonuç Notu Zorunlu</h3>
                  <p className="text-xs text-on-surface-variant">Bu müşterinin hassas verisine eriştiniz. Ne konuşuldu / ne yapıldı?</p>
                </div>
              </div>

              <textarea
                value={exitModal.note}
                onChange={(e) => setExitModal({ ...exitModal, note: e.target.value, error: null })}
                placeholder="Örn: 'Müşteriyi aradım, gösterim Cumartesi 14:00 olarak kararlaştırıldı.'"
                rows={4}
                autoFocus
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20"
              />

              {exitModal.error && (
                <p className="text-xs text-error font-bold">{exitModal.error}</p>
              )}

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  disabled={exitModal.saving || exitModal.note.trim().length < 3}
                  onClick={async () => {
                    if (!customer.activeAccessSession) { setExitModal(null); return; }
                    setExitModal({ ...exitModal, saving: true, error: null });
                    const res = await fetch(`/api/customers/${customer.id}/access-sessions/${customer.activeAccessSession.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ exitNote: exitModal.note.trim() }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      setExitModal({ ...exitModal, saving: false, error: err.error || "Kayıt başarısız" });
                      return;
                    }
                    const pendingNav = exitModal.pendingNav;
                    setExitModal(null);
                    setCustomer({ ...customer, activeAccessSession: null });
                    if (pendingNav === "BACK") {
                      router.push("/customers");
                    } else if (pendingNav) {
                      router.push(pendingNav);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold primary-gradient text-white shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
                >
                  {exitModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Notu Kaydet & Çık
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Hassas alan kart — maskeli iken "Göster" butonu, açıkken EditableText
function SensitiveField({
  icon: Icon, label, revealed, maskedValue, value, editable, type, onChange, onReveal,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  revealed: boolean;
  maskedValue: string | null;
  value: string | null;
  editable: boolean;
  type?: "email" | "tel" | "text";
  onChange: (v: string) => void;
  onReveal: () => void;
}) {
  if (revealed) {
    return (
      <EditableText icon={Icon} label={label} editing={editable} type={type ?? "text"}
        value={value}
        onChange={onChange} />
    );
  }
  return (
    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{label}</p>
          <p className="text-sm font-bold text-on-surface mt-0.5 truncate">{maskedValue ?? "-"}</p>
        </div>
        {maskedValue && (
          <button
            type="button"
            onClick={onReveal}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-primary-fixed text-primary hover:bg-primary-container transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Göster
          </button>
        )}
      </div>
    </div>
  );
}

