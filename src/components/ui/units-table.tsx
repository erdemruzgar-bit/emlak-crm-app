"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Phone, MessageSquarePlus, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatTrPhoneDisplay, maskPhoneDisplay } from "@/lib/phone";
import { PropertyNoteModal } from "./property-note-modal";

interface UnitRow {
  id: string;
  unitNumber: string | null;
  area: number | null;
  floor: number | null;
  rooms: string | null;
  viewType: string | null;
  hasBalcony: boolean | null;
  occupancyStatus: string | null;
  operationalNote: string | null;
  block: { id: string; name: string } | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    altPhone: string | null;
    email: string | null;
    customerType: string;
  } | null;
  ownerSensitiveGated: boolean;
  lastNote: {
    id: string;
    kind: string;
    contentPreview: string;
    createdAt: string;
    userName: string | null;
  } | null;
  noteCount: number;
}

interface OccupancyType {
  code: string;
  label: string;
}

interface UnitsTableProps {
  projectId: string;
}

const KIND_LABELS: Record<string, string> = {
  GENERAL: "Not",
  CALL_LOG: "Telefon",
  MEETING: "Toplantı",
  OPERATIONAL_STATUS: "Durum",
  IMPORTED: "Excel",
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "bugün";
  if (days === 1) return "dün";
  if (days < 30) return `${days} gün önce`;
  return d.toLocaleDateString("tr-TR");
}

