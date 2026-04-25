"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DoorOpen,
  Maximize,
  Bath,
  Layers,
  Flame,
  Calendar,
  MapPin,
  Navigation,
  Send,
  Share2,
  TrendingUp,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { formatPrice } from "./property-card";

interface PropertyDetailData {
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
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  address: string | null;
  description: string | null;
  status: string;
  assignedAgent: { name: string } | null;
  images: { url: string }[];

  // Proje / Blok / Tapu / Sakin
  project?: { id: string; name: string } | null;
  block?: { id: string; name: string } | null;
  unitNumber?: string | null;
  ada?: string | null;
  pafta?: string | null;
  parsel?: string | null;
  bagimsizBolumNo?: string | null;
  katMulkiyetiTipi?: string | null;
  occupancyStatus?: string | null;
  ownerCitizenship?: string | null;
  usageType?: string | null;
  hasElevator?: boolean | null;
  hasParking?: boolean | null;
  hasBalcony?: boolean | null;
  facingDirection?: string | null;
}

const propertyTypeLabels: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  ARSA: "Arsa",
  ISYERI: "İşyeri",
  MUSTAKILEV: "Müstakil Ev",
};

const listingLabels: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  ARSIV: "Arşiv",
};

const heatingLabels: Record<string, string> = {
  DOGALGAZ: "Doğalgaz",
  MERKEZI: "Merkezi",
  SOBA: "Soba",
  KLIMA: "Klima",
  YERDEN: "Yerden Isıtma",
};

const occupancyLabels: Record<string, string> = {
  SAHIBI_OTURUYOR: "Sahibi Oturuyor",
  KIRACILI: "Kiracılı",
  BOS: "Boş",
  ARSIV: "Arşiv",
};

const usageLabels: Record<string, string> = {
  KONUT: "Konut",
  ISYERI: "İşyeri",
  KARMA: "Karma",
  ARSA_IMARLI: "Arsa (İmarlı)",
  ARSA_IMARSIZ: "Arsa (İmarsız)",
};

const katMulkiyetiLabels: Record<string, string> = {
  KAT_MULKIYETI: "Kat Mülkiyeti",
  KAT_IRTIFAKI: "Kat İrtifakı",
  ARSA_PAYLI: "Arsa Paylı",
  HISSELI: "Hisseli",
  BAGIMSIZ_BOLUMSUZ: "Bağımsız Bölümsüz",
};

const facingLabels: Record<string, string> = {
  KUZEY: "Kuzey",
  GUNEY: "Güney",
  DOGU: "Doğu",
  BATI: "Batı",
  KUZEY_DOGU: "Kuzey-Doğu",
  KUZEY_BATI: "Kuzey-Batı",
  GUNEY_DOGU: "Güney-Doğu",
  GUNEY_BATI: "Güney-Batı",
};

interface PropertyDetailProps {
  property: PropertyDetailData;
  onClose: () => void;
}

