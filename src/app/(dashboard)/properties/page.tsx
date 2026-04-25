"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, SlidersHorizontal, Plus, LayoutGrid, List, Loader2, Home,
  X, MapPin, DoorOpen, Maximize, ArrowUpDown, LayoutList, CalendarPlus, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PropertyCard, type PropertyCardData, formatPrice } from "@/components/ui/property-card";
import { PropertyDetail } from "@/components/ui/property-detail";
import { ExcelToolbar } from "@/components/ui/excel-toolbar";
import { cn } from "@/lib/utils";
import { TURKEY_CITIES } from "@/lib/turkey-locations";

interface PropertyFull extends PropertyCardData {
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  age: number | null;
  heating: string | null;
  neighborhood: string | null;
  address: string | null;
  description: string | null;
}

const DEFAULT_LISTING_LABELS: Record<string, string> = { SATILIK: "Satılık", KIRALIK: "Kiralık", ARSIV: "Arşiv" };
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil Ev" };
const statusLabels: Record<string, string> = { ACTIVE: "Aktif", SOLD: "Satıldı", RENTED: "Kiralandı", INACTIVE: "Pasif" };
const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SOLD: "bg-secondary-container text-primary",
  RENTED: "bg-tertiary-fixed text-tertiary",
  INACTIVE: "bg-surface-container-high text-on-surface-variant",
};

type ViewMode = "grid" | "compact" | "list";

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-on-surface-variant"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...</div>}>
      <PropertiesPageInner />
    </Suspense>
  );
}

