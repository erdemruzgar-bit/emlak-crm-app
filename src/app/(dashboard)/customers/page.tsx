"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronLeft, ChevronRight, Loader2, UserX, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown, Users, UserCheck, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
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

const typeLabels: Record<string, string> = { BUYER: "Alıcı", SELLER: "Satıcı", TENANT: "Kiracı", LANDLORD: "Ev Sahibi" };
const typeBadgeColors: Record<string, string> = { BUYER: "bg-secondary-container text-on-secondary-container", SELLER: "bg-primary-fixed text-on-primary-fixed-variant", TENANT: "bg-tertiary-fixed text-on-tertiary-fixed-variant", LANDLORD: "bg-surface-container-high text-on-surface-variant" };
const stageLabels: Record<string, string> = { LEAD: "Lead", QUALIFIED: "Nitelikli", ACTIVE: "Aktif", SHOWING: "Gösterim", OFFER: "Teklif", CONTRACT: "Sözleşme", CLOSED: "Kapandı", LOST: "Kayıp" };
const stageColors: Record<string, string> = { LEAD: "bg-surface-container text-on-surface-variant", QUALIFIED: "bg-secondary-container text-on-secondary-container", ACTIVE: "bg-primary-fixed text-primary", SHOWING: "bg-tertiary-fixed text-tertiary", OFFER: "bg-tertiary-container text-on-tertiary-container", CONTRACT: "bg-primary-container text-on-primary-container", CLOSED: "bg-green-100 text-green-700", LOST: "bg-error-container text-on-error-container" };
const urgencyDots: Record<string, string> = { LOW: "bg-green-500", MEDIUM: "bg-yellow-500", HIGH: "bg-orange-500", URGENT: "bg-red-500" };
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil" };

type SortField = "createdAt" | "firstName" | "lastName" | "customerType" | "stage";

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const activeFilterCount = [typeFilter, stageFilter, urgencyFilter, sourceFilter].filter(Boolean).length;

  useEffect(() => { fetchCustomers(); }, [page, search, typeFilter, stageFilter, urgencyFilter, sourceFilter, sortBy, sortOrder]);

  async function fetchCustomers() {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(), limit: "20", sortBy, sortOrder,
      ...(search && { search }),
      ...(typeFilter && { type: typeFilter }),
      ...(stageFilter && { stage: stageFilter }),
      ...(urgencyFilter && { urgency: urgencyFilter }),
      ...(sourceFilter && { source: sourceFilter }),
    });
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setPagination(data.pagination || null);
    setLoading(false);
  }

  function handleSort(field: SortField) {
    if (sortBy === field) { setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }
    else { setSortBy(field); setSortOrder("asc"); }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  }

  function clearFilters() { setTypeFilter(""); setStageFilter(""); setUrgencyFilter(""); setSourceFilter(""); setPage(1); }

  // Stats from loaded data (approximate)
  const totalCount = pagination?.total || 0;
  const activeLeads = customers.filter((c) => ["LEAD", "QUALIFIED", "ACTIVE"].includes(c.stage || "")).length;
  const overdueFollowUp = customers.filter((c) => c.nextFollowUpDate && new Date(c.nextFollowUpDate) < new Date()).length;
  const noContact30 = customers.filter((c) => { if (!c.lastContactDate) return true; return (Date.now() - new Date(c.lastContactDate).getTime()) > 30 * 24 * 60 * 60 * 1000; }).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Müşteriler</h1>
          <p className="text-on-surface-variant text-sm mt-1 font-medium">{pagination ? `Toplam ${pagination.total} müşteri` : ""}</p>
        </div>
        <Link href="/customers/new" className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Yeni Müşteri
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Toplam</p><p className="text-xl font-black text-on-surface">{totalCount}</p></div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary-container rounded-xl flex items-center justify-center"><UserCheck className="w-5 h-5 text-on-secondary-container" /></div>
          <div><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Aktif Lead</p><p className="text-xl font-black text-on-surface">{activeLeads}</p></div>
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
            <option value="BUYER">Alıcı</option><option value="SELLER">Satıcı</option>
            <option value="TENANT">Kiracı</option><option value="LANDLORD">Ev Sahibi</option>
          </select>
          <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm font-medium">
            <option value="">Tüm Aşamalar</option>
            {Object.entries(stageLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
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
                  <select value={`${sortBy}-${sortOrder}`} onChange={(e) => {
                    const [f, o] = e.target.value.split("-"); setSortBy(f as SortField); setSortOrder(o as "asc" | "desc"); setPage(1);
                  }} className="px-3 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="createdAt-desc">En Yeni</option><option value="createdAt-asc">En Eski</option>
                    <option value="firstName-asc">Ad (A-Z)</option><option value="firstName-desc">Ad (Z-A)</option>
                    <option value="stage-asc">Aşama (A-Z)</option><option value="stage-desc">Aşama (Z-A)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>
                <th onClick={() => handleSort("firstName")} className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none">
                  <span className="flex items-center gap-1">Ad Soyad <SortIcon field="firstName" /></span>
                </th>
                <th onClick={() => handleSort("stage")} className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none">
                  <span className="flex items-center gap-1">Aşama <SortIcon field="stage" /></span>
                </th>
                <th onClick={() => handleSort("customerType")} className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none">
                  <span className="flex items-center gap-1">Tip <SortIcon field="customerType" /></span>
                </th>
                <th className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Bütçe</th>
                <th className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Aciliyet</th>
                <th className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tercih</th>
                <th className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Son İletişim</th>
                <th className="text-left px-5 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Danışman</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Yükleniyor...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant"><UserX className="w-10 h-10 opacity-30 mx-auto mb-2" />Müşteri bulunamadı</td></tr>
              ) : (
                customers.map((c) => {
                  const lastContact = relativeDate(c.lastContactDate);
                  const prefSummary = [
                    ...(c.preferredTypes || []).slice(0, 1).map((t) => propertyTypeLabels[t] || t),
                    ...(c.preferredCities || []).slice(0, 1),
                  ].join(", ") || "-";
                  return (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-all">
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
                        <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider", typeBadgeColors[c.customerType])}>{typeLabels[c.customerType]}</span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-on-surface">{formatBudget(c.minBudget, c.maxBudget)}</td>
                      <td className="px-5 py-4">
                        {c.urgency ? <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", urgencyDots[c.urgency])} /><span className="text-xs text-on-surface-variant">{c.urgency === "LOW" ? "Düşük" : c.urgency === "MEDIUM" ? "Orta" : c.urgency === "HIGH" ? "Yüksek" : "Acil"}</span></span> : <span className="text-xs text-on-surface-variant">-</span>}
                      </td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant max-w-[120px] truncate">{prefSummary}</td>
                      <td className="px-5 py-4"><span className={cn("text-xs font-medium", lastContact.color)}>{lastContact.text}</span></td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant">{c.assignedAgent?.name || "-"}</td>
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
    </motion.div>
  );
}
