"use client";

import { MapPin, ArrowRight, Bookmark, Building2, Globe, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export interface PropertyCardData {
  id: string;
  title: string;
  listingType: string;
  listingTypes?: string[];
  propertyType: string;
  price: number;
  monthlyRent?: number | null;
  currency: string;
  area: number | null;
  rooms: string | null;
  city: string | null;
  district: string | null;
  status: string;
  assignedAgent: { id?: string; name: string } | null;
  branch?: { name: string } | null;
  images: { url: string }[];
  project?: { id: string; name: string } | null;
  block?: { id: string; name: string } | null;
  unitNumber?: string | null;
  occupancyStatus?: string | null;
  isCitizenshipEligible?: boolean | null;
  citizenshipPriceDiff?: number | null;
  _count?: { appointments: number };
}

const propertyTypeLabels: Record<string, string> = {
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

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SOLD: "bg-secondary-container text-primary",
  RENTED: "bg-tertiary-fixed text-tertiary",
  INACTIVE: "bg-surface-container-high text-on-surface-variant",
};

const listingLabels: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  ARSIV: "Arşiv",
};

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(
    price
  );
}

/**
 * Bir property için gösterilecek listing tiplerini ve fiyatlarını çözümler.
 * Geriye uyumluluk: listingTypes boşsa listingType tek elemanlı array gibi davranır.
 * monthlyRent null + sadece KIRALIK ise price aylık kira olarak yorumlanır (eski veri).
 */
export function resolvePropertyListing(property: {
  listingType: string;
  listingTypes?: string[];
  price: number;
  monthlyRent?: number | null;
}) {
  const types =
    property.listingTypes && property.listingTypes.length > 0
      ? property.listingTypes
      : [property.listingType];
  const showSale = types.includes("SATILIK");
  const showRent = types.includes("KIRALIK");
  // Hem K hem S → price=satış, monthlyRent=kira
  // Sadece S → price=satış
  // Sadece K + monthlyRent dolu → monthlyRent=kira (price ignore)
  // Sadece K + monthlyRent null → price=aylık kira (legacy)
  const salePrice = showSale ? property.price : null;
  let rentPrice: number | null = null;
  if (showRent) {
    if (property.monthlyRent != null) rentPrice = property.monthlyRent;
    else if (!showSale) rentPrice = property.price;
  }
  return { types, showSale, showRent, salePrice, rentPrice };
}

interface PropertyCardProps {
  property: PropertyCardData;
  isSelected?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}

export function PropertyCard({
  property,
  isSelected,
  onClick,
  onDoubleClick,
}: PropertyCardProps) {
  const location = [property.district, property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <motion.div
      layout
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "group bg-surface-container-lowest rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer",
        isSelected
          ? "ring-4 ring-primary/10 shadow-xl"
          : "hover:shadow-xl hover:-translate-y-1"
      )}
    >
      <div className="relative h-64 overflow-hidden">
        {property.images[0] ? (
          <img
            src={property.images[0].url}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="text-5xl text-on-surface-variant/30">🏠</span>
          </div>
        )}
        <div className="absolute top-4 left-4 glass-badge px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-primary">
          {propertyTypeLabels[property.propertyType] || property.propertyType}
        </div>
        <button
          className={cn(
            "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all",
            isSelected
              ? "bg-primary text-white shadow-lg"
              : "bg-white/90 backdrop-blur text-primary shadow-sm"
          )}
        >
          <Bookmark
            className={cn("w-5 h-5", isSelected && "fill-current")}
          />
        </button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0",
              statusColors[property.status]
            )}
          >
            {statusLabels[property.status] || property.status}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {(property.listingTypes && property.listingTypes.length > 0
            ? property.listingTypes
            : [property.listingType]
          ).map((t) => (
            <span
              key={t}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                t === "KIRALIK" && "bg-blue-100 text-blue-700",
                t === "SATILIK" && "bg-amber-100 text-amber-700",
                t !== "KIRALIK" && t !== "SATILIK" && "bg-surface-container-high text-on-surface-variant"
              )}
            >
              {listingLabels[t] || t}
            </span>
          ))}
          {property.rooms && (
            <span className="text-xs text-on-surface-variant font-medium">
              {property.rooms} {property.area ? `· ${property.area} m²` : ""}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-on-surface-variant text-xs mb-2">
          <MapPin className="w-3 h-3" />
          {location || "Konum belirtilmemiş"}
        </p>

        {property.project?.name && (
          <p className="flex items-center gap-1 text-on-surface-variant text-xs mb-1">
            <Layers className="w-3 h-3" />
            <span className="font-semibold">{property.project.name}</span>
            {property.block?.name && (
              <span className="text-on-surface-variant/80">
                {" · "}
                {property.block.name}
                {property.unitNumber ? ` / ${property.unitNumber}` : ""}
              </span>
            )}
          </p>
        )}

        {property.branch?.name && (
          <p className="flex items-center gap-1 text-on-surface-variant text-xs mb-4">
            <Building2 className="w-3 h-3" />
            <span className="font-semibold">{property.branch.name}</span>
          </p>
        )}

        <div className="flex justify-between items-end gap-3">
          <div className="min-w-0 flex-1">
            {(() => {
              const r = resolvePropertyListing(property);
              return (
                <>
                  {r.salePrice != null && (
                    <span className="block">
                      {r.showRent && <span className="text-[10px] font-bold text-amber-700 mr-1">Satış</span>}
                      <span className="text-lg font-black text-primary">{formatPrice(r.salePrice, property.currency)}</span>
                    </span>
                  )}
                  {r.rentPrice != null && (
                    <span className="block">
                      {r.showSale && <span className="text-[10px] font-bold text-blue-700 mr-1">Aylık</span>}
                      <span className={cn("font-black text-primary", r.showSale ? "text-sm" : "text-lg")}>
                        {formatPrice(r.rentPrice, property.currency)}
                        {!r.showSale && <span className="text-[10px] font-normal text-on-surface-variant ml-1">/ ay</span>}
                      </span>
                    </span>
                  )}
                </>
              );
            })()}
            {property.isCitizenshipEligible && property.citizenshipPriceDiff != null && property.citizenshipPriceDiff > 0 && (
              <span
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-tertiary bg-tertiary-fixed/60 px-2 py-1 rounded-md"
                title="Vatandaşlığa uygun fiyatı (yabancıya satışta TR vatandaşlığı için)"
              >
                <Globe className="w-3 h-3" />
                Vatandaşlık: {formatPrice(property.price + property.citizenshipPriceDiff, property.currency)}
              </span>
            )}
          </div>
          <button
            className={cn(
              "p-2 rounded-xl transition-all shrink-0",
              isSelected
                ? "bg-primary text-white"
                : "bg-secondary-container text-on-secondary-container"
            )}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