export function UnitsTable({ projectId }: UnitsTableProps) {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [blockId, setBlockId] = useState("");
  const [hasOwner, setHasOwner] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);

  // Note modal state
  const [noteModalProperty, setNoteModalProperty] = useState<UnitRow | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.blocks) setBlocks(data.blocks.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
      })
      .catch(() => {});
    fetch("/api/occupancy-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setOccupancyTypes(data);
      })
      .catch(() => {});
  }, [projectId]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (blockId) params.set("blockId", blockId);
      if (hasOwner) params.set("hasOwner", hasOwner);
      if (occupancy) params.set("occupancyStatus", occupancy);
      const res = await fetch(`/api/projects/${projectId}/properties?${params.toString()}`);
      if (!res.ok) throw new Error("Veri çekilemedi");
      const data = await res.json();
      setRows(data.properties || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  // Initial load + filter changes
  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, blockId, hasOwner, occupancy, projectId]);

  const occupancyMap = Object.fromEntries(occupancyTypes.map((o) => [o.code, o.label]));

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Daire / sahip ara..."
          className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 flex-1 min-w-[200px]"
        />
        <select
          value={blockId}
          onChange={(e) => setBlockId(e.target.value)}
          className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm outline-none"
        >
          <option value="">Tüm Bloklar</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={hasOwner}
          onChange={(e) => setHasOwner(e.target.value)}
          className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm outline-none"
        >
          <option value="">Sahip Tümü</option>
          <option value="yes">Sahibi var</option>
          <option value="no">Sahibi yok</option>
        </select>
        <select
          value={occupancy}
          onChange={(e) => setOccupancy(e.target.value)}
          className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm outline-none"
        >
          <option value="">Sakin Durumu</option>
          {occupancyTypes.map((o) => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-on-surface-variant ml-auto">{rows.length} daire</span>
      </div>

      {/* Tablo */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_16px_rgba(25,28,30,0.04)] overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12 text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error-container text-on-error-container text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-16 text-on-surface-variant text-sm">
            Bu filtrelere uyan daire bulunamadı. Filtreleri sıfırlayın veya Excel ile yeni veri yükleyin.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-[10px] font-black tracking-widest uppercase text-on-surface-variant">
                <tr>
                  <th className="text-left px-3 py-2.5">Blok</th>
                  <th className="text-left px-3 py-2.5">Daire</th>
                  <th className="text-left px-3 py-2.5">Oda · m²</th>
                  <th className="text-left px-3 py-2.5">Sahip</th>
                  <th className="text-left px-3 py-2.5">Telefon</th>
                  <th className="text-left px-3 py-2.5">Sakin</th>
                  <th className="text-left px-3 py-2.5">Son Görüşme</th>
                  <th className="text-right px-3 py-2.5">Eylemler</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/40">
                    <td className="px-3 py-2 font-bold">{r.block?.name ?? "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.unitNumber ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-on-surface-variant">
                      {r.rooms ?? "-"}
                      {r.area ? ` · ${r.area}m²` : ""}
                      {r.floor != null ? ` · K${r.floor}` : ""}
                      {r.viewType ? ` · ${r.viewType}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {r.owner ? (
                        <div className="flex flex-col">
                          <span className="font-bold">{r.owner.firstName} {r.owner.lastName}</span>
                          <span className="text-[10px] text-on-surface-variant">
                            {r.owner.customerType === "LANDLORD" ? "Ev Sahibi" : r.owner.customerType === "TENANT" ? "Kiracı" : r.owner.customerType}
                          </span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant text-xs italic">— sahip yok —</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.owner?.phone ? (
                        <div className="flex items-center gap-1.5">
                          {r.ownerSensitiveGated ? (
                            <>
                              <span className="font-mono text-xs text-on-surface-variant">{maskPhoneDisplay(r.owner.phone)}</span>
                              <Link
                                href={`/customers/${r.owner.id}`}
                                target="_blank"
                                className="w-7 h-7 rounded-full hover:bg-primary-fixed flex items-center justify-center text-on-surface-variant hover:text-primary"
                                title="Müşteri sayfasında gerekçe ile aç (KVKK)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </>
                          ) : (
                            <a href={`tel:${r.owner.phone}`} className="font-mono text-xs text-primary hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {formatTrPhoneDisplay(r.owner.phone)}
                            </a>
                          )}
                          {r.owner.altPhone && !r.ownerSensitiveGated && (
                            <span className="text-[10px] text-on-surface-variant">+1</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-on-surface-variant text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.occupancyStatus ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-fixed text-primary">
                          {occupancyMap[r.occupancyStatus] || r.occupancyStatus}
                        </span>
                      ) : r.operationalNote ? (
                        <span className="text-[10px] text-on-surface-variant truncate max-w-[140px] block" title={r.operationalNote}>
                          {r.operationalNote}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.lastNote ? (
                        <div className="flex flex-col" title={r.lastNote.contentPreview}>
                          <span className="text-[10px] font-bold text-on-surface">
                            {KIND_LABELS[r.lastNote.kind] || r.lastNote.kind} · {formatRelative(r.lastNote.createdAt)}
                          </span>
                          <span className="text-[10px] text-on-surface-variant truncate max-w-[200px]">
                            {r.lastNote.contentPreview.slice(0, 50)}{r.lastNote.contentPreview.length > 50 ? "…" : ""}
                          </span>
                          {r.noteCount > 1 && (
                            <span className="text-[10px] text-primary mt-0.5">+{r.noteCount - 1} not daha</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-on-surface-variant text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setNoteModalProperty(r)}
                          className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-primary-fixed text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                          title="Görüşme / Not ekle"
                        >
                          <MessageSquarePlus className="w-3 h-3" /> Not
                        </button>
                        <Link
                          href={`/properties/${r.id}`}
                          className={cn(
                            "w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                          )}
                          title="İlan detayı"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {noteModalProperty && (
        <PropertyNoteModal
          propertyId={noteModalProperty.id}
          propertyTitle={`${noteModalProperty.block?.name ?? ""}/${noteModalProperty.unitNumber ?? ""}`}
          ownerName={
            noteModalProperty.owner
              ? `${noteModalProperty.owner.firstName} ${noteModalProperty.owner.lastName}`.trim()
              : null
          }
          onClose={() => setNoteModalProperty(null)}
          onSaved={() => {
            setNoteModalProperty(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
