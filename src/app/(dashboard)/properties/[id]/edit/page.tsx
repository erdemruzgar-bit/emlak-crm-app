"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, User, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { MediaUploader, type MediaItem } from "@/components/ui/media-uploader";

interface CustomerResult { id: string; label: string; }

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
  });

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
        });
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

        {/* Genel */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface">Genel Bilgiler</h2>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Başlığı *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} required className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Tipi *</label>
              <select value={form.listingType} onChange={(e) => set("listingType", e.target.value)} className={inputClass}>
                <option value="SATILIK">Satılık</option>
                <option value="KIRALIK">Kiralık</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Fiyat *</label>
              <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Emlak Tipi</label>
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
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">{label}</label>
                <input type={type} value={form[field]} onChange={(e) => set(field, e.target.value)} className={inputClass} />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Isıtma</label>
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
            {[{ field: "city", label: "Şehir" }, { field: "district", label: "İlçe" }, { field: "neighborhood", label: "Mahalle" }].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">{label}</label>
                <input value={form[field]} onChange={(e) => set(field, e.target.value)} className={inputClass} />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Adres</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Açıklama */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Açıklama</label>
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