function PropertiesPageInner() {
  const router = useRouter();
  const urlParams = useSearchParams();
  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyFull | null>(null);
  const [search, setSearch] = useState(urlParams.get("search") || "");

  useEffect(() => {
    const q = urlParams.get("search") || "";
    setSearch(q);
  }, [urlParams]);
  const [listingType, setListingType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [city, setCity] = useState("");
  // Track B yeni filtreler
  const [projectId, setProjectId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [usageType, setUsageType] = useState("");
  const [occupancyStatus, setOccupancyStatus] = useState("");
  const [ownerCitizenship, setOwnerCitizenship] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string; blocks: { id: string; name: string }[] }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const [listingTypes, setListingTypes] = useState<{ code: string; label: string }[]>([]);

  const listingLabels: Record<string, string> = {
    ...DEFAULT_LISTING_LABELS,
    ...Object.fromEntries(listingTypes.map((t) => [t.code, t.label])),
  };

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const activeFilterCount = [
    propertyType, status, minPrice, maxPrice, rooms, minArea, maxArea, city,
    projectId, blockId, usageType, occupancyStatus, ownerCitizenship, assignedAgentId,
  ].filter(Boolean).length;

  const selectedProjectBlocks = projects.find((p) => p.id === projectId)?.blocks ?? [];

  useEffect(() => {
    fetch("/api/projects").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setProjects(data);
    }).catch(() => {});
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setUsers(data.filter((u: { isActive: boolean }) => u.isActive));
    }).catch(() => {});
    fetch("/api/room-types").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setRoomTypes(data);
    }).catch(() => {});
    fetch("/api/listing-types").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setListingTypes(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, listingType, propertyType, status, minPrice, maxPrice, rooms, minArea, maxArea, city, projectId, blockId, usageType, occupancyStatus, ownerCitizenship, assignedAgentId, sortBy, sortOrder]);

  async function fetchProperties() {
    setLoading(true);
    const params = new URLSearchParams({
      ...(search && { search }),
      ...(listingType && { listingType }),
      ...(propertyType && { propertyType }),
      ...(status && { status }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
      ...(rooms && { rooms }),
      ...(minArea && { minArea }),
      ...(maxArea && { maxArea }),
      ...(city && { city }),
      ...(projectId && { projectId }),
      ...(blockId && { blockId }),
      ...(usageType && { usageType }),
      ...(occupancyStatus && { occupancyStatus }),
      ...(ownerCitizenship && { ownerCitizenship }),
      ...(assignedAgentId && { assignedAgentId }),
      sortBy,
      sortOrder,
    });
    const res = await fetch(`/api/properties?${params}`);
    const data = await res.json();
    setProperties(data.properties || []);
    setLoading(false);
  }

  function clearFilters() {
    setPropertyType(""); setStatus(""); setMinPrice(""); setMaxPrice("");
    setRooms(""); setMinArea(""); setMaxArea(""); setCity("");
    setProjectId(""); setBlockId(""); setUsageType(""); setOccupancyStatus("");
    setOwnerCitizenship(""); setAssignedAgentId("");
  }

  async function handleSelectProperty(p: PropertyCardData) {
    if (selectedProperty?.id === p.id) return;
    try {
      const res = await fetch(`/api/properties/${p.id}`);
      const data = await res.json();
      setSelectedProperty(data);
    } catch {
      setSelectedProperty(null);
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="flex gap-8 overflow-hidden h-[calc(100vh-120px)]">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col no-scrollbar overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Portföy</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-medium">{properties.length} ilan</p>
          </div>
          <div className="flex items-center gap-3">
            <ExcelToolbar
              exportUrl="/api/properties/export"
              importUrl="/api/properties/import"
              templateUrl="/api/properties/import/template"
              label="ilan"
              onImportSuccess={fetchProperties}
              importGuide={[
                { columnName: "Başlık", description: "Zorunlu, ilan adı" },
                { columnName: "Tip", description: "Satılık / Kiralık" },
                { columnName: "Emlak Tipi", description: "Daire / Villa / Arsa / İşyeri / Müstakil Ev" },
                { columnName: "Durum", description: "Aktif / Satıldı / Kiralandı / Pasif (opsiyonel)" },
                { columnName: "Fiyat", description: "Sayı, TL" },
                { columnName: "Para Birimi", description: "TRY / USD / EUR (varsayılan TRY)" },
                { columnName: "m², Banyo, Kat, Toplam Kat, Bina Yaşı", description: "Sayısal, opsiyonel" },
                { columnName: "Oda", description: "1+1, 2+1, 3+1 vb." },
                { columnName: "Isıtma", description: "DOGALGAZ / MERKEZI / SOBA / KLIMA / YERDEN" },
                { columnName: "Şehir / İlçe / Mahalle / Adres", description: "Metin, opsiyonel" },
              ]}
            />
            <Link href="/properties/new"
              className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" />Yeni İlan
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input type="text" placeholder="İlan ara (başlık, adres, şehir)..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
            </div>
            <select value={listingType} onChange={(e) => setListingType(e.target.value)}
              className="px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm font-medium">
              <option value="">Tüm İlan Tipleri</option>
              {listingTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-1 bg-surface-container-low rounded-xl px-1">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface-variant">
                <option value="createdAt">Tarihe Göre</option>
                <option value="price">Fiyata Göre</option>
                <option value="area">Alana Göre</option>
              </select>
              <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors" title={sortOrder === "asc" ? "Artan" : "Azalan"}>
                <ArrowUpDown className={cn("w-4 h-4 transition-transform", sortOrder === "asc" && "rotate-180")} />
              </button>
            </div>

            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                showFilters || activeFilterCount > 0 ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              )}>
              <SlidersHorizontal className="w-4 h-4" />
              Filtreler
              {activeFilterCount > 0 && (
                <span className="bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>

            {/* View Mode */}
            <div className="flex bg-surface-container-low p-1 rounded-xl">
              <button onClick={() => setViewMode("grid")} title="Büyük Kart"
                className={cn("px-3 py-2 rounded-lg transition-all", viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("compact")} title="Küçük Kart"
                className={cn("px-3 py-2 rounded-lg transition-all", viewMode === "compact" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}>
                <LayoutList className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} title="Liste"
                className={cn("px-3 py-2 rounded-lg transition-all", viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-on-surface">Gelişmiş Filtreler</h3>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                        <X className="w-3 h-3" />Temizle
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Emlak Tipi</option>
                      <option value="DAIRE">Daire</option>
                      <option value="VILLA">Villa</option>
                      <option value="ARSA">Arsa</option>
                      <option value="ISYERI">İşyeri</option>
                      <option value="MUSTAKILEV">Müstakil Ev</option>
                    </select>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Durum</option>
                      <option value="ACTIVE">Aktif</option>
                      <option value="SOLD">Satıldı</option>
                      <option value="RENTED">Kiralandı</option>
                      <option value="INACTIVE">Pasif</option>
                    </select>
                    <select value={city} onChange={(e) => setCity(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Şehir</option>
                      {TURKEY_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select value={rooms} onChange={(e) => setRooms(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Oda Türü</option>
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.name}>{rt.name}</option>
                      ))}
                    </select>
                    <input type="number" placeholder="Min Fiyat" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                    <input type="number" placeholder="Max Fiyat" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                    <input type="number" placeholder="Min m²" value={minArea} onChange={(e) => setMinArea(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                    <input type="number" placeholder="Max m²" value={maxArea} onChange={(e) => setMaxArea(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />

                    {/* Track B yeni filtreler */}
                    <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setBlockId(""); }}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Proje</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select value={blockId} onChange={(e) => setBlockId(e.target.value)}
                      disabled={!projectId || selectedProjectBlocks.length === 0}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm disabled:opacity-50">
                      <option value="">Blok</option>
                      {selectedProjectBlocks.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <select value={usageType} onChange={(e) => setUsageType(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Kullanım</option>
                      <option value="KONUT">Konut</option>
                      <option value="ISYERI">İşyeri</option>
                      <option value="KARMA">Karma</option>
                      <option value="ARSA_IMARLI">Arsa (İmarlı)</option>
                      <option value="ARSA_IMARSIZ">Arsa (İmarsız)</option>
                    </select>
                    <select value={occupancyStatus} onChange={(e) => setOccupancyStatus(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Sakin Durumu</option>
                      <option value="SAHIBI_OTURUYOR">Sahibi Oturuyor</option>
                      <option value="KIRACILI">Kiracılı</option>
                      <option value="BOS">Boş</option>
                      <option value="ARSIV">Arşiv</option>
                    </select>
                    <select value={ownerCitizenship} onChange={(e) => setOwnerCitizenship(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Vatandaşlık</option>
                      <option value="TC">TC</option>
                      <option value="YABANCI">Yabancı</option>
                    </select>
                    <select value={assignedAgentId} onChange={(e) => setAssignedAgentId(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="">Personel</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />Yükleniyor...
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <Home className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">İlan bulunamadı</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className={cn("grid gap-6 pb-10", selectedProperty ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2")}>
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} isSelected={selectedProperty?.id === p.id}
                onClick={() => handleSelectProperty(p)} onDoubleClick={() => router.push(`/properties/${p.id}`)} />
            ))}
          </div>

        ) : viewMode === "compact" ? (
          <div className={cn("grid gap-3 pb-10", selectedProperty ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
            {properties.map((p) => (
              <CompactCard key={p.id} property={p} isSelected={selectedProperty?.id === p.id}
                onClick={() => handleSelectProperty(p)} onDoubleClick={() => router.push(`/properties/${p.id}`)} />
            ))}
          </div>

        ) : (
          <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/10 pb-10">
            <table className="w-full">
              <thead className="bg-surface-container-low sticky top-0 z-10">
                <tr>
                  {[
                    { label: "İlan", field: null },
                    { label: "Proje/Blok/Daire", field: null },
                    { label: "Tip", field: null },
                    { label: "Fiyat", field: "price" },
                    { label: "Konum", field: "city" },
                    { label: "Durum", field: null },
                    { label: "Grş.", field: null },
                    { label: "Danışman", field: null },
                  ].map(({ label, field }) => (
                    <th key={label} className="text-left px-4 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                      {field ? (
                        <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-primary transition-colors">
                          {label}
                          <ArrowUpDown className={cn("w-3 h-3", sortBy === field && "text-primary")} />
                        </button>
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => {
                  const projBlock = [p.project?.name, p.block?.name, p.unitNumber].filter(Boolean).join(" / ");
                  return (
                    <tr key={p.id} onClick={() => handleSelectProperty(p)}
                      className={cn("border-t border-outline-variant/10 hover:bg-surface-container-low transition-all cursor-pointer",
                        selectedProperty?.id === p.id && "bg-primary/5"
                      )}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-container shrink-0">
                            {p.images[0] ? (
                              <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                                <Home className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-primary hover:underline">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-on-surface-variant">
                        {projBlock || <span className="text-on-surface-variant/40">—</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">
                        {listingLabels[p.listingType]} · {propertyTypeLabels[p.propertyType]}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-on-surface">{formatPrice(p.price, p.currency)}</td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          {[p.district, p.city].filter(Boolean).join(", ") || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase", statusColors[p.status])}>
                          {statusLabels[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {p._count && p._count.appointments > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary" title={`${p._count.appointments} görüşme`}>
                              <MessageSquare className="w-3 h-3" />
                              {p._count.appointments}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/calendar?newPropertyId=${p.id}`);
                            }}
                            title="Görüşme ekle"
                            className="w-7 h-7 rounded-lg bg-primary-fixed text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-colors"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{p.assignedAgent?.name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedProperty && (
          <PropertyDetail property={selectedProperty} onClose={() => setSelectedProperty(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CompactCard({ property: p, isSelected, onClick, onDoubleClick }: {
  property: PropertyCardData;
  isSelected?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}) {
  return (
    <div onClick={onClick} onDoubleClick={onDoubleClick}
      className={cn(
        "group bg-surface-container-lowest rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5",
        isSelected && "ring-2 ring-primary/30 shadow-md"
      )}>
      <div className="relative h-28 overflow-hidden bg-surface-container-high">
        {p.images[0] ? (
          <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
            <Home className="w-8 h-8" />
          </div>
        )}
        <span className={cn("absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase", statusColors[p.status])}>
          {statusLabels[p.status]}
        </span>
        <span className="absolute bottom-2 left-2 glass-badge text-[9px] px-1.5 py-0.5 rounded font-bold text-primary">
          {DEFAULT_LISTING_LABELS[p.listingType] || p.listingType}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{p.title}</p>
        <p className="text-[10px] font-black text-primary mt-1">{formatPrice(p.price, p.currency)}</p>
        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-on-surface-variant">
          {p.rooms && (
            <span className="flex items-center gap-0.5">
              <DoorOpen className="w-2.5 h-2.5" />{p.rooms}
            </span>
          )}
          {p.area && (
            <span className="flex items-center gap-0.5">
              <Maximize className="w-2.5 h-2.5" />{p.area}m²
            </span>
          )}
          {(p.district || p.city) && (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 shrink-0" />{p.district || p.city}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