export function PropertyDetail({ property, onClose }: PropertyDetailProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "overview" | "details" | "location"
  >("overview");
  const [contacted, setContacted] = useState(false);

  const handleContact = () => {
    setContacted(true);
    setTimeout(() => setContacted(false), 3000);
  };

  const location = [property.neighborhood, property.district, property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-[450px] bg-surface-container-high h-[calc(100vh-72px)] sticky top-[72px] flex flex-col shrink-0 overflow-hidden shadow-2xl z-40 border-l border-outline-variant/10"
    >
      {/* Header Actions */}
      <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
            Mülk Detayları
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={cn(
              "p-2 rounded-full transition-all",
              isLiked
                ? "bg-red-500/10 text-red-500"
                : "hover:bg-surface-container text-on-surface-variant"
            )}
          >
            <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        {/* Gallery Preview */}
        <div className="relative rounded-3xl overflow-hidden aspect-[4/3] group shadow-xl">
          {property.images[0] ? (
            <img
              src={property.images[0].url}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-surface-container flex items-center justify-center">
              <span className="text-5xl">🏠</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <button
            onClick={() => router.push(`/properties/${property.id}`)}
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-primary text-[10px] font-black px-4 py-2 rounded-xl shadow-lg hover:bg-white transition-all"
          >
            TAM SAYFA GÖRÜNTÜLE
          </button>
          <div className="absolute top-4 left-4">
            <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-lg uppercase tracking-widest">
              {propertyTypeLabels[property.propertyType] ||
                property.propertyType}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-on-surface leading-tight mb-1">
                {property.title}
              </h2>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {location || "Konum belirtilmemiş"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-outline-variant/10 mb-6">
            {(["overview", "details", "location"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab)}
                className={cn(
                  "pb-3 text-xs font-black uppercase tracking-widest transition-all relative",
                  activeSection === tab
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {tab === "overview"
                  ? "Genel Bakış"
                  : tab === "details"
                    ? "Detaylar"
                    : "Konum"}
                {activeSection === tab && (
                  <motion.div
                    layoutId="detailActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeSection === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                  {property.description || "Açıklama bulunmuyor."}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {property.rooms && (
                    <DetailChip
                      icon={DoorOpen}
                      label={`${property.rooms} Oda`}
                      sub="Fonksiyonel"
                    />
                  )}
                  {property.bathrooms != null && (
                    <DetailChip
                      icon={Bath}
                      label={`${property.bathrooms} Banyo`}
                      sub="Islak Alan"
                    />
                  )}
                  {property.area != null && (
                    <DetailChip
                      icon={Maximize}
                      label={`${property.area} m²`}
                      sub="Toplam Alan"
                    />
                  )}
                  {property.floor != null && (
                    <DetailChip
                      icon={Layers}
                      label={`${property.floor}/${property.totalFloors || "?"}`}
                      sub="Kat/Toplam"
                    />
                  )}
                  {property.heating && (
                    <DetailChip
                      icon={Flame}
                      label={heatingLabels[property.heating] || property.heating}
                      sub="Isıtma"
                    />
                  )}
                  {property.age != null && (
                    <DetailChip
                      icon={Calendar}
                      label={`${property.age} Yaşında`}
                      sub="Bina Yaşı"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {activeSection === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 gap-3"
              >
                <InfoRow label="İlan Tipi" value={listingLabels[property.listingType] || property.listingType} />
                <InfoRow label="Mülk Tipi" value={propertyTypeLabels[property.propertyType] || property.propertyType} />
                {property.rooms && <InfoRow label="Oda Sayısı" value={property.rooms} />}
                {property.bathrooms != null && <InfoRow label="Banyo" value={String(property.bathrooms)} />}
                {property.area != null && <InfoRow label="Alan" value={`${property.area} m²`} />}
                {property.floor != null && <InfoRow label="Kat" value={`${property.floor}/${property.totalFloors || "?"}`} />}
                {property.age != null && <InfoRow label="Bina Yaşı" value={String(property.age)} />}
                {property.heating && <InfoRow label="Isıtma" value={heatingLabels[property.heating] || property.heating} />}

                {(property.project || property.block || property.unitNumber) && (
                  <InfoRow
                    label="Proje / Blok / Daire"
                    value={[property.project?.name, property.block?.name, property.unitNumber]
                      .filter(Boolean)
                      .join(" / ")}
                  />
                )}
                {property.occupancyStatus && (
                  <InfoRow label="Sakin" value={occupancyLabels[property.occupancyStatus] || property.occupancyStatus} />
                )}
                {property.usageType && (
                  <InfoRow label="Kullanım" value={usageLabels[property.usageType] || property.usageType} />
                )}
                {property.ownerCitizenship && (
                  <InfoRow
                    label="Sahip Vatandaşlığı"
                    value={
                      property.ownerCitizenship === "TC"
                        ? "TC"
                        : property.ownerCitizenship === "VATANDASLIGA_UYGUN"
                        ? "Vatandaşlığa Uygun"
                        : "Yabancı"
                    }
                  />
                )}
                {(property.ada || property.pafta || property.parsel) && (
                  <InfoRow
                    label="Ada / Pafta / Parsel"
                    value={[property.ada, property.pafta, property.parsel].filter(Boolean).join(" / ")}
                  />
                )}
                {property.bagimsizBolumNo && (
                  <InfoRow label="Bağımsız Bölüm No" value={property.bagimsizBolumNo} />
                )}
                {property.katMulkiyetiTipi && (
                  <InfoRow label="Kat Mülkiyeti" value={katMulkiyetiLabels[property.katMulkiyetiTipi] || property.katMulkiyetiTipi} />
                )}
                {property.facingDirection && (
                  <InfoRow label="Cephe" value={facingLabels[property.facingDirection] || property.facingDirection} />
                )}
                {property.hasElevator != null && (
                  <InfoRow label="Asansör" value={property.hasElevator ? "Var" : "Yok"} />
                )}
                {property.hasParking != null && (
                  <InfoRow label="Otopark" value={property.hasParking ? "Var" : "Yok"} />
                )}
                {property.hasBalcony != null && (
                  <InfoRow label="Balkon" value={property.hasBalcony ? "Var" : "Yok"} />
                )}
              </motion.div>
            )}

            {activeSection === "location" && (
              <motion.div
                key="location"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-3xl h-48 overflow-hidden relative group shadow-inner">
                  <div className="absolute inset-0 bg-primary/5 z-10 pointer-events-none group-hover:bg-transparent transition-colors"></div>
                  <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-2xl border-4 border-white"
                    >
                      <MapPin className="text-white fill-white w-5 h-5" />
                    </motion.div>
                  </div>
                </div>
                {property.address && (
                  <div className="p-4 bg-surface-container-low rounded-2xl">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Adres
                    </p>
                    <p className="text-sm text-on-surface font-medium">
                      {property.address}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {location}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-surface-container-high border-t border-outline-variant/10 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Fiyatlandırma
            </span>
            <span className="block text-2xl font-black text-on-surface">
              {formatPrice(property.price, property.currency)}
            </span>
            <p className="text-[10px] text-tertiary font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Bu çeyrekte +%4.2
            </p>
          </div>
          {property.assignedAgent && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface">
                  {property.assignedAgent.name}
                </p>
                <button className="text-[10px] text-primary font-bold hover:underline">
                  Profili Görüntüle
                </button>
              </div>
              <div className="w-12 h-12 rounded-2xl border-2 border-white bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold shadow-md">
                {property.assignedAgent.name.charAt(0)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleContact}
            className={cn(
              "flex-1 py-4 font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 group active:scale-[0.98] transition-all",
              contacted
                ? "bg-tertiary text-white"
                : "primary-gradient text-white shadow-primary/20"
            )}
          >
            {contacted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Talep Gönderildi
              </>
            ) : (
              <>
                İletişime Geç
                <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          <button className="p-4 bg-surface-container-low text-primary rounded-2xl hover:bg-surface-container transition-all shadow-sm">
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function DetailChip({
  icon: Icon,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
}) {
  return (
    <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-3 group hover:bg-surface-container transition-all border border-outline-variant/5">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <span className="block text-xs font-bold text-on-surface">{label}</span>
        <span className="block text-[10px] text-on-surface-variant font-medium">
          {sub}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
      <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      <span className="text-sm font-bold text-on-surface">{value}</span>
    </div>
  );
}
