"use client";

import { use, useState } from "react";
import { Download, Upload, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { HelpButton } from "@/components/ui/help-button";
import { cn } from "@/lib/utils";

interface PreviewRow {
  index: number;
  blockName: string | null;
  unitNumber: string | null;
  valid: boolean;
  action: "create" | "update" | "skip";
  errors: string[];
  warnings: string[];
  parsed: {
    area: number | null;
    floor: number | null;
    viewType: string | null;
    kitchenType: string | null;
    rooms: string | null;
    hasBalcony: boolean | null;
    customerType: string;
    ownerName: string;
    ownerPhone: string | null;
    ownerAltPhone: string | null;
    ownerEmail: string | null;
    occupancyStatus: string | null;
    operationalNote: string | null;
    callLogPreview: string | null;
  };
  existingPropertyId: string | null;
  matchedCustomerId: string | null;
}

interface PreviewResponse {
  summary: { total: number; create: number; update: number; skip: number; warnings: number; created?: number; updated?: number; customersCreated?: number; notesCreated?: number };
  rows: PreviewRow[];
  ok?: boolean;
  importBatchId?: string;
}

export default function ProjectExcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const confirm = useConfirm();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [appliedResult, setAppliedResult] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadTemplate() {
    const res = await fetch(`/api/projects/${projectId}/properties/import/template`);
    if (!res.ok) {
      toast.error("Şablon indirilemedi");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proje-import-sablonu.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runPreview(targetFile: File) {
    setLoading(true);
    setError(null);
    setAppliedResult(null);
    try {
      const fd = new FormData();
      fd.append("file", targetFile);
      fd.append("apply", "false");
      const res = await fetch(`/api/projects/${projectId}/properties/import`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Önizleme başarısız");
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  async function runApply() {
    if (!file || !preview) return;
    const ok = await confirm({
      title: `${preview.summary.create + preview.summary.update} satır uygulansın mı?`,
      message: `${preview.summary.create} yeni daire, ${preview.summary.update} güncelleme. ${preview.summary.skip > 0 ? `${preview.summary.skip} satır atlanacak.` : ""} Bu işlem geri alınmaz.`,
      tone: "warning",
      confirmText: "Uygula",
    });
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("apply", "true");
      const res = await fetch(`/api/projects/${projectId}/properties/import`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Uygulama başarısız");
      setAppliedResult(data);
      toast.success(`${data.summary.created || 0} oluşturuldu, ${data.summary.updated || 0} güncellendi`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setAppliedResult(null);
    runPreview(f);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black tracking-tight text-on-surface">Excel Import</h2>
        <HelpButton page="projects-excel" title="Excel Import" />
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_4px_16px_rgba(25,28,30,0.04)] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-sm font-bold flex items-center gap-2 text-on-surface"
          >
            <Download className="w-4 h-4" /> Şablon İndir
          </button>
          <label className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Dosya Seç
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileSelected} />
          </label>
          {file && (
            <span className="text-xs text-on-surface-variant truncate max-w-xs">📄 {file.name}</span>
          )}
        </div>

        <div className="text-xs text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface">Beklenen kolonlar:</strong> Blok, Daire, M2, KAT, MANZARA, MUTFAK, ODA SAYISI,
          Malik / Kiracı, Adı Soyadı, E-Posta, Telefon, DURUM, GÖRÜŞME NOTU. Şablon indirip kendi dosyanızı buna göre düzenleyin.
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {appliedResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-black text-base text-green-700 dark:text-green-300">Import Tamamlandı</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <Stat label="Oluşturulan" value={appliedResult.summary.created || 0} />
            <Stat label="Güncellenen" value={appliedResult.summary.updated || 0} />
            <Stat label="Yeni Müşteri" value={appliedResult.summary.customersCreated || 0} />
            <Stat label="Görüşme Notu" value={appliedResult.summary.notesCreated || 0} />
          </div>
          {appliedResult.importBatchId && (
            <p className="text-[10px] text-on-surface-variant mt-3 font-mono">
              Batch ID: {appliedResult.importBatchId}
            </p>
          )}
        </div>
      )}

      {preview && !appliedResult && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_16px_rgba(25,28,30,0.04)] overflow-hidden">
          <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Stat label="Toplam" value={preview.summary.total} />
              <Stat label="Yeni" value={preview.summary.create} tone="success" />
              <Stat label="Güncelleme" value={preview.summary.update} tone="info" />
              {preview.summary.skip > 0 && <Stat label="Atlanacak" value={preview.summary.skip} tone="error" />}
              {preview.summary.warnings > 0 && <Stat label="Uyarı" value={preview.summary.warnings} tone="warn" />}
            </div>
            <button
              onClick={runApply}
              disabled={loading || preview.summary.create + preview.summary.update === 0}
              className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Uygula
            </button>
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="bg-surface-container-low text-[10px] font-black uppercase tracking-wider text-on-surface-variant sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Blok / Daire</th>
                  <th className="text-left px-3 py-2">Sahip</th>
                  <th className="text-left px-3 py-2">Telefon</th>
                  <th className="text-left px-3 py-2">Sakin</th>
                  <th className="text-left px-3 py-2">Aksiyon</th>
                  <th className="text-left px-3 py-2">Notlar</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.index} className={cn("border-t border-outline-variant/10", !r.valid && "bg-error-container/30")}>
                    <td className="px-3 py-2 text-on-surface-variant">{r.index}</td>
                    <td className="px-3 py-2 font-mono">
                      {r.blockName ?? "—"} / {r.unitNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.parsed.ownerName || <span className="text-on-surface-variant italic">—</span>}
                      <div className="text-[10px] text-on-surface-variant">{r.parsed.customerType === "LANDLORD" ? "Ev Sahibi" : "Kiracı"}</div>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {r.parsed.ownerPhone ?? "—"}
                      {r.parsed.ownerAltPhone && <div className="text-[10px] text-on-surface-variant">{r.parsed.ownerAltPhone}</div>}
                    </td>
                    <td className="px-3 py-2">
                      {r.parsed.occupancyStatus && (
                        <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-primary text-[10px] font-bold">
                          {r.parsed.occupancyStatus}
                        </span>
                      )}
                      {r.parsed.operationalNote && (
                        <div className="text-[10px] text-on-surface-variant truncate max-w-[140px]" title={r.parsed.operationalNote}>
                          {r.parsed.operationalNote}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ActionBadge action={r.action} />
                    </td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0 && (
                        <div className="text-error text-[10px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {r.errors.join("; ")}
                        </div>
                      )}
                      {r.warnings.length > 0 && (
                        <div className="text-amber-600 text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {r.warnings.join("; ")}
                        </div>
                      )}
                      {r.matchedCustomerId && <div className="text-[10px] text-primary">Müşteri eşleşti</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "info" | "warn" | "error" }) {
  const toneClass: Record<string, string> = {
    default: "text-on-surface",
    success: "text-green-600",
    info: "text-primary",
    warn: "text-amber-600",
    error: "text-error",
  };
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className={cn("text-2xl font-black", toneClass[tone])}>{value}</div>
    </div>
  );
}

function ActionBadge({ action }: { action: "create" | "update" | "skip" }) {
  const config: Record<string, { label: string; cls: string }> = {
    create: { label: "Yeni", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    update: { label: "Güncelle", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    skip: { label: "Atla", cls: "bg-error-container text-on-error-container" },
  };
  const c = config[action];
  return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", c.cls)}>{c.label}</span>;
}
