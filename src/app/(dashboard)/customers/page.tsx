"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, UserPlus, ChevronLeft, ChevronRight, Loader2, UserX, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown, Users, UserCheck, Clock, AlertTriangle, LayoutGrid, List, Phone, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ExcelToolbar } from "@/components/ui/excel-toolbar";
import { HelpButton } from "@/components/ui/help-button";
import { TableSkeleton, CardGridSkeleton } from "@/components/ui/skeleton";
import { DEFAULT_CUSTOMER_TYPE_LABELS as DEFAULT_TYPE_LABELS, customerTypeBadgeClass } from "@/lib/customer-type-styles";
import { TURKEY_CITIES, getDistrictsOf } from "@/lib/turkey-locations";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  customerType: string;
  stage: string | null;
  urgency: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  preferredTypes: string[];
  preferredCities: string[];
  tags: string[];
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  assignedAgent: { name: string } | null;
  branch: { name: string } | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const stageLabels: Record<string, string> = { LEAD: "Aday", QUALIFIED: "Nitelikli", ACTIVE: "Aktif Takip", SHOWING: "Gösterimde", OFFER: "Teklif Aşaması", CONTRACT: "Sözleşme Aşaması", CLOSED: "Kazanıldı", LOST: "Kaybedildi" };
const stageColors: Record<string, string> = { LEAD: "bg-surface-container text-on-surface-variant", QUALIFIED: "bg-secondary-container text-on-secondary-container", ACTIVE: "bg-primary-fixed text-primary", SHOWING: "bg-tertiary-fixed text-tertiary", OFFER: "bg-tertiary-container text-on-tertiary-container", CONTRACT: "bg-primary-container text-on-primary-container", CLOSED: "bg-green-100 text-green-700", LOST: "bg-error-container text-on-error-container" };
const urgencyDots: Record<string, string> = { LOW: "bg-green-500", MEDIUM: "bg-yellow-500", HIGH: "bg-orange-500", URGENT: "bg-red-500" };
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil" };


type SortField = "createdAt" | "firstName" | "lastName" | "customerType" | "stage";
type SortOrder = "asc" | "desc";

function SortIcon({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
}
type ViewMode = "list" | "kanban";

function formatBudget(min: number | null, max: number | null): string {
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
  if (min && max) return `₺${fmt(min)} - ₺${fmt(max)}`;
  if (max) return `< ₺${fmt(max)}`;
  if (min) return `> ₺${fmt(min)}`;
  return "-";
}

function relativeDate(dateStr: string | null): { text: string; color: string } {
  if (!dateStr) return { text: "Yok", color: "text-on-surface-variant" };
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Gelecek", color: "text-primary" };
  if (diff === 0) return { text: "Bugün", color: "text-green-600" };
  if (diff <= 7) return { text: `${diff} gün`, color: "text-green-600" };
  if (diff <= 14) return { text: `${diff} gün`, color: "text-on-surface-variant" };
  if (diff <= 30) return { text: `${diff} gün`, color: "text-orange-500" };
  return { text: `${diff} gün`, color: "text-red-500" };
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-on-surface-variant"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...</div>}>
      <CustomersPageInner />
    </Suspense>
  );
}

