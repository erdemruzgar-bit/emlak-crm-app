"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, FileText, Filter, X, Search, Trash2, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { HelpButton } from "@/components/ui/help-button";

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

interface Analysis {
  user: { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string };
  total: number;
  deleteCount: number;
  byAction: { action: string; count: number }[];
  byEntityAction: { entity: string; action: string; count: number }[];
  deletes: { entity: string; entityId: string | null; timestamp: string; ipAddress: string | null; label: string }[];
  firstActivity: string | null;
  lastActivity: string | null;
  dailyCounts: { date: string; count: number }[];
  deactivatedAt: string | null;
}

const roleLabels: Record<string, string> = { ADMIN: "Yönetici", MANAGER: "Şube Müdürü", AGENT: "Danışman" };

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // ─── Kullanıcı Adli İncelemesi ───
  const [forensicUser, setForensicUser] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function runAnalysis() {
    if (!forensicUser) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const r = await fetch(`/api/audit-logs/analysis?userId=${encodeURIComponent(forensicUser)}`);
      setAnalysis(r.ok ? await r.json() : null);
    } catch {
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }

  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("tr-TR") : "—");
  const topDays = useMemo(
    () => (analysis ? [...analysis.dailyCounts].sort((a, b) => b.count - a.count).slice(0, 8) : []),
    [analysis]
  );

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Denetim Kayıtları</h1>
          <HelpButton page="settings-audit-log" title="Denetim Kayıtları" />
        </div>
        <p className="text-sm text-on-surface-variant mt-1 font-medium">KVKK kapsamında tüm veri erişim ve değişiklik kayıtları</p>
      </div>

      <div className="bg-secondary-container/30 p-5 rounded-2xl flex items-center gap-3 text-sm text-on-surface-variant">
        <Info className="w-5 h-5 text-primary shrink-0" />
        Bu loglar KVKK uyumluluk denetimi için saklanmaktadır. Loglar değiştirilemez ve silinemez.
      </div>

      {/* Kullanıcı Adli İncelemesi (yalnızca ADMIN) */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-on-surface">Kullanıcı Adli İncelemesi</h3>
          <span className="text-xs text-on-surface-variant">— bir kullanıcının tüm işlemlerini, silmelerini ve etkinlik zaman çizelgesini özetler</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={forensicUser}
            onChange={(e) => { setForensicUser(e.target.value); setAnalysis(null); }}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none min-w-[220px]"
          >
            <option value="">Kullanıcı seçin…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button
            onClick={runAnalysis}
            disabled={!forensicUser || analyzing}
            className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {analyzing ? "Analiz ediliyor…" : "Analiz Et"}
          </button>
        </div>

        {!analysis && !analyzing && (
          <p className="text-xs text-on-surface-variant">
            Bir kullanıcı seçip “Analiz Et”e basın. (İşten ayrılan birinin veri sildiğinden şüpheleniyorsanız buradan saniyeler içinde kontrol edebilirsiniz.)
          </p>
        )}

        {analysis && (
          <div className="space-y-5 pt-2">
            {/* Kullanıcı başlığı + pencere */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-bold text-on-surface">{analysis.user.name}</span>
              <span className="text-on-surface-variant text-xs">{analysis.user.email}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase bg-secondary-container text-on-secondary-container">{roleLabels[analysis.user.role] ?? analysis.user.role}</span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase", analysis.user.isActive ? "bg-green-100 text-green-700" : "bg-surface-container text-on-surface-variant")}>{analysis.user.isActive ? "Aktif" : "Pasif"}</span>
            </div>
            <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-6 gap-y-1">
              <span>İlk işlem: <strong className="text-on-surface">{fmtDate(analysis.firstActivity)}</strong></span>
              <span>Son işlem: <strong className="text-on-surface">{fmtDate(analysis.lastActivity)}</strong></span>
              {analysis.deactivatedAt && <span>Pasife alınma: <strong className="text-on-surface">{fmtDate(analysis.deactivatedAt)}</strong></span>}
            </div>

            {/* Stat kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-container-low rounded-2xl p-4">
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Toplam İşlem</p>
                <p className="text-2xl font-black text-on-surface mt-1">{analysis.total}</p>
              </div>
              <div className={cn("rounded-2xl p-4", analysis.deleteCount > 0 ? "bg-error-container" : "bg-surface-container-low")}>
                <p className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1", analysis.deleteCount > 0 ? "text-on-error-container" : "text-green-700")}>
                  {analysis.deleteCount > 0 ? <Trash2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />} Silme
                </p>
                <p className={cn("text-2xl font-black mt-1", analysis.deleteCount > 0 ? "text-on-error-container" : "text-green-700")}>{analysis.deleteCount}</p>
              </div>
              {["CREATE", "UPDATE"].map((act) => (
                <div key={act} className="bg-surface-container-low rounded-2xl p-4">
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{act === "CREATE" ? "Ekleme" : "Güncelleme"}</p>
                  <p className="text-2xl font-black text-on-surface mt-1">{analysis.byAction.find((a) => a.action === act)?.count ?? 0}</p>
                </div>
              ))}
            </div>

            {/* Silme detayları */}
            {analysis.deleteCount > 0 ? (
              <div className="border border-error/30 rounded-2xl overflow-hidden">
                <div className="bg-error-container/50 px-4 py-2 text-xs font-bold text-on-error-container flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Silme İşlemleri ({analysis.deletes.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="text-left px-3 py-2 font-black text-on-surface-variant">Tarih</th>
                        <th className="text-left px-3 py-2 font-black text-on-surface-variant">Varlık</th>
                        <th className="text-left px-3 py-2 font-black text-on-surface-variant">Kayıt</th>
                        <th className="text-left px-3 py-2 font-black text-on-surface-variant">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.deletes.map((d, i) => (
                        <tr key={i} className="border-t border-outline-variant/10">
                          <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{fmtDate(d.timestamp)}</td>
                          <td className="px-3 py-2 text-on-surface">{d.entity}</td>
                          <td className="px-3 py-2 text-on-surface-variant">{d.label || d.entityId?.slice(0, 8) || "—"}</td>
                          <td className="px-3 py-2 text-on-surface-variant">{d.ipAddress || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-green-100 text-green-700 rounded-2xl p-4 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" /> Bu kullanıcı, loglanan kategorilerde (müşteri, ilan, görsel, randevu, görev, hatırlatma, eşleşme, blok, şube, kullanıcı, kataloglar) <strong>hiçbir kayıt silmemiş.</strong>
              </div>
            )}

            {/* Varlık × işlem + en yoğun günler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2">Varlık × İşlem</p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {analysis.byEntityAction.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-surface-container-low rounded-lg px-3 py-1.5">
                      <span className="text-on-surface">{r.entity} / {r.action}</span>
                      <span className="font-bold text-on-surface-variant">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2">En Yoğun Günler</p>
                <div className="space-y-1">
                  {topDays.map((d) => (
                    <div key={d.date} className="flex items-center justify-between text-xs bg-surface-container-low rounded-lg px-3 py-1.5">
                      <span className="text-on-surface">{d.date}</span>
                      <span className="font-bold text-on-surface-variant">{d.count} işlem</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
                <TableSkeleton rows={8} cols={6} />
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
