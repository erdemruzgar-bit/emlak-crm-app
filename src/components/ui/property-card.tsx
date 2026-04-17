"use client";

import { MapPin, ArrowRight, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export interface PropertyCardData {
  id: string;
  title: string;
  listingType: string;
  propertyType: string;
  price: number;
  currency: string;
  area: number | null;
  rooms: string | null;
  city: string | null;
  district: string | null;
  status: string;
  assignedAgent: { name: string } | null;
  images: { url: string }[];
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
};

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(
    price
  );
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

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {listingLabels[property.listingType] || property.listingType}
          </span>
          {property.rooms && (
            <span className="text-xs text-on-surface-variant font-medium">
              · {property.rooms} {property.area ? `· ${property.area} m²` : ""}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-on-surface-variant text-xs mb-4">
          <MapPin className="w-3 h-3" />
          {location || "Konum belirtilmemiş"}
        </p>

        <div className="flex justify-between items-center">
          <span className="text-lg font-black text-primary">
            {formatPrice(property.price, property.currency)}
          </span>
          <button
            className={cn(
              "p-2 rounded-xl transition-all",
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
