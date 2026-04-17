"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Plus, LayoutGrid, List, Loader2, Home, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PropertyCard, type PropertyCardData, formatPrice } from "@/components/ui/property-card";
import { PropertyDetail } from "@/components/ui/property-detail";
import { cn } from "@/lib/utils";

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

const listingLabels: Record<string, string> = { SATILIK: "Satılık", KIRALIK: "Kiralık" };
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil Ev" };
const statusLabels: Record<string, string> = { ACTIVE: "Aktif", SOLD: "Satıldı", RENTED: "Kiralandı", INACTIVE: "Pasif" };
const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SOLD: "bg-secondary-container text-primary",
  RENTED: "bg-tertiary-fixed text-tertiary",
  INACTIVE: "bg-surface-container-high text-on-surface-variant",
};

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyFull | null>(null);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const activeFilterCount = [propertyType, status, minPrice, maxPrice, rooms, minArea, maxArea].filter(Boolean).length;

  useEffect(() => {
    fetchProperties();
  }, [search, listingType, propertyType, status, minPrice, maxPrice, rooms, minArea, maxArea]);

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
    });
    const res = await fetch(`/api/properties?${params}`);
    const data = await res.json();
    setProperties(data.properties || []);
    setLoading(false);
  }

  function clearFilters() {
    setPropertyType("");
    setStatus("");
    setMinPrice("");
    setMaxPrice("");
    setRooms("");
    setMinArea("");
    setMaxArea("");
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

  return (
    <div className="flex gap-8 overflow-hidden h-[calc(100vh-120px)]">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col no-scrollbar overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">
              Portföy
            </h1>
            <p className="text-on-surface-variant text-sm mt-1 font-medium">
              {properties.length} premium mülkü keşfedin
            </p>
          </div>
          <Link
            href="/properties/new"
            className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni İlan
          </Link>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input
                type="text"
                placeholder="İlan ara (başlık, adres, şehir)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <select
              value={listingType}
              onChange={(e) => setListingType(e.target.value)}
              className="px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm font-medium"
            >
              <option value="">Tümü</option>
              <option value="SATILIK">Satılık</option>
              <option value="KIRALIK">Kiralık</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                showFilters || activeFilterCount > 0
                  ? "bg-primary text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtreler
              {activeFilterCount > 0 && (
                <span className="bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="flex bg-surface-container-low p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  viewMode === "list"
                    ? "bg-white shadow-sm text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-on-surface">Gelişmiş Filtreler</h3>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                        <X className="w-3 h-3" /> Temizle
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    >
                      <option value="">Emlak Tipi</option>
                      <option value="DAIRE">Daire</option>
                      <option value="VILLA">Villa</option>
                      <option value="ARSA">Arsa</option>
                      <option value="ISYERI">İşyeri</option>
                      <option value="MUSTAKILEV">Müstakil Ev</option>
                    </select>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    >
                      <option value="">Durum</option>
                      <option value="ACTIVE">Aktif</option>
                      <option value="SOLD">Satıldı</option>
                      <option value="RENTED">Kiralandı</option>
                      <option value="INACTIVE">Pasif</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Min Fiyat"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max Fiyat"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Oda (3+1)"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Min m²"
                      value={minArea}
                      onChange={(e) => setMinArea(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max m²"
                      value={maxArea}
                      onChange={(e) => setMaxArea(e.target.value)}
                      className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Yükleniyor...
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <Home className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">İlan bulunamadı</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className={cn(
            "grid gap-8 pb-10",
            selectedProperty ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
          )}>
            {properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                isSelected={selectedProperty?.id === p.id}
                onClick={() => handleSelectProperty(p)}
                onDoubleClick={() => router.push(`/properties/${p.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">İlan</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tip</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Fiyat</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Konum</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Durum</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Danışman</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleSelectProperty(p)}
                    className="hover:bg-surface-container-low transition-all cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <span className="text-sm font-semibold text-primary">{p.title}</span>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {listingLabels[p.listingType]} - {propertyTypeLabels[p.propertyType]}
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-on-surface">
                      {formatPrice(p.price, p.currency)}
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {[p.district, p.city].filter(Boolean).join(", ")}
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase", statusColors[p.status])}>
                        {statusLabels[p.status]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {p.assignedAgent?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedProperty && (
          <PropertyDetail
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
