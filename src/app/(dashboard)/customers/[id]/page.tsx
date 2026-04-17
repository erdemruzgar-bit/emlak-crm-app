"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, StickyNote, MessageCircle, ShieldCheck, Trash2, Loader2, UserX,
  Phone, Mail, Fingerprint, Tag, Globe, Headphones, Building2, MapPin, Calendar, Info,
  Send, PlusCircle, Target, Save, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  tcKimlikNo: string | null;
  address: string | null;
  customerType: string;
  source: string | null;
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

const typeLabels: Record<string, string> = { BUYER: "Alıcı", SELLER: "Satıcı", TENANT: "Kiracı", LANDLORD: "Ev Sahibi" };
const consentLabels: Record<string, string> = { ACIK_RIZA: "Açık Rıza", AYDINLATMA: "Aydınlatma Metni", PAZARLAMA: "Pazarlama İzni" };
const interactionLabels: Record<string, string> = { CALL: "Telefon", EMAIL: "E-posta", VISIT: "Ziyaret", WHATSAPP: "WhatsApp" };
const interactionIcons: Record<string, React.ComponentType<{ className?: string }>> = { CALL: Phone, EMAIL: Mail, VISIT: MapPin, WHATSAPP: MessageCircle };

const tabs = [
  { key: "info", label: "Bilgiler", icon: User },
  { key: "demand", label: "Talep Profili", icon: Target },
  { key: "notes", label: "Notlar", icon: StickyNote },
  { key: "interactions", label: "İletişim", icon: MessageCircle },
  { key: "kvkk", label: "KVKK Rızaları", icon: ShieldCheck },
] as const;

