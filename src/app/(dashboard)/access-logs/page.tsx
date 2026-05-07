"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Filter, Clock, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpButton } from "@/components/ui/help-button";

const REASON_LABELS: Record<string, string> = {
  GORUSME: "Görüşme / Arama",
  TAKIP: "Takip / Hatırlatma",
  TEKLIF: "Teklif Hazırlama",
  SOZLESME: "Sözleşme İşlemi",
  DIGER: "Diğer",
};

interface AccessSession {
  id: string;
  reasonCategory: string;
  reason: string;
  fields: string[];
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  startedAt: string;
  endedAt: string | null;
  ipAddress: string | null;
  user: { id: string; name: string; role: string; branch: { name: string | null } | null };
  customer: { id: string; firstName: string; lastName: string };
  exitNote: { id: string; content: string; createdAt: string } | null;
}

interface AccessLogsResponse {
  items: AccessSession[];
  total: number;
  page: number;
  pageSize: number;
  summary: Record<string, number>;
}

export default function AccessLogsPage() {
  const [data, setData] = useState<AccessLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: "",
    customerId: "",
    status: "",
    reasonCategory: "",
    from: "",
    to: "",
    page: 1,
  });
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setUsers(data.filter((u: { isActive: boolean }) => u.isActive));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.userId) qs.set("userId", filters.userId);
    if (filters.customerId) qs.set("customerId", filters.customerId);
    if (filters.status) qs.set("status", filters.status);
    if (filters.reasonCategory) qs.set("reasonCategory", filters.reasonCategory);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    qs.set("page", String(filters.page));
    qs.set("pageSize", "50");

    fetch(`/api/access-logs?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [filters]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Erişim Logları</h1>
            <HelpButton page="access-logs" title="Erişim Logları" />
          </div>
          <p className="text-sm text-on-surface-variant">Hassas veri erişim oturumları (KVKK)</p>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Aktif" value={data?.summary?.ACTIVE ?? 0} icon={Clock} tone="info" />
        <SummaryCard label="Tamamlandı" value={data?.summary?.COMPLETED ?? 0} icon={CheckCircle2} tone="success" />
        <SummaryCard label="Notsuz Kapandı" value={data?.summary?.ABANDONED ?? 0} icon={AlertTriangle} tone="error" />
      </div>

      {/* Filtreler */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          <h3 className="text-sm font-bold text-on-surface">Filtreler</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          >
            <option value="">Tüm Kullanıcılar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="ABANDONED">Notsuz Kapandı</option>
          </select>
          <select
            value={filters.reasonCategory}
            onChange={(e) => setFilters({ ...filters, reasonCategory: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          >
            <option value="">Tüm Gerekçeler</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ userId: "", customerId: "", status: "", reasonCategory: "", from: "", to: "", page: 1 })}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Temizle
          </button>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <ShieldCheck className="w-10 h-10 opacity-30 mb-2" />
            Kayıt bulunamadı
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((s) => (
              <div key={s.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-on-surface">{s.user.name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded font-bold uppercase tracking-wider text-on-surface-variant">{s.user.role}</span>
                      {s.user.branch?.name && (
                        <span className="text-[10px] text-on-surface-variant">· {s.user.branch.name}</span>
                      )}
                      <span className="text-[10px] text-on-surface-variant">→</span>
                      <Link href={`/customers/${s.customer.id}`} className="text-sm font-bold text-primary hover:underline">
                        {s.customer.firstName} {s.customer.lastName}
                      </Link>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                        s.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        s.status === "ABANDONED" ? "bg-error-container text-on-error-container" :
                        "bg-tertiary-fixed text-tertiary"
                      )}>
                        {s.status === "COMPLETED" ? "Tamamlandı" : s.status === "ABANDONED" ? "Notsuz Kapandı" : "Aktif"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-primary rounded font-bold uppercase tracking-wider">
                        {REASON_LABELS[s.reasonCategory] || s.reasonCategory}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface mt-2">{s.reason}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Erişilen alanlar: {s.fields.join(", ") || "-"}
                      {s.ipAddress && <span className="ml-3">IP: {s.ipAddress}</span>}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-on-surface-variant shrink-0">
                    <p>{new Date(s.startedAt).toLocaleString("tr-TR")}</p>
                    {s.endedAt && (
                      <p className="mt-0.5">→ {new Date(s.endedAt).toLocaleString("tr-TR")}</p>
                    )}
                  </div>
                </div>
                {s.exitNote && (
                  <div className="mt-3 p-3 bg-surface-container rounded-xl">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Sonuç Notu</p>
                    <p className="text-sm text-on-surface">{s.exitNote.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sayfalama */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Toplam {data.total} kayıt · Sayfa {data.page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-surface-container disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-surface-container disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: "success" | "info" | "error" }) {
  const styles =
    tone === "success" ? "bg-green-100 text-green-700" :
    tone === "error" ? "bg-error-container text-on-error-container" :
    "bg-tertiary-fixed text-tertiary";
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/10 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", styles)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-on-surface mt-0.5">{value}</p>
      </div>
    </div>
  );
}
