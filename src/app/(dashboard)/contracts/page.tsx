"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSignature, Plus, Search, Calendar, Paperclip, Home, AlertCircle, User as UserIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { HelpButton } from "@/components/ui/help-button";

interface Contract {
  id: string;
  contractType: "KIRA" | "SATIS" | "KOMISYON";
  title: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "RENEWED" | "TERMINATED";
  createdAt: string;
  property: { id: string; title: string; address: string | null; city: string | null; district: string | null } | null;
  customer: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  createdBy: { name: string };
  _count: { attachments: number };
}

const typeLabels: Record<string, string> = { KIRA: "Kira", SATIS: "Satış", KOMISYON: "Komisyon" };
const typeColors: Record<string, string> = {
  KIRA: "bg-primary-fixed text-primary",
  SATIS: "bg-tertiary-fixed text-tertiary",
  KOMISYON: "bg-secondary-container text-on-secondary-container",
};
const statusLabels: Record<string, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Aktif",
  EXPIRED: "Süresi Doldu",
  RENEWED: "Yenilendi",
  TERMINATED: "Feshedildi",
};
const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-container text-on-surface-variant",
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-error-container text-on-error-container",
  RENEWED: "bg-primary-fixed text-primary",
  TERMINATED: "bg-surface-container text-on-surface-variant line-through",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const d = new Date(iso);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/contracts?${params}`);
    if (res.ok) setContracts(await res.json());
    setLoading(false);
  }

  const filtered = contracts.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(s) ||
      c.property?.title.toLowerCase().includes(s) ||
      c.customer?.firstName.toLowerCase().includes(s) ||
      c.customer?.lastName.toLowerCase().includes(s)
    );
  });

  const expiringSoon = contracts.filter((c) => {
    const days = daysUntil(c.endDate);
    return c.status === "ACTIVE" && days !== null && days >= 0 && days <= 30;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 primary-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/10">
            <FileSignature className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tighter text-on-surface">Sözleşmeler</h1>
              <HelpButton page="contracts-list" title="Sözleşmeler" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium mt-1">
              Kira, satış ve komisyon sözleşmeleri — PDF ekleri ile
            </p>
          </div>
        </div>
        <Link
          href="/contracts/new"
          className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Yeni Sözleşme
        </Link>
      </div>

      {/* Yaklaşan bitişler uyarısı */}
      {expiringSoon.length > 0 && (
        <div className="bg-tertiary-fixed border border-tertiary/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">
              {expiringSoon.length} sözleşmenin bitişine 30 gün veya daha az var
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Yenileme sürecini başlatmak için bu sözleşmeleri gözden geçirin.
            </p>
          </div>
        </div>
      )}

      {/* Arama + Filtreler */}
      <div className="bg-surface-container-lowest rounded-3xl p-4 shadow-[0_8px_24px_rgba(25,28,30,0.04)] border border-outline-variant/10 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Başlık, mülk, müşteri ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 font-medium"
        >
          <option value="">Tüm Tipler</option>
          <option value="KIRA">Kira</option>
          <option value="SATIS">Satış</option>
          <option value="KOMISYON">Komisyon</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 font-medium"
        >
          <option value="">Tüm Durumlar</option>
          <option value="DRAFT">Taslak</option>
          <option value="ACTIVE">Aktif</option>
          <option value="EXPIRED">Süresi Doldu</option>
          <option value="RENEWED">Yenilendi</option>
          <option value="TERMINATED">Feshedildi</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <FileSignature className="w-12 h-12 mx-auto text-on-surface-variant/40" />
          <p className="text-sm font-bold text-on-surface mt-4">Sözleşme bulunamadı</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Yeni bir sözleşme oluşturmak için yukarıdaki butonu kullanın.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(25,28,30,0.04)] border border-outline-variant/10">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr className="text-left text-[10px] uppercase tracking-wider font-black text-on-surface-variant">
                <th className="px-5 py-3">Başlık</th>
                <th className="px-3 py-3">Tip</th>
                <th className="px-3 py-3">Mülk</th>
                <th className="px-3 py-3">Müşteri</th>
                <th className="px-3 py-3">Tutar</th>
                <th className="px-3 py-3">Bitiş</th>
                <th className="px-3 py-3">Durum</th>
                <th className="px-3 py-3">Ek</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const days = daysUntil(c.endDate);
                const expiringSoonRow = c.status === "ACTIVE" && days !== null && days >= 0 && days <= 30;
                return (
                  <tr
                    key={c.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-low/60 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/contracts/${c.id}`} className="font-bold text-sm text-on-surface hover:text-primary">
                        {c.title}
                      </Link>
                      <div className="text-[11px] text-on-surface-variant">
                        {formatDate(c.startDate)} · {c.createdBy.name}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-full", typeColors[c.contractType])}>
                        {typeLabels[c.contractType]}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {c.property ? (
                        <div className="flex items-start gap-1.5">
                          <Home className="w-3.5 h-3.5 text-on-surface-variant mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium text-on-surface">{c.property.title}</div>
                            <div className="text-[11px] text-on-surface-variant">
                              {[c.property.city, c.property.district].filter(Boolean).join(" / ")}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {c.customer ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-on-surface-variant" />
                          <span className="font-medium">
                            {c.customer.firstName} {c.customer.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm font-bold text-on-surface">
                      {c.amount.toLocaleString("tr-TR")} {c.currency}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span className={cn(expiringSoonRow && "text-tertiary font-bold")}>
                          {formatDate(c.endDate)}
                        </span>
                      </div>
                      {expiringSoonRow && days !== null && (
                        <div className="text-[10px] text-tertiary font-bold">{days} gün kaldı</div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-full", statusColors[c.status])}>
                        {statusLabels[c.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {c._count.attachments > 0 ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-primary">
                          <Paperclip className="w-3.5 h-3.5" />
                          {c._count.attachments}
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/40 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