const stageLabels: Record<string, string> = { LEAD: "Lead", QUALIFIED: "Nitelikli", ACTIVE: "Aktif", SHOWING: "Gösterim", OFFER: "Teklif", CONTRACT: "Sözleşme", CLOSED: "Kapandı", LOST: "Kayıp" };
const stageColors: Record<string, string> = { LEAD: "bg-surface-container text-on-surface-variant", QUALIFIED: "bg-secondary-container text-on-secondary-container", ACTIVE: "bg-primary-fixed text-primary", SHOWING: "bg-tertiary-fixed text-tertiary", OFFER: "bg-tertiary-container text-on-tertiary-container", CONTRACT: "bg-primary-container text-on-primary-container", CLOSED: "bg-green-100 text-green-700", LOST: "bg-error-container text-on-error-container" };
const urgencyLabels: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" };
const urgencyColors: Record<string, string> = { LOW: "bg-green-100 text-green-700", MEDIUM: "bg-surface-container text-on-surface-variant", HIGH: "bg-tertiary-fixed text-tertiary", URGENT: "bg-error-container text-on-error-container" };
const propertyTypeOptions = ["DAIRE", "VILLA", "ARSA", "ISYERI", "MUSTAKILEV"];
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil Ev" };
const featureOptions = ["Otopark", "Havuz", "Asansör", "Balkon", "Güvenlik", "Bahçe", "Ebeveyn Banyosu", "Manzara", "Metro Yakın", "Okul Yakın"];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "demand" | "notes" | "interactions" | "kvkk">("info");
  const [demandSaving, setDemandSaving] = useState(false);
  const [demandSaved, setDemandSaved] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [interactionType, setInteractionType] = useState("CALL");
  const [interactionSummary, setInteractionSummary] = useState("");
  const [interactionSaving, setInteractionSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((res) => res.json())
      .then((data) => { setCustomer(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

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
          <Link href="/customers" className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">{customer.firstName} {customer.lastName}</h1>
            <p className="text-sm text-on-surface-variant font-medium">{typeLabels[customer.customerType]}</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Bu müşterinin verilerini anonimleştirmek istediğinize emin misiniz? (KVKK Unutulma Hakkı)")) {
              fetch(`/api/customers/${customer.id}`, { method: "DELETE" }).then(() => router.push("/customers"));
            }
          }}
          className="px-5 py-3 text-sm text-error bg-error-container/30 hover:bg-error-container/50 rounded-xl transition-all font-bold flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Veriyi Anonimleştir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === "notes" ? customer.notes.length : tab.key === "interactions" ? customer.interactions.length : null;
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
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Ad" value={customer.firstName} />
              <InfoRow icon={User} label="Soyad" value={customer.lastName} />
              <InfoRow icon={Mail} label="E-posta" value={customer.email} />
              <InfoRow icon={Phone} label="Telefon" value={customer.phone} />
              <InfoRow icon={Fingerprint} label="TC Kimlik No" value={customer.tcKimlikNo ? `***${customer.tcKimlikNo.slice(-4)}` : null} />
              <InfoRow icon={Tag} label="Müşteri Tipi" value={typeLabels[customer.customerType]} />
              <InfoRow icon={Globe} label="Kaynak" value={customer.source} />
              <InfoRow icon={Headphones} label="Danışman" value={customer.assignedAgent?.name} />
              <InfoRow icon={Building2} label="Şube" value={customer.branch?.name} />
              <InfoRow icon={MapPin} label="Adres" value={customer.address} />
              <InfoRow icon={Calendar} label="Kayıt Tarihi" value={new Date(customer.createdAt).toLocaleDateString("tr-TR")} />
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
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Aşama</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stageLabels).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setCustomer({ ...customer, stage: key })}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", customer.stage === key ? stageColors[key] + " ring-2 ring-primary/30" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container")}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Aciliyet</label>
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
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Sonraki Takip Tarihi</label>
                  <input type="date" value={customer.nextFollowUpDate?.split("T")[0] || ""} onChange={(e) => setCustomer({ ...customer, nextFollowUpDate: e.target.value || null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Taşınma Tarihi</label>
                  <input type="date" value={customer.desiredMoveDate?.split("T")[0] || ""} onChange={(e) => setCustomer({ ...customer, desiredMoveDate: e.target.value || null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Kısa Özet Not</label>
                <textarea value={customer.notesSummary || ""} onChange={(e) => setCustomer({ ...customer, notesSummary: e.target.value || null })} rows={2}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="Danışman için kısa özet..." />
              </div>
            </div>

            {/* Bütçe & Finansman */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
              <h3 className="text-sm font-bold text-on-surface">Bütçe & Finansman</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Min Bütçe (₺)</label>
                  <input type="number" value={customer.minBudget || ""} onChange={(e) => setCustomer({ ...customer, minBudget: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Max Bütçe (₺)</label>
                  <input type="number" value={customer.maxBudget || ""} onChange={(e) => setCustomer({ ...customer, maxBudget: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Finansman</label>
                  <select value={customer.financingMethod || ""} onChange={(e) => setCustomer({ ...customer, financingMethod: e.target.value || null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Seçiniz</option>
                    <option value="NAKIT">Nakit</option>
                    <option value="KREDI">Kredi</option>
                    <option value="TAKAS">Takas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Peşinat %</label>
                  <input type="number" min={0} max={100} value={customer.downPaymentPercent || ""} onChange={(e) => setCustomer({ ...customer, downPaymentPercent: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Ön Onay Durumu</label>
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
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Mülk Tipi</label>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Min m²</label>
                  <input type="number" value={customer.minArea || ""} onChange={(e) => setCustomer({ ...customer, minArea: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Max m²</label>
                  <input type="number" value={customer.maxArea || ""} onChange={(e) => setCustomer({ ...customer, maxArea: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Min Oda</label>
                  <input value={customer.minRooms || ""} onChange={(e) => setCustomer({ ...customer, minRooms: e.target.value || null })} placeholder="2+1"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Max Oda</label>
                  <input value={customer.maxRooms || ""} onChange={(e) => setCustomer({ ...customer, maxRooms: e.target.value || null })} placeholder="4+1"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">İstenen Özellikler</label>
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
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Tercih Edilen Şehirler</label>
                  <input value={(customer.preferredCities || []).join(", ")} onChange={(e) => setCustomer({ ...customer, preferredCities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="İstanbul, Ankara" className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Tercih Edilen İlçeler</label>
                  <input value={(customer.preferredDistricts || []).join(", ")} onChange={(e) => setCustomer({ ...customer, preferredDistricts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Kadıköy, Beşiktaş" className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
              </div>
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
              <button
                onClick={async () => {
                  setDemandSaving(true);
                  await fetch(`/api/customers/${customer.id}`, {
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
                    }),
                  });
                  setDemandSaving(false);
                  setDemandSaved(true);
                  setTimeout(() => setDemandSaved(false), 2000);
                }}
                disabled={demandSaving}
                className={cn(
                  "px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-[0.98] transition-all",
                  demandSaved ? "bg-green-100 text-green-700" : "primary-gradient text-white shadow-lg shadow-primary/10"
                )}
              >
                {demandSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : demandSaved ? <> Kaydedildi</> : <><Save className="w-4 h-4" /> Talep Profilini Kaydet</>}
              </button>
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
                  <p className="text-sm text-on-surface">{note.content}</p>
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
              setInteractionSaving(true);
              const res = await fetch(`/api/customers/${customer.id}/interactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: interactionType, summary: interactionSummary }),
              });
              if (res.ok) {
                const interaction = await res.json();
                customer.interactions = [interaction, ...customer.interactions];
                setInteractionSummary("");
                setCustomer({ ...customer });
              }
              setInteractionSaving(false);
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
      </AnimatePresence>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
  return (
    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{label}</p>
        <p className="text-sm font-bold text-on-surface mt-0.5">{value || "-"}</p>
      </div>
    </div>
  );
}