function CustomersPageInner() {
  const urlParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kanbanCustomers, setKanbanCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState(urlParams.get("search") || "");

  // Header aramadan gelince yeniden senkronla
  useEffect(() => {
    const q = urlParams.get("search") || "";
    setSearch(q);
    setPage(1);
  }, [urlParams]);
  const [typeFilter, setTypeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [preferredTypeFilter, setPreferredTypeFilter] = useState("");
  const [preferredCityFilter, setPreferredCityFilter] = useState("");
  const [preferredDistrictFilter, setPreferredDistrictFilter] = useState("");
  const [roomsFilter, setRoomsFilter] = useState("");
  const [minBudgetFilter, setMinBudgetFilter] = useState("");
  const [maxBudgetFilter, setMaxBudgetFilter] = useState("");
  const [minAreaFilter, setMinAreaFilter] = useState("");
  const [maxAreaFilter, setMaxAreaFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [overdueFollowUpFilter, setOverdueFollowUpFilter] = useState(false);
  const [interestedProjectFilter, setInterestedProjectFilter] = useState(urlParams.get("interestedProjectId") || "");
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string; code?: string | null }[]>([]);
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [customerTypes, setCustomerTypes] = useState<{ code: string; label: string }[]>([]);

  const typeLabels: Record<string, string> = {
    ...DEFAULT_TYPE_LABELS,
    ...Object.fromEntries(customerTypes.map((t) => [t.code, t.label])),
  };

  useEffect(() => {
    fetch("/api/customer-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCustomerTypes(data);
      })
      .catch(() => {});
    fetch("/api/room-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setRoomTypes(data);
      })
      .catch(() => {});
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProjectOptions(data);
      })
      .catch(() => {});
  }, []);

  async function logInteraction(customerId: string, type: string) {
    setLoggedIds((prev) => new Set(prev).add(`${customerId}-${type}`));
    await fetch(`/api/customers/${customerId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setTimeout(() => {
      setLoggedIds((prev) => { const n = new Set(prev); n.delete(`${customerId}-${type}`); return n; });
    }, 2000);
  }

  const activeFilterCount = [
    typeFilter, stageFilter, urgencyFilter, sourceFilter,
    preferredTypeFilter, preferredCityFilter, preferredDistrictFilter, roomsFilter,
    minBudgetFilter, maxBudgetFilter, minAreaFilter, maxAreaFilter, tagsFilter,
    interestedProjectFilter,
    overdueFollowUpFilter ? "1" : "",
  ].filter(Boolean).length;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCustomers(); }, [
    page, search, typeFilter, stageFilter, urgencyFilter, sourceFilter, sortBy, sortOrder,
    preferredTypeFilter, preferredCityFilter, preferredDistrictFilter, roomsFilter,
    minBudgetFilter, maxBudgetFilter, minAreaFilter, maxAreaFilter, tagsFilter, overdueFollowUpFilter,
    interestedProjectFilter,
  ]);
  // Kanban kartları her view'da hazır olsun: list mode iken md altında (mobilde) kart olarak gösteririz.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchKanbanCustomers(); }, [search, typeFilter, urgencyFilter, sourceFilter]);

  async function fetchCustomers() {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(), limit: "20", sortBy, sortOrder,
      ...(search && { search }),
      ...(typeFilter && { type: typeFilter }),
      ...(stageFilter && { stage: stageFilter }),
      ...(urgencyFilter && { urgency: urgencyFilter }),
      ...(sourceFilter && { source: sourceFilter }),
      ...(preferredTypeFilter && { preferredType: preferredTypeFilter }),
      ...(preferredCityFilter && { preferredCity: preferredCityFilter }),
      ...(preferredDistrictFilter && { preferredDistrict: preferredDistrictFilter }),
      ...(roomsFilter && { rooms: roomsFilter }),
      ...(minBudgetFilter && { minBudget: minBudgetFilter }),
      ...(maxBudgetFilter && { maxBudget: maxBudgetFilter }),
      ...(minAreaFilter && { minArea: minAreaFilter }),
      ...(maxAreaFilter && { maxArea: maxAreaFilter }),
      ...(tagsFilter && { tags: tagsFilter }),
      ...(overdueFollowUpFilter && { hasOverdueFollowUp: "true" }),
      ...(interestedProjectFilter && { interestedProjectId: interestedProjectFilter }),
    });
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setPagination(data.pagination || null);
    setLoading(false);
  }

  async function fetchKanbanCustomers() {
    const params = new URLSearchParams({
      limit: "200",
      ...(search && { search }),
      ...(typeFilter && { type: typeFilter }),
      ...(urgencyFilter && { urgency: urgencyFilter }),
      ...(sourceFilter && { source: sourceFilter }),
    });
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setKanbanCustomers(data.customers || []);
  }

  function handleSort(field: SortField) {
    if (sortBy === field) { setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }
    else { setSortBy(field); setSortOrder("asc"); }
    setPage(1);
  }

  function clearFilters() {
    setTypeFilter(""); setStageFilter(""); setUrgencyFilter(""); setSourceFilter("");
    setPreferredTypeFilter(""); setPreferredCityFilter(""); setPreferredDistrictFilter("");
    setRoomsFilter(""); setMinBudgetFilter(""); setMaxBudgetFilter("");
    setMinAreaFilter(""); setMaxAreaFilter(""); setTagsFilter(""); setOverdueFollowUpFilter(false);
    setPage(1);
  }

  const totalCount = pagination?.total || 0;
  // 'şimdi' referansını mount-time'da yakala (Date.now render'da pure değil).
  // Customer listesi her güncellenince useMemo yeniden çalışır ama 'now' sabit kalır;
  // gün geçişlerinde küçük bir gecikme olabilir (kullanıcı sayfayı yenileyince refresh).
  const [now] = useState(() => Date.now());
  const { activeLeads, overdueFollowUp, noContact30 } = useMemo(() => {
    return {
      activeLeads: customers.filter((c) => ["LEAD", "QUALIFIED", "ACTIVE"].includes(c.stage || "")).length,
      overdueFollowUp: customers.filter((c) => c.nextFollowUpDate && new Date(c.nextFollowUpDate).getTime() < now).length,
      noContact30: customers.filter((c) => {
        if (!c.lastContactDate) return true;
        return (now - new Date(c.lastContactDate).getTime()) > 30 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [customers, now]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Müşteriler</h1>
            <HelpButton page="customers-list" title="Müşteriler" />
          </div>
          <p className="text-on-surface-variant text-sm mt-1 font-medium">{pagination ? `Toplam ${pagination.total} müşteri` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExcelToolbar
            exportUrl="/api/customers/export"
            importUrl="/api/customers/import"
            templateUrl="/api/customers/import/template"
            label="müşteri"
            onImportSuccess={fetchCustomers}
            importGuide={[
              { columnName: "Ad / Soyad", description: "Zorunlu, en az 2 karakter" },
              { columnName: "Tip", description: "Alıcı / Satıcı / Kiracı / Kiracı Adayı / Ev Sahibi (veya Ayarlardan eklenen)" },
              { columnName: "Aşama", description: "Aday / Nitelikli / Aktif Takip / Gösterimde / Teklif Aşaması / Sözleşme Aşaması / Kazanıldı / Kaybedildi (opsiyonel)" },
              { columnName: "Aciliyet", description: "Düşük / Orta / Yüksek / Acil (opsiyonel)" },
              { columnName: "Telefon / E-posta", description: "Biri eşleşirse güncelleme yapılır" },
              { columnName: "Min/Max Bütçe, Min/Max m²", description: "Sayısal değer; boş bırakılabilir" },
              { columnName: "Tercih Şehirler, Tercih İlçeler, Etiketler", description: "Virgülle ayır (örn: İstanbul, Ankara)" },
              { columnName: "Son İletişim / Sonraki Takip", description: "Tarih: GG.AA.YYYY" },
            ]}
          />
          <div className="flex items-center bg-surface-container-low rounded-xl p-1">
            <button onClick={() => setViewMode("list")} title="Liste Görünümü"
              className={cn("p-2 rounded-lg transition-all", viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("kanban")} title="Kart Görünümü"
              className={cn("p-2 rounded-lg transition-all", viewMode === "kanban" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Link href="/customers/new" className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Yeni Müşteri
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Toplam</p><p className="text-xl font-black text-on-surface">{totalCount}</p></div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary-container rounded-xl flex items-center justify-center"><UserCheck className="w-5 h-5 text-on-secondary-container" /></div>
          <div><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Aktif Aday</p><p className="text-xl font-black text-on-surface">{activeLeads}</p></div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-tertiary-fixed rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-tertiary" /></div>
          <div><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Takip Geçmiş</p><p className="text-xl font-black text-on-surface">{overdueFollowUp}</p></div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-on-error-container" /></div>
          <div><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">30+ Gün İletişimsiz</p><p className="text-xl font-black text-on-surface">{noContact30}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input type="text" placeholder="Müşteri ara (ad, soyad, e-posta, telefon)..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm font-medium">
            <option value="">Tüm Tipler</option>
            {customerTypes.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
          {viewMode === "list" && (
            <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm font-medium">
              <option value="">Tüm Aşamalar</option>
              {Object.entries(stageLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <button onClick={() => setShowFilters(!showFilters)} className={cn("px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            showFilters || activeFilterCount > 0 ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface")}>
            <SlidersHorizontal className="w-4 h-4" /> Daha Fazla
            {activeFilterCount > 0 && <span className="bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-on-surface">Gelişmiş Filtreler</h3>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"><X className="w-3 h-3" /> Temizle</button>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <select value={urgencyFilter} onChange={(e) => { setUrgencyFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Tüm Aciliyet</option>
                    <option value="LOW">Düşük</option><option value="MEDIUM">Orta</option>
                    <option value="HIGH">Yüksek</option><option value="URGENT">Acil</option>
                  </select>
                  <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Tüm Kaynaklar</option>
                    <option value="referans">Referans</option><option value="internet">İnternet</option>
                    <option value="sahibinden">Sahibinden</option><option value="hepsiemlak">Hepsiemlak</option>
                    <option value="walkin">Ofis Ziyareti</option><option value="diger">Diğer</option>
                  </select>
                  <select value={preferredTypeFilter} onChange={(e) => { setPreferredTypeFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Tercih Edilen Mülk</option>
                    <option value="DAIRE">Daire</option>
                    <option value="VILLA">Villa</option>
                    <option value="ARSA">Arsa</option>
                    <option value="ISYERI">İşyeri</option>
                    <option value="MUSTAKILEV">Müstakil Ev</option>
                  </select>
                  <select value={roomsFilter} onChange={(e) => { setRoomsFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Oda Sayısı</option>
                    {roomTypes.length > 0 ? (
                      roomTypes.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="1+0">1+0</option>
                        <option value="1+1">1+1</option>
                        <option value="2+1">2+1</option>
                        <option value="3+1">3+1</option>
                        <option value="4+1">4+1</option>
                      </>
                    )}
                  </select>
                  <select value={preferredCityFilter} onChange={(e) => { setPreferredCityFilter(e.target.value); setPreferredDistrictFilter(""); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Şehir</option>
                    {TURKEY_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select value={preferredDistrictFilter} onChange={(e) => { setPreferredDistrictFilter(e.target.value); setPage(1); }}
                    disabled={!preferredCityFilter}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm disabled:opacity-50">
                    <option value="">İlçe</option>
                    {preferredCityFilter && getDistrictsOf(preferredCityFilter).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select value={interestedProjectFilter} onChange={(e) => { setInterestedProjectFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">İlgilendiği Proje</option>
                    {projectOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.code ? ` (${p.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <input type="number" placeholder="Min Bütçe (₺)" value={minBudgetFilter}
                    onChange={(e) => { setMinBudgetFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                  <input type="number" placeholder="Max Bütçe (₺)" value={maxBudgetFilter}
                    onChange={(e) => { setMaxBudgetFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                  <input type="number" placeholder="Min m²" value={minAreaFilter}
                    onChange={(e) => { setMinAreaFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                  <input type="number" placeholder="Max m²" value={maxAreaFilter}
                    onChange={(e) => { setMaxAreaFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                  <input type="text" placeholder="Etiketler (virgülle)" value={tagsFilter}
                    onChange={(e) => { setTagsFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
                  <label className="px-3 py-2.5 bg-surface-container-low rounded-xl flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={overdueFollowUpFilter}
                      onChange={(e) => { setOverdueFollowUpFilter(e.target.checked); setPage(1); }}
                      className="accent-primary" />
                    Takibi Geciken
                  </label>
                  {viewMode === "list" && (
                    <select value={`${sortBy}-${sortOrder}`} onChange={(e) => {
                      const [f, o] = e.target.value.split("-"); setSortBy(f as SortField); setSortOrder(o as "asc" | "desc"); setPage(1);
                    }} className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="createdAt-desc">En Yeni</option><option value="createdAt-asc">En Eski</option>
                      <option value="firstName-asc">Ad (A-Z)</option><option value="firstName-desc">Ad (Z-A)</option>
                      <option value="stage-asc">Aşama (A-Z)</option><option value="stage-desc">Aşama (Z-A)</option>
                    </select>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List View — md altında zorla kart görünümüne yönlendirilir */}
      {viewMode === "list" && (
        <div className="hidden md:block bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low">
                <tr>
                  <th onClick={() => handleSort("firstName")} className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none">
                    <span className="flex items-center gap-1">Ad Soyad <SortIcon field="firstName" sortBy={sortBy} sortOrder={sortOrder} /></span>
                  </th>
                  <th onClick={() => handleSort("stage")} className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none">
                    <span className="flex items-center gap-1">Aşama <SortIcon field="stage" sortBy={sortBy} sortOrder={sortOrder} /></span>
                  </th>
                  <th onClick={() => handleSort("customerType")} className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none">
                    <span className="flex items-center gap-1">Tip <SortIcon field="customerType" sortBy={sortBy} sortOrder={sortOrder} /></span>
                  </th>
                  <th className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Bütçe</th>
                  <th className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Aciliyet</th>
                  <th className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Tercih</th>
                  <th className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Son İletişim</th>
                  <th className="text-left px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Danışman</th>
                  <th className="px-5 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} cols={9} />
                ) : customers.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-16 text-center text-on-surface-variant">
                    <UserX className="w-12 h-12 opacity-30 mx-auto mb-3" />
                    <p className="text-base font-bold text-on-surface mb-1">{search || activeFilterCount > 0 ? "Filtreye uyan müşteri yok" : "Henüz müşteri yok"}</p>
                    <p className="text-xs">{search || activeFilterCount > 0 ? "Aramayı veya filtreleri değiştirin." : "İlk müşteriyi eklemek için sağ üstteki ‘Yeni Müşteri’ butonuna basın."}</p>
                  </td></tr>
                ) : (
                  customers.map((c) => {
                    const lastContact = relativeDate(c.lastContactDate);
                    const prefTypes = (c.preferredTypes || []).map((t) => propertyTypeLabels[t] || t);
                    const prefCity = (c.preferredCities || [])[0];
                    const typesText = prefTypes.length <= 2 ? prefTypes.join(", ")
                      : `${prefTypes.slice(0, 2).join(", ")} +${prefTypes.length - 2}`;
                    const prefSummary = [typesText, prefCity].filter(Boolean).join(" · ") || "-";
                    return (
                      <tr key={c.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-all group">
                        <td className="px-6 py-4">
                          <Link href={`/customers/${c.id}`} className="text-sm font-semibold text-primary hover:underline">{c.firstName} {c.lastName}</Link>
                          {(c.tags || []).length > 0 && (
                            <div className="flex gap-1 mt-1">{c.tags.slice(0, 2).map((t) => <span key={t} className="text-[8px] px-1.5 py-0.5 bg-primary-fixed text-primary rounded font-bold">{t}</span>)}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {c.stage ? <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase", stageColors[c.stage])}>{stageLabels[c.stage] || c.stage}</span> : <span className="text-xs text-on-surface-variant">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider", customerTypeBadgeClass(c.customerType))}>{typeLabels[c.customerType]}</span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-on-surface">{formatBudget(c.minBudget, c.maxBudget)}</td>
                        <td className="px-5 py-4">
                          {c.urgency ? <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", urgencyDots[c.urgency])} /><span className="text-xs text-on-surface-variant">{c.urgency === "LOW" ? "Düşük" : c.urgency === "MEDIUM" ? "Orta" : c.urgency === "HIGH" ? "Yüksek" : "Acil"}</span></span> : <span className="text-xs text-on-surface-variant">-</span>}
                        </td>
                        <td className="px-5 py-4 text-xs text-on-surface-variant max-w-[180px] truncate" title={[prefTypes.join(", "), prefCity].filter(Boolean).join(" · ") || ""}>{prefSummary}</td>
                        <td className="px-5 py-4"><span className={cn("text-xs font-medium", lastContact.color)}>{lastContact.text}</span></td>
                        <td className="px-5 py-4 text-xs text-on-surface-variant">{c.assignedAgent?.name || "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            {["CALL", "WHATSAPP", "EMAIL"].map((type) => {
                              const Icon = type === "CALL" ? Phone : type === "WHATSAPP" ? MessageCircle : Mail;
                              const logged = loggedIds.has(`${c.id}-${type}`);
                              return (
                                <button key={type} onClick={() => logInteraction(c.id, type)} title={type === "CALL" ? "Arama Kaydet" : type === "WHATSAPP" ? "WhatsApp Kaydet" : "E-posta Kaydet"}
                                  className={cn("p-1.5 rounded-lg transition-all text-sm",
                                    logged ? "bg-green-100 text-green-600" : "bg-surface-container-low text-on-surface-variant hover:bg-primary-fixed hover:text-primary"
                                  )}>
                                  {logged ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low">
              <p className="text-sm text-on-surface-variant font-medium">Toplam {pagination.total} müşteri</p>
              <div className="flex items-center bg-surface-container-low rounded-xl p-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-white rounded-lg transition-all text-on-surface-variant disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-primary">{page} / {pagination.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="p-1.5 hover:bg-white rounded-lg transition-all text-on-surface-variant disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Grid View — list seçili olsa da mobilde kanban gösteririz (overflow tablo yerine) */}
      {(viewMode === "kanban" || viewMode === "list") && (
        <div className={cn(viewMode === "list" && "md:hidden")}>
          {loading && kanbanCustomers.length === 0 ? (
            <CardGridSkeleton count={8} />
          ) : kanbanCustomers.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <UserX className="w-12 h-12 opacity-30 mb-3" />
              <p className="text-base font-bold text-on-surface mb-1">{search || activeFilterCount > 0 ? "Filtreye uyan müşteri yok" : "Henüz müşteri yok"}</p>
              <p className="text-xs">{search || activeFilterCount > 0 ? "Aramayı veya filtreleri değiştirin." : "İlk müşteriyi eklemek için sağ üstteki ‘Yeni Müşteri’ butonuna basın."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {kanbanCustomers.map((c) => {
                const isOverdue = c.nextFollowUpDate && new Date(c.nextFollowUpDate) < new Date();
                const lastContact = relativeDate(c.lastContactDate);
                const kanbanPrefTypes = (c.preferredTypes || []).map((t) => propertyTypeLabels[t] || t);
                const kanbanTypesText = kanbanPrefTypes.length <= 3 ? kanbanPrefTypes.join(", ")
                  : `${kanbanPrefTypes.slice(0, 3).join(", ")} +${kanbanPrefTypes.length - 3}`;
                const prefSummary = [kanbanTypesText, (c.preferredCities || [])[0]].filter(Boolean).join(" · ");
                const avatarColors = [
                  "from-blue-400 to-blue-600",
                  "from-violet-400 to-violet-600",
                  "from-emerald-400 to-emerald-600",
                  "from-orange-400 to-orange-600",
                  "from-pink-400 to-pink-600",
                  "from-teal-400 to-teal-600",
                ];
                const colorIdx = (c.firstName.charCodeAt(0) + c.lastName.charCodeAt(0)) % avatarColors.length;

                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    {/* Avatar header — like property image */}
                    <Link href={`/customers/${c.id}`} className="block">
                      <div className={cn("h-36 flex items-center justify-center relative overflow-hidden", c.photoUrl ? "bg-surface-container-high" : cn("bg-gradient-to-br", avatarColors[colorIdx]))}>
                        {c.photoUrl ? (
                          <SafeImage src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} className="object-cover object-top" />
                        ) : (
                          <span className="text-5xl font-black text-white/90 select-none">
                            {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                          </span>
                        )}
                        {/* Type badge top-left */}
                        <div className="absolute top-3 left-3">
                          <span className={cn("text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider backdrop-blur-sm bg-white/20 text-white border border-white/30")}>
                            {typeLabels[c.customerType]}
                          </span>
                        </div>
                        {/* Urgency dot top-right */}
                        {c.urgency && c.urgency !== "LOW" && (
                          <div className="absolute top-3 right-3">
                            <span className={cn("w-3 h-3 rounded-full block ring-2 ring-white", urgencyDots[c.urgency])} />
                          </div>
                        )}
                        {/* Overdue warning */}
                        {isOverdue && (
                          <div className="absolute bottom-3 left-3 bg-error/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Takip gecikmeli
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <Link href={`/customers/${c.id}`}
                            className="text-base font-black text-on-surface group-hover:text-primary transition-colors tracking-tight block truncate">
                            {c.firstName} {c.lastName}
                          </Link>
                          {c.stage && (
                            <span className={cn("text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider mt-1 inline-block", stageColors[c.stage])}>
                              {stageLabels[c.stage]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Budget */}
                      {(c.minBudget || c.maxBudget) && (
                        <p className="text-sm font-black text-primary mb-2">
                          {formatBudget(c.minBudget, c.maxBudget)}
                        </p>
                      )}

                      {/* Preferences */}
                      {prefSummary && (
                        <p className="text-xs text-on-surface-variant mb-3 truncate">{prefSummary}</p>
                      )}

                      {/* Last contact */}
                      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-on-surface-variant" />
                          <span className={cn("text-xs font-medium", lastContact.color)}>{lastContact.text}</span>
                        </div>
                        {c.assignedAgent && (
                          <span className="text-[10px] text-on-surface-variant truncate max-w-[80px]">{c.assignedAgent.name}</span>
                        )}
                      </div>

                      {/* Quick actions — mobil/dokunmatik cihazlarda her zaman görünür, sadece hover-cihazlarda hover ile gizli/görünür */}
                      <div className="flex items-center gap-2 mt-3 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                        {c.phone && (
                          <a href={`tel:${c.phone}`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-fixed text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all">
                            <Phone className="w-3.5 h-3.5" />
                            Ara
                          </a>
                        )}
                        {["CALL", "WHATSAPP", "EMAIL"].map((type) => {
                          const Icon = type === "CALL" ? Phone : type === "WHATSAPP" ? MessageCircle : Mail;
                          const logged = loggedIds.has(`${c.id}-${type}`);
                          if (type === "CALL" && c.phone) return null; // phone already shown above
                          return (
                            <button key={type}
                              onClick={(e) => { e.preventDefault(); logInteraction(c.id, type); }}
                              title={type === "WHATSAPP" ? "WhatsApp Kaydet" : "E-posta Kaydet"}
                              className={cn("p-2 rounded-xl transition-all flex-1 flex items-center justify-center",
                                logged ? "bg-green-100 text-green-600" : "bg-surface-container-low text-on-surface-variant hover:text-primary"
                              )}>
                              {logged ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                        {!c.phone && (
                          <button onClick={() => logInteraction(c.id, "CALL")}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                              loggedIds.has(`${c.id}-CALL`) ? "bg-green-100 text-green-600" : "bg-primary-fixed text-primary hover:bg-primary hover:text-white"
                            )}>
                            {loggedIds.has(`${c.id}-CALL`) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                            {loggedIds.has(`${c.id}-CALL`) ? "Kaydedildi" : "Arama Kaydet"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
