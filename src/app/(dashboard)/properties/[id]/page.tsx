"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import {
  ArrowLeft,
  DoorOpen,
  Maximize,
  Bath,
  Layers,
  Calendar,
  Flame,
  Phone,
  Share2,
  MapPin,
  Home,
  Loader2,
  Send,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Video,
  Image as ImageIcon,
  Check,
  Info,
  UserPlus,
  Search,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { HelpButton } from "@/components/ui/help-button";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { cn } from "@/lib/utils";

interface MatchEntry {
  id: string;
  matchScore: number | null;
  status: "SUGGESTED" | "INTERESTED" | "REJECTED";
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    stage: string | null;
    customerType: string;
    photoUrl: string | null;
  };
}

interface PropertyContract {
  id: string;
  contractType: "KIRA" | "SATIS" | "KOMISYON";
  title: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "RENEWED" | "TERMINATED";
  startDate: string;
  endDate: string | null;
  customer: { firstName: string; lastName: string } | null;
  _count: { attachments: number };
}

interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface Property {
  id: string;
  title: string;
  listingType: string;
  propertyType: string;
  price: number;
  currency: string;
  area: number | null;
  rooms: string | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  age: number | null;
  heating: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  description: string | null;
  status: string;
  assignedAgentId: string | null;
  branchId: string | null;
  assignedAgent: { name: string } | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
  createdAt: string;

  constructionStatus: "INSAAT_HALINDE" | "OTURUMA_HAZIR" | null;
  hasTitleDeed: boolean | null;
  kitchenType: "ACIK" | "KAPALI" | null;
}

