"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  Heart,
  Send,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

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
  assignedAgent: { name: string } | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
  matches: {
    id: string;
    customer: { id: string; firstName: string; lastName: string };
    matchScore: number | null;
  }[];
  createdAt: string;
}

const listingLabels: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
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
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProperty(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

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
      value: property.age?.toString(),
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
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">
            {property.title}
          </h1>
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
          <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
            <Heart className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden">
        <div className="h-80 bg-surface-container-high flex items-center justify-center relative group">
          {property.images[0] ? (
            <img
              src={property.images[0].url}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center text-on-surface-variant/30">
              <Home className="w-16 h-16" />
            </div>
          )}
          <div className="absolute top-4 left-4 glass-badge px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-primary">
            {typeLabels[property.propertyType]}
          </div>
        </div>
      </div>

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
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
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
              <DetailItem label="Bina Yaşı" value={property.age?.toString()} />
              <DetailItem label="Isıtma" value={property.heating ? heatingLabels[property.heating] || property.heating : null} />
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

              <div className="space-y-3 mt-6">
                <button className="w-full primary-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Send className="w-4 h-4" />
                  İletişime Geç
                </button>
                <button className="w-full bg-surface-container-low text-on-surface font-bold py-4 rounded-2xl hover:bg-surface-container transition-all flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Ara
                </button>
              </div>

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
              <h3 className="font-bold text-on-surface mb-4">
                Eşleşen Müşteriler
              </h3>
              {property.matches.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Henüz eşleşme yok
                </p>
              ) : (
                <div className="space-y-2">
                  {property.matches.map((m) => (
                    <Link
                      key={m.id}
                      href={`/customers/${m.customer.id}`}
                      className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all"
                    >
                      <span className="text-sm font-semibold text-primary">
                        {m.customer.firstName} {m.customer.lastName}
                      </span>
                      {m.matchScore && (
                        <span className="text-xs text-on-surface-variant font-bold">
                          %{m.matchScore}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
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
