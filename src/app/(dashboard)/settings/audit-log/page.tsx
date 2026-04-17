"use client";

import { useEffect, useState } from "react";
import { Info, Loader2, FileText } from "lucide-react";
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

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  READ: "bg-secondary-container text-on-secondary-container",
  UPDATE: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  DELETE: "bg-error-container text-on-error-container",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/audit-logs?page=${page}&limit=50`)
      .then((res) => res.json())
      .then((data) => { setLogs(data.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">Erişim Logları</h1>
        <p className="text-sm text-on-surface-variant mt-1 font-medium">KVKK kapsamında tüm veri erişim ve değişiklik kayıtları</p>
      </div>

      <div className="bg-secondary-container/30 p-5 rounded-2xl flex items-center gap-3 text-sm text-on-surface-variant">
        <Info className="w-5 h-5 text-primary shrink-0" />
        Bu loglar KVKK uyumluluk denetimi için saklanmaktadır. Loglar değiştirilemez ve silinemez.
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tarih</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Kullanıcı</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">İşlem</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Varlık</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Yükleniyor...
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  <FileText className="w-10 h-10 opacity-30 mx-auto mb-2" />
                  Log kaydı bulunamadı
                </td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-all">
                    <td className="px-6 py-4 text-xs text-on-surface-variant">{new Date(log.timestamp).toLocaleString("tr-TR")}</td>
                    <td className="px-6 py-4 text-sm text-on-surface font-medium">{log.user?.name || "Sistem"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider", actionColors[log.action])}>{log.action}</span>
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
      </div>
    </motion.div>
  );
}