const DEFAULT_LISTING_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  ARSIV: "Arşiv",
};
const typeLabels: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  ARSA: "Arsa",
  ISYERI: "İşyeri",
  MUSTAKILEV: "Müstakil Ev",
};
const statusLabels: Record<string, string> = {
  ACTIVE: "Aktif",
  SOLD: "Satıldı",
  RENTED: "Kiralandı",
  INACTIVE: "Pasif",
};
const heatingLabels: Record<string, string> = {
  DOGALGAZ: "Doğalgaz",
  MERKEZI: "Merkezi",
  SOBA: "Soba",
  KLIMA: "Klima",
  YERDEN: "Yerden Isıtma",
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(
    price
  );
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const confirm = useConfirm();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [listingTypeCatalog, setListingTypeCatalog] = useState<{ code: string; label: string }[]>([]);

  const listingLabels: Record<string, string> = {
    ...DEFAULT_LISTING_LABELS,
    ...Object.fromEntries(listingTypeCatalog.map((t) => [t.code, t.label])),
  };
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchInfoOpen, setMatchInfoOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<CustomerSearchResult[]>([]);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contracts, setContracts] = useState<PropertyContract[]>([]);

  // Galeri klavye navigasyonu — ←/→ ile foto geçişi, Esc lightbox kapama
  useEffect(() => {
    if (!property || property.images.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      // Form/input alanı odaklanmışsa karışmasın
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveImg((i) => (i - 1 + property.images.length) % property.images.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveImg((i) => (i + 1) % property.images.length);
      } else if (e.key === "Escape" && lightbox) {
        setLightbox(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [property, lightbox]);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((res) => res.json())
      .then((data) => { setProperty(data); setLoading(false); })
      .catch(() => setLoading(false));
    reloadMatches();
    fetch(`/api/contracts?propertyId=${params.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setContracts(Array.isArray(data) ? data : []))
      .catch(() => setContracts([]));
    fetch("/api/listing-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setListingTypeCatalog(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function reloadMatches() {
    setMatchesLoading(true);
    fetch(`/api/properties/${params.id}/matches`)
      .then((r) => r.json())
      .then((data) => { setMatches(Array.isArray(data) ? data : []); setMatchesLoading(false); })
      .catch(() => setMatchesLoading(false));
  }

  async function updateMatchStatus(matchId: string, status: "INTERESTED" | "REJECTED" | "SUGGESTED") {
    // Optimistic update
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status } : m));
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) reloadMatches();
    // Rejected'ları listeden düşür (UI'da zaten default filtre)
    if (status === "REJECTED") {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    }
  }

  function searchCustomers(q: string) {
    setAddQuery(q);
    if (addTimer.current) clearTimeout(addTimer.current);
    addTimer.current = setTimeout(async () => {
      const url = q.length >= 2
        ? `/api/customers?search=${encodeURIComponent(q)}&limit=10`
        : `/api/customers?sortBy=createdAt&sortOrder=desc&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      setAddResults(Array.isArray(data.customers) ? data.customers : []);
    }, 200);
  }

  async function openAddCustomer() {
    const willOpen = !showAddCustomer;
    setShowAddCustomer(willOpen);
    if (willOpen) {
      setAddQuery("");
      // açılır açılmaz son eklenen müşterileri göster
      const res = await fetch(`/api/customers?sortBy=createdAt&sortOrder=desc&limit=10`);
      const data = await res.json();
      setAddResults(Array.isArray(data.customers) ? data.customers : []);
    }
  }

  async function addCustomerManually(customerId: string) {
    await fetch(`/api/properties/${params.id}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    setShowAddCustomer(false);
    setAddQuery("");
    setAddResults([]);
    reloadMatches();
  }

  const sessionUser = session?.user as unknown as { id?: string; role?: string; branchId?: string | null; authorizedBranchIds?: string[] } | undefined;
  const canEdit = useMemo(() => {
    if (!sessionUser || !property) return false;
    if (sessionUser.role === "ADMIN") return true;
    if (sessionUser.role === "MANAGER") {
      if (!property.branchId) return false;
      const branchIds = [sessionUser.branchId, ...(sessionUser.authorizedBranchIds ?? [])].filter((b): b is string => Boolean(b));
      return branchIds.includes(property.branchId);
    }
    return property.assignedAgentId === sessionUser.id;
  }, [sessionUser, property]);
  const canDelete = sessionUser?.role === "ADMIN";

  async function handleDelete() {
    if (!property) return;
    const ok = await confirm({
      title: `"${property.title}" ilanını sil?`,
      message: "Bu ilan ve tüm görselleri kalıcı olarak silinecek. Geri alınamaz.",
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/properties/${property.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "İlan silinemedi");
      return;
    }
    toast.success("İlan silindi");
    router.push("/properties");
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Yükleniyor...
      </div>
    );
  if (!property)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
        <Home className="w-12 h-12 opacity-30 mb-4" />
        İlan bulunamadı
      </div>
    );

  const specs = [
    {
      icon: DoorOpen,
      label: "Oda",
      value: property.rooms,
    },
    {
      icon: Maximize,
      label: "Alan",
      value: property.area ? `${property.area} m²` : null,
    },
    {
      icon: Bath,
      label: "Banyo",
      value: property.bathrooms?.toString(),
    },
    {
      icon: Layers,
      label: "Kat",
      value:
        property.floor != null
          ? `${property.floor}/${property.totalFloors || "?"}`
          : null,
    },
    {
      icon: Calendar,
      label: "Bina Yaşı",
      value:
        property.constructionStatus === "INSAAT_HALINDE"
          ? "İnşaat Halinde"
          : property.constructionStatus === "OTURUMA_HAZIR" && (property.age == null || property.age === 0)
          ? "Oturuma Hazır"
          : property.age != null
          ? `${property.age}`
          : null,
    },
    {
      icon: Flame,
      label: "Isıtma",
      value: property.heating
        ? heatingLabels[property.heating] || property.heating
        : null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/properties"
          className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">
              {property.title}
            </h1>
            <HelpButton page="properties-detail" title="Mülk Detayı" />
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant mt-1">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {[property.neighborhood, property.district, property.city]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="glass-badge px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-widest text-primary">
            {listingLabels[property.listingType]}
          </span>
          {canEdit && (
            <Link href={`/properties/${property.id}/edit`}
              className="p-2 hover:bg-primary-fixed rounded-full text-on-surface-variant hover:text-primary transition-colors"
              title="Düzenle">
              <Pencil className="w-5 h-5" />
            </Link>
          )}
          <button
            onClick={async () => {
              const url = window.location.href;
              const title = property.title;
              if (navigator.share) {
                try { await navigator.share({ title, url }); } catch { /* cancelled */ }
              } else {
                await navigator.clipboard.writeText(url);
                alert("İlan bağlantısı panoya kopyalandı.");
              }
            }}
            className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
            title="Paylaş">
            <Share2 className="w-5 h-5" />
          </button>
          {canDelete && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-error-container rounded-full text-on-surface-variant hover:text-error transition-colors"
              title="Sil">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden">
        {/* Main image */}
        <div className="h-80 bg-surface-container-high flex items-center justify-center relative group cursor-pointer"
          onClick={() => property.images.length > 0 && setLightbox(true)}>
          {property.images[activeImg] ? (
            property.images[activeImg].url.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
              <video src={property.images[activeImg].url} className="w-full h-full object-cover" controls />
            ) : failedImages.has(activeImg) ? (
              <div className="flex flex-col items-center text-on-surface-variant/40">
                <Home className="w-16 h-16" />
                <span className="text-xs font-medium mt-2">Görsel yüklenemedi</span>
                <span className="text-[10px] mt-1">Dosya bozuk olabilir veya silinmiş olabilir</span>
              </div>
            ) : (
              <img
                src={property.images[activeImg].url}
                alt={property.title}
                referrerPolicy="no-referrer"
                onError={() => setFailedImages((s) => new Set(s).add(activeImg))}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )
          ) : (
            <div className="flex flex-col items-center text-on-surface-variant/30">
              <Home className="w-16 h-16" />
            </div>
          )}
          <div className="absolute top-4 left-4 glass-badge px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-primary">
            {typeLabels[property.propertyType]}
          </div>
          {property.images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg - 1 + property.images.length) % property.images.length); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg + 1) % property.images.length); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                {activeImg + 1} / {property.images.length}
              </span>
            </>
          )}
        </div>
        {/* Thumbnails */}
        {property.images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar bg-surface-container-low/50">
            {property.images.map((img, i) => (
              <button key={img.id} onClick={() => setActiveImg(i)}
                className={cn("shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  i === activeImg ? "border-primary shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-100"
                )}>
                {img.url.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <div className="w-full h-full bg-surface-container flex items-center justify-center">
                    <Video className="w-4 h-4 text-primary" />
                  </div>
                ) : failedImages.has(i) ? (
                  <div className="w-full h-full bg-surface-container flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-on-surface-variant/50" />
                  </div>
                ) : (
                  <img
                    src={img.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((s) => new Set(s).add(i))}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && property.images[activeImg] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(false)}>
              <X className="w-8 h-8" />
            </button>
            {property.images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg - 1 + property.images.length) % property.images.length); }}
                  className="absolute left-4 text-white/70 hover:text-white">
                  <ChevronLeft className="w-10 h-10" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg + 1) % property.images.length); }}
                  className="absolute right-4 text-white/70 hover:text-white">
                  <ChevronRight className="w-10 h-10" />
                </button>
              </>
            )}
            <img src={property.images[activeImg].url} alt={property.title}
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl" />
            <span className="absolute bottom-4 text-white/60 text-sm">{activeImg + 1} / {property.images.length}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Stats */}
          <section className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {specs.map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.label}
                  className="bg-surface-container-low p-4 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-surface-container transition-all"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm mb-2 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-bold text-on-surface">
                    {d.value || "-"}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </section>

          {/* Description */}
          {property.description && (
            <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
              <h2 className="text-xl font-bold tracking-tight mb-4 text-on-surface border-l-4 border-primary pl-4">
                Açıklama
              </h2>
              <LinkifiedText
                text={property.description}
                className="text-on-surface-variant leading-relaxed block"
              />
            </section>
          )}

          {/* Details Card */}
          <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
            <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">
              Detaylı Bilgiler
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailItem label="Emlak Tipi" value={typeLabels[property.propertyType]} />
              <DetailItem label="Durum" value={statusLabels[property.status]} />
              <DetailItem label="Oda" value={property.rooms} />
              <DetailItem label="Alan" value={property.area ? `${property.area} m²` : null} />
              <DetailItem label="Banyo" value={property.bathrooms?.toString()} />
              <DetailItem label="Kat" value={property.floor != null ? `${property.floor}/${property.totalFloors || "?"}` : null} />
              <DetailItem
                label="Bina Yaşı"
                value={
                  property.constructionStatus === "INSAAT_HALINDE"
                    ? "İnşaat Halinde"
                    : property.age != null
                    ? String(property.age)
                    : null
                }
              />
              <DetailItem label="Isıtma" value={property.heating ? heatingLabels[property.heating] || property.heating : null} />
              <DetailItem
                label="İnşaat Durumu"
                value={
                  property.constructionStatus === "INSAAT_HALINDE"
                    ? "İnşaat Halinde"
                    : property.constructionStatus === "OTURUMA_HAZIR"
                    ? "Oturuma Hazır"
                    : null
                }
              />
              <DetailItem
                label="Tapu Kaydı"
                value={property.hasTitleDeed == null ? null : property.hasTitleDeed ? "Var" : "Yok"}
              />
              <DetailItem
                label="Mutfak"
                value={property.kitchenType === "ACIK" ? "Açık" : property.kitchenType === "KAPALI" ? "Kapalı" : null}
              />
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4">
          <div className="sticky top-28 space-y-6">
            {/* Price Card */}
            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl border border-outline-variant/10">
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Fiyat
              </span>
              <div className="text-4xl font-black text-on-surface mt-1">
                {formatPrice(property.price, property.currency)}
              </div>

              {property.owner ? (
                <div className="space-y-3 mt-6">
                  <div className="bg-surface-container-low p-4 rounded-2xl">
                    <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-1">İlan Sahibi</p>
                    <Link href={`/customers/${property.owner.id}`}
                      className="text-sm font-bold text-primary hover:underline">
                      {property.owner.firstName} {property.owner.lastName}
                    </Link>
                    {property.owner.phone && <p className="text-xs text-on-surface-variant mt-0.5">{property.owner.phone}</p>}
                  </div>
                  {property.owner.phone ? (
                    <a href={`tel:${property.owner.phone}`}
                      className="w-full primary-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                      <Phone className="w-4 h-4" />
                      Sahibini Ara
                    </a>
                  ) : (
                    <div className="w-full bg-surface-container-low text-on-surface-variant font-medium py-4 rounded-2xl text-center text-sm">
                      Sahibin telefon numarası yok
                    </div>
                  )}
                  {property.owner.email && (
                    <a href={`mailto:${property.owner.email}?subject=${encodeURIComponent(property.title)}`}
                      className="w-full bg-surface-container-low text-on-surface font-bold py-4 rounded-2xl hover:bg-surface-container transition-all flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      E-posta Gönder
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-6 p-4 bg-surface-container-low rounded-2xl text-center">
                  <p className="text-xs text-on-surface-variant mb-2">Bu ilana sahip atanmamış</p>
                  <Link href={`/properties/${property.id}/edit`}
                    className="text-xs font-bold text-primary hover:underline">
                    Düzenle → Sahip ata
                  </Link>
                </div>
              )}

              {property.assignedAgent && (
                <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container font-bold shadow-md">
                    {property.assignedAgent.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">
                      {property.assignedAgent.name}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Sorumlu Danışman
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10">
              <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Konum
              </h3>
              <p className="text-sm text-on-surface-variant">
                {[
                  property.neighborhood,
                  property.district,
                  property.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {property.address && (
                <p className="text-sm text-on-surface-variant mt-1">
                  {property.address}
                </p>
              )}
            </div>

            {/* Matched Customers */}
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-on-surface flex items-center gap-2">
                  İlgili Müşteriler
                  {matches.length > 0 && (
                    <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{matches.length}</span>
                  )}
                  <button onClick={() => setMatchInfoOpen(!matchInfoOpen)} className="text-on-surface-variant hover:text-primary transition-colors" title="Nasıl çalışır?">
                    <Info className="w-4 h-4" />
                  </button>
                </h3>
                {canEdit && (
                  <button onClick={openAddCustomer}
                    className="text-xs font-bold text-primary hover:bg-primary-fixed px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />Ekle
                  </button>
                )}
              </div>

              {matchInfoOpen && (
                <div className="bg-primary-fixed/60 p-3 rounded-xl text-xs text-on-surface-variant mb-3 leading-relaxed">
                  <strong className="text-primary">Öneriler (⚡) otomatiktir:</strong> Müşterilerin talep profiline göre (bütçe, şehir, tip, m²) skorlanır.
                  <br />✓ <strong>İlgileniyor</strong> olarak işaretlediklerinizi yukarı taşır. ✗ ile reddettikleriniz bir daha önerilmez.
                </div>
              )}

              {showAddCustomer && (
                <div className="bg-surface-container-low p-3 rounded-xl mb-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
                    <input
                      value={addQuery}
                      onChange={(e) => searchCustomers(e.target.value)}
                      placeholder="Müşteri ara (ad, telefon)..."
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {addResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {addResults.map((c) => (
                        <button key={c.id} onClick={() => addCustomerManually(c.id)}
                          className="w-full text-left p-2 hover:bg-white rounded-lg text-xs font-medium transition-colors">
                          {c.firstName} {c.lastName}
                          {c.phone && <span className="text-on-surface-variant ml-2">· {c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {addQuery.length < 2 && addResults.length > 0 && (
                    <p className="text-[10px] text-on-surface-variant text-center pt-1">Son eklenen müşteriler · aramak için yazın</p>
                  )}
                  {addQuery.length >= 2 && addResults.length === 0 && (
                    <p className="text-xs text-on-surface-variant text-center py-2">Bu aramaya uygun müşteri bulunamadı</p>
                  )}
                </div>
              )}

              {matchesLoading ? (
                <p className="text-sm text-on-surface-variant flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Hesaplanıyor...
                </p>
              ) : matches.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Talep profiline uygun müşteri bulunamadı. Manuel eklemek için <strong>Ekle</strong> butonunu kullanın.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((m) => (
                    <div key={m.id}
                      className={cn("p-3 rounded-2xl transition-all group",
                        m.status === "INTERESTED" ? "bg-green-50 border border-green-200" : "bg-surface-container-low hover:bg-surface-container"
                      )}>
                      <div className="flex items-center gap-3">
                        {m.customer.photoUrl ? (
                          <SafeImage src={m.customer.photoUrl} alt="" width={36} height={36} className="w-9 h-9 rounded-xl object-cover object-top shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold shrink-0">
                            {m.customer.firstName.charAt(0)}{m.customer.lastName.charAt(0)}
                          </div>
                        )}
                        <Link href={`/customers/${m.customer.id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-primary hover:underline truncate">
                              {m.customer.firstName} {m.customer.lastName}
                            </span>
                            {m.status === "INTERESTED" && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded font-black uppercase tracking-wider">✓ İlgileniyor</span>
                            )}
                            {m.status === "SUGGESTED" && m.matchScore != null && (
                              <span className="text-[9px] text-on-surface-variant">⚡ Öneri</span>
                            )}
                          </div>
                          {m.customer.phone && (
                            <span className="text-xs text-on-surface-variant">{m.customer.phone}</span>
                          )}
                        </Link>
                        {m.matchScore != null && (
                          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0",
                            m.matchScore >= 70 ? "bg-green-100 text-green-700" :
                            m.matchScore >= 50 ? "bg-tertiary-fixed text-tertiary" :
                            "bg-surface-container text-on-surface-variant"
                          )}>%{Math.round(m.matchScore)}</span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.status !== "INTERESTED" && (
                            <button onClick={() => updateMatchStatus(m.id, "INTERESTED")}
                              className="flex-1 text-[10px] font-bold py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center justify-center gap-1">
                              <Check className="w-3 h-3" /> İlgileniyor
                            </button>
                          )}
                          {m.status === "INTERESTED" && (
                            <button onClick={() => updateMatchStatus(m.id, "SUGGESTED")}
                              className="flex-1 text-[10px] font-bold py-1.5 bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-container-high">
                              Geri Al
                            </button>
                          )}
                          <button onClick={() => updateMatchStatus(m.id, "REJECTED")}
                            className="flex-1 text-[10px] font-bold py-1.5 bg-error-container/30 text-error rounded-lg hover:bg-error-container/50 flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sözleşmeler */}
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-on-surface flex items-center gap-2">
                  Sözleşmeler
                  {contracts.length > 0 && (
                    <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{contracts.length}</span>
                  )}
                </h3>
                <Link
                  href={`/contracts/new?propertyId=${params.id}`}
                  className="text-xs font-bold text-primary hover:bg-primary-fixed px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Yeni
                </Link>
              </div>
              {contracts.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Bu mülk için sözleşme yok.{" "}
                  <Link href={`/contracts/new?propertyId=${params.id}`} className="text-primary font-bold hover:underline">
                    Sözleşme oluştur →
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {contracts.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/contracts/${c.id}`}
                        className="flex items-center justify-between gap-3 p-3 bg-surface-container-low hover:bg-surface-container rounded-2xl transition-colors"
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
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {c.customer ? `${c.customer.firstName} ${c.customer.lastName} · ` : ""}
                            {c.amount.toLocaleString("tr-TR")} {c.currency}
                            {c._count.attachments > 0 && ` · ${c._count.attachments} ek`}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
        {label}
      </p>
      <p className="text-sm font-bold text-on-surface mt-1">{value || "-"}</p>
    </div>
  );
}
