"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, User, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { MediaUploader, type MediaItem } from "@/components/ui/media-uploader";
import { TURKEY_CITIES, getDistrictsOf } from "@/lib/turkey-locations";

interface CustomerResult { id: string; label: string; }
interface ProjectOption {
  id: string;
  name: string;
  blocks: { id: string; name: string }[];
}

const inputClass = "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

const propertyTypes = [
  { value: "DAIRE", label: "Daire" },
  { value: "VILLA", label: "Villa" },
  { value: "ARSA", label: "Arsa" },
  { value: "ISYERI", label: "İşyeri" },
  { value: "MUSTAKILEV", label: "Müstakil Ev" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Aktif", color: "bg-green-100 text-green-700" },
  { value: "SOLD", label: "Satıldı", color: "bg-primary-container text-on-primary-container" },
  { value: "RENTED", label: "Kiralandı", color: "bg-tertiary-container text-on-tertiary-container" },
  { value: "INACTIVE", label: "Pasif", color: "bg-surface-container text-on-surface-variant" },
];

interface UserOption { id: string; name: string; role: string; branch: { name: string } | null }

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as unknown as { role?: string } | undefined;
  const canReassign = sessionUser?.role === "ADMIN" || sessionUser?.role === "MANAGER";
  const [loading, setLoading] = useState(true);
  const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [propertyType, setPropertyType] = useState("DAIRE");
  const [status, setStatus] = useState("ACTIVE");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<CustomerResult[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<CustomerResult | null>(null);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function searchOwner(q: string) {
    setOwnerQuery(q);
    if (ownerTimer.current) clearTimeout(ownerTimer.current);
    if (q.length < 2) { setOwnerResults([]); return; }
    setOwnerLoading(true);
    ownerTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setOwnerResults(
        (Array.isArray(data.customers) ? data.customers : []).map((c: { id: string; firstName: string; lastName: string; phone?: string }) => ({
          id: c.id,
          label: `${c.firstName} ${c.lastName}${c.phone ? ` · ${c.phone}` : ""}`,
        }))
      );
      setOwnerLoading(false);
    }, 300);
  }

  const [form, setForm] = useState<Record<string, string>>({
    title: "",
    listingType: "SATILIK",
    price: "",
    currency: "TRY",
    area: "",
    rooms: "",
    bathrooms: "",
    floor: "",
    totalFloors: "",
    age: "",
    heating: "",
    city: "",
    district: "",
    neighborhood: "",
    address: "",
    description: "",
    // Yeni alanlar (Track B)
    unitNumber: "",
    ada: "",
    pafta: "",
    parsel: "",
    bagimsizBolumNo: "",
    katMulkiyetiTipi: "",
    occupancyStatus: "",
    ownerCitizenship: "",
    isCitizenshipEligible: "",
    citizenshipPriceDiff: "",
    usageType: "",
    hasElevator: "",
    hasParking: "",
    hasBalcony: "",
    facingDirection: "",
    hasTitleDeed: "",
    constructionStatus: "",
    kitchenType: "",
  });

  // Proje / Blok cascading
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [blockId, setBlockId] = useState("");
  const selectedProjectBlocks =
    projects.find((p) => p.id === projectId)?.blocks ?? [];

  // İlan tipi catalog
  const [listingTypes, setListingTypes] = useState<{ code: string; label: string }[]>([]);
  // Sakin durumu catalog
  const [occupancyTypes, setOccupancyTypes] = useState<{ code: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => setProjects([]));
    fetch("/api/listing-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setListingTypes(data);
      })
      .catch(() => setListingTypes([]));
    fetch("/api/occupancy-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setOccupancyTypes(data);
      })
      .catch(() => setOccupancyTypes([]));
  }, []);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title || "",
          listingType: data.listingType || "SATILIK",
          price: String(data.price || ""),
          currency: data.currency || "TRY",
          area: String(data.area || ""),
          rooms: data.rooms || "",
          bathrooms: String(data.bathrooms || ""),
          floor: String(data.floor || ""),
          totalFloors: String(data.totalFloors || ""),
          age: String(data.age || ""),
          heating: data.heating || "",
          city: data.city || "",
          district: data.district || "",
          neighborhood: data.neighborhood || "",
          address: data.address || "",
          description: data.description || "",
          // Yeni alanlar
          unitNumber: data.unitNumber || "",
          ada: data.ada || "",
          pafta: data.pafta || "",
          parsel: data.parsel || "",
          bagimsizBolumNo: data.bagimsizBolumNo || "",
          katMulkiyetiTipi: data.katMulkiyetiTipi || "",
          occupancyStatus: data.occupancyStatus || "",
          ownerCitizenship: data.ownerCitizenship === "VATANDASLIGA_UYGUN" ? "" : (data.ownerCitizenship || ""),
          isCitizenshipEligible:
            data.isCitizenshipEligible === true || data.ownerCitizenship === "VATANDASLIGA_UYGUN"
              ? "true"
              : data.isCitizenshipEligible === false ? "false" : "",
          citizenshipPriceDiff: data.citizenshipPriceDiff != null ? String(data.citizenshipPriceDiff) : "",
          usageType: data.usageType || "",
          hasElevator: data.hasElevator === true ? "true" : data.hasElevator === false ? "false" : "",
          hasParking: data.hasParking === true ? "true" : data.hasParking === false ? "false" : "",
          hasBalcony: data.hasBalcony === true ? "true" : data.hasBalcony === false ? "false" : "",
          facingDirection: data.facingDirection || "",
          hasTitleDeed: data.hasTitleDeed === true ? "true" : data.hasTitleDeed === false ? "false" : "",
          constructionStatus: data.constructionStatus || "",
          kitchenType: data.kitchenType || "",
        });
        setProjectId(data.projectId || "");
        setBlockId(data.blockId || "");
        setPropertyType(data.propertyType || "DAIRE");
        setStatus(data.status || "ACTIVE");
        setAssignedAgentId(data.assignedAgentId || null);
        if (data.owner) {
          setSelectedOwner({ id: data.owner.id, label: `${data.owner.firstName} ${data.owner.lastName}` });
        }
        setMedia((data.images || []).map((img: { url: string }) => ({
          url: img.url,
          mediaType: /\.(mp4|webm|mov|avi)(\?|$)/i.test(img.url) ? "video" : "image",
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (canReassign && users.length === 0) {
      fetch("/api/users").then((r) => r.ok ? r.json() : []).then((data) => {
        if (Array.isArray(data)) setUsers(data.filter((u: { isActive: boolean }) => u.isActive));
      }).catch(() => {});
    }
  }, [canReassign, users.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const boolOrNull = (v: string) => (v === "true" ? true : v === "false" ? false : null);

    const body = {
      title: form.title,
      listingType: form.listingType,
      propertyType,
      status,
      price: parseFloat(form.price),
      currency: form.currency || "TRY",
      area: form.area ? parseFloat(form.area) : undefined,
      rooms: form.rooms || undefined,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
      floor: form.floor ? parseInt(form.floor) : undefined,
      totalFloors: form.totalFloors ? parseInt(form.totalFloors) : undefined,
      age: form.age ? parseInt(form.age) : undefined,
      heating: form.heating || undefined,
      city: form.city || undefined,
      district: form.district || undefined,
      neighborhood: form.neighborhood || undefined,
      address: form.address || undefined,
      description: form.description || undefined,
      ownerId: selectedOwner?.id ?? null,
      ...(canReassign ? { assignedAgentId } : {}),

      // Proje / Blok
      projectId: projectId || null,
      blockId: blockId || null,
      unitNumber: form.unitNumber || undefined,

      // Tapu
      ada: form.ada || undefined,
      pafta: form.pafta || undefined,
      parsel: form.parsel || undefined,
      bagimsizBolumNo: form.bagimsizBolumNo || undefined,
      katMulkiyetiTipi: form.katMulkiyetiTipi || null,

      // Sakin / kullanım
      occupancyStatus: form.occupancyStatus || null,
      ownerCitizenship: form.ownerCitizenship || null,
      isCitizenshipEligible: boolOrNull(form.isCitizenshipEligible),
      citizenshipPriceDiff:
        form.isCitizenshipEligible === "true" && form.citizenshipPriceDiff
          ? parseFloat(form.citizenshipPriceDiff)
          : null,
      usageType: form.usageType || null,

      // Ek özellikler
      hasElevator: boolOrNull(form.hasElevator),
      hasParking: boolOrNull(form.hasParking),
      hasBalcony: boolOrNull(form.hasBalcony),
      facingDirection: form.facingDirection || null,
      hasTitleDeed: boolOrNull(form.hasTitleDeed),
      constructionStatus: form.constructionStatus || null,
      kitchenType: form.kitchenType || null,
    };

    const res = await fetch(`/api/properties/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ? JSON.stringify(data.error) : "Bir hata oluştu");
      setSaving(false);
      return;
    }

    // Replace all images with current media list
    await fetch(`/api/properties/${params.id}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: media.map((m) => m.url) }),
    });

    setSaving(false);
    setSuccess(true);
    toast.success("İlan güncellendi");
    setTimeout(() => router.push(`/properties/${params.id}`), 1000);
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/properties/${params.id}`} className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">İlanı Düzenle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-error-container text-on-error-container text-sm p-4 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Atanan Danışman (müdür + admin) */}
        {canReassign && (
          <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10">
            <h2 className="text-lg font-bold text-on-surface">Atanan Danışman</h2>
            <p className="text-xs text-on-surface-variant">İlanın sorumlu danışmanıdır. Değiştirirseniz yeni kişi bu ilanı düzenleyebilir.</p>
            <select
              value={assignedAgentId || ""}
              onChange={(e) => setAssignedAgentId(e.target.value || null)}
              className={inputClass}
            >
              <option value="">— Atanmamış —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.role === "ADMIN" ? "Yönetici" : u.role === "MANAGER" ? "Şube Müdürü" : "Danışman"}
                  {u.branch?.name ? ` · ${u.branch.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Durum */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">İlan Durumu</h2>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((s) => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                  status === s.value ? s.color + " ring-2 ring-primary/30" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                )}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* İlan Sahibi */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">İlan Sahibi</h2>
          <div className="relative">
            {selectedOwner ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-primary-fixed rounded-xl">
                <User className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-on-surface flex-1">{selectedOwner.label}</span>
                <button type="button" onClick={() => { setSelectedOwner(null); setOwnerQuery(""); setOwnerResults([]); }}
                  className="text-on-surface-variant hover:text-error transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Müşteri adıyla ara..."
                  value={ownerQuery}
                  onChange={(e) => { searchOwner(e.target.value); setOwnerOpen(true); }}
                  onFocus={() => setOwnerOpen(true)}
                  onBlur={() => setTimeout(() => setOwnerOpen(false), 150)}
                  className={inputClass}
                />
                {ownerLoading && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-on-surface-variant" />}
                {ownerOpen && ownerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto border border-outline-variant/20">
                    {ownerResults.map((r) => (
                      <button key={r.id} type="button" onMouseDown={() => { setSelectedOwner(r); setOwnerOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low text-sm text-on-surface transition-colors first:rounded-t-xl last:rounded-b-xl">
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Proje / Blok / Daire */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-on-surface">Proje / Blok / Daire</h2>
            <Link href="/settings/projects" target="_blank" className="text-xs font-bold text-primary hover:underline">
              Projeleri yönet →
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Kayıtlı proje yok.{" "}
              <Link href="/settings/projects" target="_blank" className="text-primary font-bold hover:underline">
                Proje ekle →
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Proje</label>
                <select
                  value={projectId}
                  onChange={(e) => { setProjectId(e.target.value); setBlockId(""); }}
                  className={inputClass}
                >
                  <option value="">Seçiniz</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Blok</label>
                <select
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  disabled={!projectId || selectedProjectBlocks.length === 0}
                  className={cn(inputClass, "disabled:opacity-50")}
                >
                  <option value="">{!projectId ? "Önce proje seç" : selectedProjectBlocks.length === 0 ? "Blok yok" : "Seçiniz"}</option>
                  {selectedProjectBlocks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Daire No</label>
                <input value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="örn: 026" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* Tapu Bilgileri */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Tapu Bilgileri</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Ada</label>
              <input value={form.ada} onChange={(e) => set("ada", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Pafta</label>
              <input value={form.pafta} onChange={(e) => set("pafta", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Parsel</label>
              <input value={form.parsel} onChange={(e) => set("parsel", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Bağımsız Bölüm No</label>
              <input value={form.bagimsizBolumNo} onChange={(e) => set("bagimsizBolumNo", e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Kat Mülkiyeti Tipi</label>
              <select
                value={form.katMulkiyetiTipi}
                onChange={(e) => {
                  const v = e.target.value;
                  set("katMulkiyetiTipi", v);
                  // Kat Mülkiyeti seçilince inşaat durumu boşsa otomatik "Oturuma Hazır"
                  if (v === "KAT_MULKIYETI" && !form.constructionStatus) {
                    set("constructionStatus", "OTURUMA_HAZIR");
                  }
                }}
                className={inputClass}
              >
                <option value="">Seçiniz</option>
                <option value="KAT_MULKIYETI">Kat Mülkiyeti</option>
                <option value="KAT_IRTIFAKI">Kat İrtifakı</option>
                <option value="ARSA_PAYLI">Arsa Paylı</option>
                <option value="HISSELI">Hisseli</option>
                <option value="BAGIMSIZ_BOLUMSUZ">Bağımsız Bölümsüz</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Tapu Kaydı</label>
              <select value={form.hasTitleDeed} onChange={(e) => set("hasTitleDeed", e.target.value)} className={inputClass}>
                <option value="">—</option>
                <option value="true">Var</option>
                <option value="false">Yok</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">İnşaat Durumu</label>
              <select value={form.constructionStatus} onChange={(e) => set("constructionStatus", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="OTURUMA_HAZIR">Oturuma Hazır</option>
                <option value="INSAAT_HALINDE">İnşaat Halinde</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sakin / Kullanım */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Sakin ve Kullanım</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Sakin Durumu</label>
              <select value={form.occupancyStatus} onChange={(e) => set("occupancyStatus", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                {occupancyTypes.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
                {form.occupancyStatus && !occupancyTypes.some((o) => o.code === form.occupancyStatus) && (
                  <option value={form.occupancyStatus}>{form.occupancyStatus} (pasif)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Kullanım Türü</label>
              <select value={form.usageType} onChange={(e) => set("usageType", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="KONUT">Konut</option>
                <option value="ISYERI">İşyeri</option>
                <option value="KARMA">Karma</option>
                <option value="ARSA_IMARLI">Arsa (İmarlı)</option>
                <option value="ARSA_IMARSIZ">Arsa (İmarsız)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Sahip Vatandaşlığı</label>
              <select value={form.ownerCitizenship} onChange={(e) => set("ownerCitizenship", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="TC">TC</option>
                <option value="YABANCI">Yabancı</option>
                <option value="SIRKET">Şirket</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Vatandaşlığa Uygun</label>
              <select
                value={form.isCitizenshipEligible}
                onChange={(e) => {
                  set("isCitizenshipEligible", e.target.value);
                  if (e.target.value !== "true") set("citizenshipPriceDiff", "");
                }}
                className={inputClass}
              >
                <option value="">—</option>
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
              <p className="text-[10px] text-on-surface-variant mt-1">Yabancıya satışta TR vatandaşlığı için uygun mülk</p>
            </div>
          </div>

          {/* Conditional: Vatandaşlığa Uygun = Evet → Fiyat Farkı + önizleme */}
          {form.isCitizenshipEligible === "true" && (
            <div className="bg-primary-fixed/40 rounded-2xl p-4 mt-4 space-y-3 border border-primary/20">
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">
                  Fiyat Farkı (vatandaşlık satışı için)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.citizenshipPriceDiff}
                  onChange={(e) => set("citizenshipPriceDiff", e.target.value)}
                  placeholder="0 (fark yoksa boş bırakın)"
                  className={inputClass}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Vatandaşlık programı kapsamındaki yabancı alıcıdan istenen ek tutar.
                </p>
              </div>
              {form.price && parseFloat(form.price) > 0 && (
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                    Vatandaşlığa Uygun Fiyatı (önizleme)
                  </p>
                  <p className="text-lg font-black text-primary">
                    {(parseFloat(form.price) + (parseFloat(form.citizenshipPriceDiff) || 0)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
                    <span className="text-xs text-on-surface-variant ml-2">
                      = {parseFloat(form.price).toLocaleString("tr-TR")}
                      {form.citizenshipPriceDiff && parseFloat(form.citizenshipPriceDiff) > 0 && ` + ${parseFloat(form.citizenshipPriceDiff).toLocaleString("tr-TR")}`}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ek Özellikler */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Ek Özellikler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "hasElevator", label: "Asansör" },
              { name: "hasParking", label: "Otopark" },
              { name: "hasBalcony", label: "Balkon" },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">{f.label}</label>
                <select value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  <option value="true">Var</option>
                  <option value="false">Yok</option>
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Cephe</label>
              <select value={form.facingDirection} onChange={(e) => set("facingDirection", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="KUZEY">Kuzey</option>
                <option value="GUNEY">Güney</option>
                <option value="DOGU">Doğu</option>
                <option value="BATI">Batı</option>
                <option value="KUZEY_DOGU">Kuzey-Doğu</option>
                <option value="KUZEY_BATI">Kuzey-Batı</option>
                <option value="GUNEY_DOGU">Güney-Doğu</option>
                <option value="GUNEY_BATI">Güney-Batı</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Mutfak</label>
              <select value={form.kitchenType} onChange={(e) => set("kitchenType", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="ACIK">Açık</option>
                <option value="KAPALI">Kapalı</option>
              </select>
            </div>
          </div>
        </div>

        {/* Genel */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Genel Bilgiler</h2>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Başlığı *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} required className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Tipi *</label>
              <select value={form.listingType} onChange={(e) => set("listingType", e.target.value)} className={inputClass}>
                {/* Eski değer listede yoksa onu da göster */}
                {form.listingType && !listingTypes.find((t) => t.code === form.listingType) && (
                  <option value={form.listingType}>{form.listingType}</option>
                )}
                {listingTypes.map((t) => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Fiyat *</label>
              <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Emlak Tipi</label>
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map((pt) => (
                <button key={pt.value} type="button" onClick={() => setPropertyType(pt.value)}
                  className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                    propertyType === pt.value ? "primary-gradient text-white shadow-lg shadow-primary/10" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  )}>{pt.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Detaylar */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Detaylar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { field: "area", label: "m²", type: "number" },
              { field: "rooms", label: "Oda", type: "text" },
              { field: "bathrooms", label: "Banyo", type: "number" },
              { field: "floor", label: "Kat", type: "number" },
              { field: "totalFloors", label: "Toplam Kat", type: "number" },
              { field: "age", label: "Bina Yaşı", type: "number" },
            ].map(({ field, label, type }) => (
              <div key={field}>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">{label}</label>
                <input type={type} value={form[field]} onChange={(e) => set(field, e.target.value)} className={inputClass} />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Isıtma</label>
              <select value={form.heating} onChange={(e) => set("heating", e.target.value)} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="DOGALGAZ">Doğalgaz</option>
                <option value="MERKEZI">Merkezi</option>
                <option value="SOBA">Soba</option>
                <option value="KLIMA">Klima</option>
                <option value="YERDEN">Yerden Isıtma</option>
              </select>
            </div>
          </div>
        </div>

        {/* Konum */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Konum</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Şehir</label>
              <select
                value={form.city}
                onChange={(e) => { set("city", e.target.value); set("district", ""); }}
                className={inputClass}
              >
                <option value="">Seçiniz</option>
                {/* Legacy değeri (listeye uymayan) koru */}
                {form.city && !TURKEY_CITIES.includes(form.city) && (
                  <option value={form.city}>{form.city}</option>
                )}
                {TURKEY_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">İlçe</label>
              <select
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                disabled={!form.city}
                className={cn(inputClass, "disabled:opacity-50")}
              >
                <option value="">{form.city ? "Seçiniz" : "Önce şehir seç"}</option>
                {form.district && !getDistrictsOf(form.city).includes(form.district) && (
                  <option value={form.district}>{form.district}</option>
                )}
                {getDistrictsOf(form.city).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Mahalle</label>
              <input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Adres</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Açıklama */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Açıklama</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className={inputClass} />
        </div>

        {/* Fotoğraf & Video */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Fotoğraf ve Video</h2>
          <MediaUploader value={media} onChange={setMedia} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all">İptal</button>
          <button type="submit" disabled={saving || success}
            className={cn("px-8 py-3 text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2",
              success ? "bg-green-100 text-green-700" : "primary-gradient text-white shadow-primary/10 disabled:opacity-50"
            )}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> :
              success ? <><CheckCircle className="w-4 h-4" />Kaydedildi!</> : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
