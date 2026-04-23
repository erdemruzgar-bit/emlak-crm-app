"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, User, X } from "lucide-react";
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

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [propertyType, setPropertyType] = useState("DAIRE");
  const [media, setMedia] = useState<MediaItem[]>([]);

  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<CustomerResult[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<CustomerResult | null>(null);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerRef = useRef<HTMLDivElement>(null);

  // Proje / Blok cascading
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [blockId, setBlockId] = useState("");

  // Otopark cascading: "" | "true" | "false"; Var → tür (ACIK/KAPALI); Kapalı → sayı
  const [hasParking, setHasParking] = useState("");
  const [parkingType, setParkingType] = useState<"" | "ACIK" | "KAPALI">("");
  const [parkingSpotCount, setParkingSpotCount] = useState("");

  // Oda tipleri (admin yönetimli)
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);

  // Şehir / İlçe cascading
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => setProjects([]));
    fetch("/api/room-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setRoomTypes(data);
      })
      .catch(() => setRoomTypes([]));
  }, []);

  const selectedProjectBlocks =
    projects.find((p) => p.id === projectId)?.blocks ?? [];

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);

    const optStr = (k: string) => {
      const v = fd.get(k);
      return v && String(v).trim() ? String(v) : undefined;
    };
    const optBool = (k: string) => {
      const v = fd.get(k);
      return v === "true" ? true : v === "false" ? false : undefined;
    };

    const body = {
      title: fd.get("title"),
      listingType: fd.get("listingType"),
      propertyType,
      price: parseFloat(fd.get("price") as string),
      currency: fd.get("currency") || "TRY",
      area: fd.get("area") ? parseFloat(fd.get("area") as string) : undefined,
      rooms: optStr("rooms"),
      bathrooms: fd.get("bathrooms") ? parseInt(fd.get("bathrooms") as string) : undefined,
      floor: fd.get("floor") ? parseInt(fd.get("floor") as string) : undefined,
      totalFloors: fd.get("totalFloors") ? parseInt(fd.get("totalFloors") as string) : undefined,
      age: fd.get("age") ? parseInt(fd.get("age") as string) : undefined,
      heating: optStr("heating"),
      city: city || undefined,
      district: district || undefined,
      neighborhood: optStr("neighborhood"),
      address: optStr("address"),
      description: optStr("description"),
      ownerId: selectedOwner?.id ?? undefined,

      // Proje/Blok/Daire
      projectId: projectId || undefined,
      blockId: blockId || undefined,
      unitNumber: optStr("unitNumber"),

      // Tapu bilgileri
      ada: optStr("ada"),
      pafta: optStr("pafta"),
      parsel: optStr("parsel"),
      bagimsizBolumNo: optStr("bagimsizBolumNo"),
      katMulkiyetiTipi: optStr("katMulkiyetiTipi"),
      hasTitleDeed: optBool("hasTitleDeed"),

      // İnşaat durumu
      constructionStatus: optStr("constructionStatus"),

      // Sakin / kullanım / vatandaşlık
      occupancyStatus: optStr("occupancyStatus"),
      ownerCitizenship: optStr("ownerCitizenship"),
      usageType: optStr("usageType"),

      // Ek özellikler
      hasElevator: optBool("hasElevator"),
      hasParking: hasParking === "true" ? true : hasParking === "false" ? false : undefined,
      parkingType: hasParking === "true" && parkingType ? parkingType : undefined,
      parkingSpotCount:
        hasParking === "true" && parkingType === "KAPALI" && parkingSpotCount
          ? parseInt(parkingSpotCount)
          : undefined,
      hasBalcony: optBool("hasBalcony"),
      facingDirection: optStr("facingDirection"),
    };

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ? JSON.stringify(data.error) : "Bir hata oluştu");
      return;
    }

    // Upload images/videos
    if (media.length > 0) {
      await fetch(`/api/properties/${data.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: media.map((m) => m.url) }),
      });
    }

    router.push(`/properties/${data.id}`);
  }

  const inputClass = "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

  const propertyTypes = [
    { value: "DAIRE", label: "Daire" },
    { value: "VILLA", label: "Villa" },
    { value: "ARSA", label: "Arsa" },
    { value: "ISYERI", label: "İşyeri" },
    { value: "MUSTAKILEV", label: "Müstakil Ev" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/properties" className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">Yeni İlan</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-error-container text-on-error-container text-sm p-4 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Genel Bilgiler */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Genel Bilgiler</h2>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Başlığı *</label>
            <input name="title" required className={inputClass} placeholder="Kadıköy'de Deniz Manzaralı 3+1 Daire" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Tipi *</label>
              <select name="listingType" required className={inputClass}>
                <option value="SATILIK">Satılık</option>
                <option value="KIRALIK">Kiralık</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Fiyat (TL) *</label>
              <input name="price" type="number" required className={inputClass} />
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

        {/* İlan Sahibi */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-4 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">İlan Sahibi</h2>
          <div ref={ownerRef} className="relative">
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
            <h2 className="text-lg font-bold text-on-surface tracking-tight">Proje / Blok / Daire</h2>
            <Link
              href="/settings/projects"
              target="_blank"
              className="text-xs font-bold text-primary hover:underline"
            >
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
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Proje</label>
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
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Blok</label>
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
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Daire No</label>
                <input name="unitNumber" placeholder="örn: 026" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* Tapu Bilgileri */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Tapu Bilgileri</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Ada</label>
              <input name="ada" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Pafta</label>
              <input name="pafta" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Parsel</label>
              <input name="parsel" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Bağımsız Bölüm No</label>
              <input name="bagimsizBolumNo" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Kat Mülkiyeti Tipi</label>
              <select name="katMulkiyetiTipi" className={inputClass} defaultValue="">
                <option value="">Seçiniz</option>
                <option value="KAT_MULKIYETI">Kat Mülkiyeti</option>
                <option value="KAT_IRTIFAKI">Kat İrtifakı</option>
                <option value="ARSA_PAYLI">Arsa Paylı</option>
                <option value="HISSELI">Hisseli</option>
                <option value="BAGIMSIZ_BOLUMSUZ">Bağımsız Bölümsüz</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Tapu Kaydı</label>
              <select name="hasTitleDeed" className={inputClass} defaultValue="">
                <option value="">—</option>
                <option value="true">Var</option>
                <option value="false">Yok</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">İnşaat Durumu</label>
              <select name="constructionStatus" className={inputClass} defaultValue="">
                <option value="">Seçiniz</option>
                <option value="OTURUMA_HAZIR">Oturuma Hazır</option>
                <option value="INSAAT_HALINDE">İnşaat Halinde</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sakin / Kullanım / Vatandaşlık */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Sakin ve Kullanım</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Sakin Durumu</label>
              <select name="occupancyStatus" className={inputClass} defaultValue="">
                <option value="">Seçiniz</option>
                <option value="SAHIBI_OTURUYOR">Sahibi Oturuyor</option>
                <option value="KIRACILI">Kiracılı</option>
                <option value="BOS">Boş</option>
                <option value="ARSIV">Arşiv</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Kullanım Türü</label>
              <select name="usageType" className={inputClass} defaultValue="">
                <option value="">Seçiniz</option>
                <option value="KONUT">Konut</option>
                <option value="ISYERI">İşyeri</option>
                <option value="KARMA">Karma</option>
                <option value="ARSA_IMARLI">Arsa (İmarlı)</option>
                <option value="ARSA_IMARSIZ">Arsa (İmarsız)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Sahip Vatandaşlığı</label>
              <select name="ownerCitizenship" className={inputClass} defaultValue="">
                <option value="">Seçiniz</option>
                <option value="TC">TC</option>
                <option value="YABANCI">Yabancı</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ek Özellikler */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Ek Özellikler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "hasElevator", label: "Asansör" },
              { name: "hasBalcony", label: "Balkon" },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">{f.label}</label>
                <select name={f.name} className={inputClass} defaultValue="">
                  <option value="">—</option>
                  <option value="true">Var</option>
                  <option value="false">Yok</option>
                </select>
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Cephe</label>
              <select name="facingDirection" className={inputClass} defaultValue="">
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
          </div>

          {/* Otopark — cascading: Var/Yok → Kapalı/Açık → sayı */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Otopark</label>
                <select
                  value={hasParking}
                  onChange={(e) => {
                    setHasParking(e.target.value);
                    if (e.target.value !== "true") {
                      setParkingType("");
                      setParkingSpotCount("");
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">—</option>
                  <option value="true">Var</option>
                  <option value="false">Yok</option>
                </select>
              </div>

              {hasParking === "true" && (
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Otopark Türü</label>
                  <select
                    value={parkingType}
                    onChange={(e) => {
                      const v = e.target.value as "" | "ACIK" | "KAPALI";
                      setParkingType(v);
                      if (v !== "KAPALI") setParkingSpotCount("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Seçiniz</option>
                    <option value="ACIK">Açık</option>
                    <option value="KAPALI">Kapalı</option>
                  </select>
                </div>
              )}

              {hasParking === "true" && parkingType === "KAPALI" && (
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                    B. Bölüme Düşen Otopark Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={parkingSpotCount}
                    onChange={(e) => setParkingSpotCount(e.target.value)}
                    placeholder="1"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detaylar */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Detaylar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "area", label: "m²", type: "number" },
              { name: "bathrooms", label: "Banyo", type: "number" },
              { name: "floor", label: "Kat", type: "number" },
              { name: "totalFloors", label: "Toplam Kat", type: "number" },
              { name: "age", label: "Bina Yaşı", type: "number" },
            ].map(({ name, label, type }) => (
              <div key={name}>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">{label}</label>
                <input name={name} type={type} className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Oda</span>
                <Link href="/settings/room-types" target="_blank" className="text-[10px] text-primary hover:underline normal-case tracking-normal">
                  yönet
                </Link>
              </label>
              <select name="rooms" className={inputClass} defaultValue="">
                <option value="">Seçiniz</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.name}>{rt.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Isıtma</label>
              <select name="heating" className={inputClass}>
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
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Konum</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Şehir</label>
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setDistrict(""); }}
                className={inputClass}
              >
                <option value="">Seçiniz</option>
                {TURKEY_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">İlçe</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!city}
                className={cn(inputClass, "disabled:opacity-50")}
              >
                <option value="">{city ? "Seçiniz" : "Önce şehir seç"}</option>
                {getDistrictsOf(city).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Mahalle</label>
              <input name="neighborhood" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Adres</label>
            <input name="address" className={inputClass} />
          </div>
        </div>

        {/* Açıklama */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Açıklama</label>
          <textarea name="description" rows={4} className={inputClass} />
        </div>

        {/* Fotoğraf & Video */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 space-y-5 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Fotoğraf ve Video</h2>
          <MediaUploader value={media} onChange={setMedia} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all">İptal</button>
          <button type="submit" disabled={loading}
            className="px-8 py-3 text-sm text-white primary-gradient font-bold rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> : "İlanı Kaydet"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
