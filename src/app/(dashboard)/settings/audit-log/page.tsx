"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, FileText, Filter, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  timestamp: string;
  user: { name: string } | null;
}

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  facets: {
    entities: { value: string; count: number }[];
    actions: { value: string; count: number }[];
  };
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  READ: "bg-secondary-container text-on-secondary-container",
  UPDATE: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  DELETE: "bg-error-container text-on-error-container",
  DENIED_EDIT: "bg-error-container text-on-error-container",
};

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({
    page: 1,
    userId: "",
    entity: "",
    action: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((u) => setUsers(Array.isArray(u) ? u.map((x) => ({ id: x.id, name: x.name })) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(filters.page));
    qs.set("limit", "50");
    if (filters.userId) qs.set("userId", filters.userId);
    if (filters.entity) qs.set("entity", filters.entity);
    if (filters.action) qs.set("action", filters.action);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    fetch(`/api/audit-logs?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [filters]);

  const hasActiveFilter = useMemo(() =>
    Boolean(filters.userId || filters.entity || filters.action || filters.from || filters.to),
    [filters]
  );

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">Denetim Kayıtları</h1>
        <p className="text-sm text-on-surface-variant mt-1 font-medium">KVKK kapsamında tüm veri erişim ve değişiklik kayıtları</p>
      </div>

      <div className="bg-secondary-container/30 p-5 rounded-2xl flex items-center gap-3 text-sm text-on-surface-variant">
        <Info className="w-5 h-5 text-primary shrink-0" />
        Bu loglar KVKK uyumluluk denetimi için saklanmaktadır. Loglar değiştirilemez ve silinemez.
      </div>

      {/* Filtreler */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-on-surface-variant" />
            <h3 className="text-sm font-bold text-on-surface">Filtreler</h3>
            {data && <span className="text-xs text-on-surface-variant">· {data.pagination.total.toLocaleString("tr-TR")} kayıt</span>}
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => setFilters({ page: 1, userId: "", entity: "", action: "", from: "", to: "" })}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Temizle
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          >
            <option value="">Tüm Kullanıcılar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filters.entity}
            onChange={(e) => setFilters({ ...filters, entity: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          >
            <option value="">Tüm Varlıklar</option>
            {(data?.facets?.entities ?? []).map((e) => (
              <option key={e.value} value={e.value}>{e.value} ({e.count})</option>
            ))}
          </select>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
          >
            <option value="">Tüm İşlemler</option>
            {(data?.facets?.actions ?? []).map((a) => (
              <option key={a.value} value={a.value}>{a.value} ({a.count})</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
            placeholder="Başlangıç"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none"
            placeholder="Bitiş"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Tarih</th>
                <th className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Kullanıcı</th>
                <th className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">İşlem</th>
                <th className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Varlık</th>
                <th className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Yükleniyor...
                </td></tr>
              ) : !data || data.logs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  <FileText className="w-10 h-10 opacity-30 mx-auto mb-2" />
                  {hasActiveFilter ? "Filtreye uyan kayıt yok" : "Log kaydı bulunamadı"}
                </td></tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-all">
                    <td className="px-6 py-4 text-xs text-on-surface-variant whitespace-nowrap">{new Date(log.timestamp).toLocaleString("tr-TR")}</td>
                    <td className="px-6 py-4 text-sm text-on-surface font-medium">{log.user?.name || "Sistem"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider whitespace-nowrap", actionColors[log.action] || "bg-surface-container text-on-surface-variant")}>{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{log.entity}</td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant font-mono">{log.entityId?.slice(0, 8) || "-"}</td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">{log.ipAddress || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Sayfa {data.pagination.page} / {totalPages}
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
