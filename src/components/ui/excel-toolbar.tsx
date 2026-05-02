"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Download, Upload, Loader2, CheckCircle, X, AlertTriangle, FileSpreadsheet, FileDown, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Props {
  exportUrl: string; // GET endpoint — .xlsx döner
  importUrl?: string; // POST endpoint — varsa "Excel'den Yükle" görünür
  templateUrl?: string; // GET endpoint — örnek şablon .xlsx
  label?: string; // kısa entity adı ("müşteri", "ilan")
  onImportSuccess?: () => void; // import tamamlanınca parent'ı yenilemek için
  importGuide?: { columnName: string; description: string }[]; // kılavuz modal'da gösterilecek sütun açıklamaları
}

interface ImportSummary {
  total: number;
  create: number;
  update: number;
  invalid: number;
  created?: number;
  updated?: number;
}

interface ImportRow {
  index: number;
  valid: boolean;
  errors: string[];
  action: "create" | "update" | "skip";
  data: Record<string, unknown>;
}

export function ExcelToolbar({ exportUrl, importUrl, templateUrl, label = "veri", onImportSuccess, importGuide }: Props) {
  const { data: session } = useSession();
  const u = session?.user as unknown as { role?: string; canExport?: boolean; canImport?: boolean } | undefined;
  const canExport = u?.role === "ADMIN" || u?.canExport === true;
  const canImport = u?.role === "ADMIN" || u?.canImport === true;

  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<{ summary: ImportSummary; rows: ImportRow[]; file: File } | null>(null);
  const [done, setDone] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  if (!canExport && !canImport) return null;

  async function handleExport() {
    await downloadFile(exportUrl, `${label}-${Date.now()}.xlsx`);
  }

  async function handleTemplate() {
    if (!templateUrl) return;
    await downloadFile(templateUrl, `${label}-sablonu.xlsx`);
  }

  async function downloadFile(url: string, fallbackName: string) {
    setExporting(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("İndirme başarısız");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/);
      const filename = m?.[1] || fallbackName;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      setError("Dosya indirilemedi");
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !importUrl) return;

    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(importUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Dosya işlenemedi");
        return;
      }
      setPreview({ summary: data.summary, rows: data.rows, file });
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setUploading(false);
    }
  }

  async function handleApply() {
    if (!preview || !importUrl) return;
    setApplying(true);
    setError("");
    const fd = new FormData();
    fd.append("file", preview.file);
    fd.append("apply", "true");
    try {
      const res = await fetch(importUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kayıt başarısız");
        return;
      }
      setDone(data.summary);
      setPreview(null);
      if (onImportSuccess) onImportSuccess();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canExport && (
          <button onClick={handleExport} disabled={exporting}
            className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2 disabled:opacity-50"
            title="Excel'e Al">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">Excel'e Al</span>
          </button>
        )}
        {canImport && importUrl && (
          <button
            onClick={() => {
              if (templateUrl || importGuide) setGuideOpen(true);
              else fileRef.current?.click();
            }}
            disabled={uploading}
            className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2 disabled:opacity-50"
            title="Excel'den Yükle"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="hidden sm:inline">Excel'den Yükle</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Hata */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-8 right-8 bg-error-container text-on-error-container px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 max-w-md">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError("")} className="text-on-error-container/70 hover:text-on-error-container">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Başarı */}
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setDone(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-surface-container-lowest rounded-3xl p-8 max-w-md w-full text-center"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-on-surface mb-2">İçe Aktarma Tamamlandı</h2>
              <p className="text-sm text-on-surface-variant mb-6">
                <strong className="text-green-600">{done.created ?? done.create}</strong> yeni kayıt oluşturuldu, {" "}
                <strong className="text-primary">{done.updated ?? done.update}</strong> kayıt güncellendi.
                {done.invalid > 0 && <> {done.invalid} satır hata nedeniyle atlandı.</>}
              </p>
              <button onClick={() => setDone(null)}
                className="primary-gradient text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10">
                Tamam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kılavuz modal — Excel'den Yükle tıklanınca önce bu açılır */}
      <AnimatePresence>
        {guideOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && setGuideOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-outline-variant/10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center">
                    <Info className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-on-surface">Excel&apos;den Yükleme Kılavuzu</h2>
                    <p className="text-sm text-on-surface-variant">Şablonu indir, doldur, geri yükle</p>
                  </div>
                </div>
                <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-5">
                {/* Adımlar */}
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center shrink-0">1</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">Örnek şablonu indir</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Başlık satırı ve örnek 2 satır içerir. Aşağıdaki butona tıkla.
                      </p>
                      {templateUrl && (
                        <button
                          onClick={handleTemplate}
                          disabled={exporting}
                          className="mt-2 px-4 py-2 bg-primary-fixed hover:bg-primary-fixed/80 text-primary rounded-xl text-xs font-black flex items-center gap-2 disabled:opacity-50"
                        >
                          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                          Şablonu İndir (.xlsx)
                        </button>
                      )}
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center shrink-0">2</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">Şablondaki örnek 2 satırı silip kendi verini yaz</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Başlık satırına dokunma. Sütun başlıklarını birebir aynı bırak.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center shrink-0">3</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">Kaydet ve aşağıdaki &quot;Dosya Seç&quot; butonuyla yükle</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Yüklemeden önce önizleme modalında tüm satırları kontrol edebilirsin. İstediğin an iptal edebilirsin.
                      </p>
                    </div>
                  </li>
                </ol>

                {/* Önemli notlar */}
                <div className="bg-surface-container-low rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Önemli</p>
                  <ul className="text-xs text-on-surface-variant space-y-1 list-disc list-inside">
                    <li>E-posta veya telefon eşleşirse kayıt <strong>güncellenir</strong>, yoksa <strong>yeni oluşturulur</strong>.</li>
                    <li>Zorunlu alanlar: <strong>Ad</strong>, <strong>Soyad</strong>, <strong>Tip</strong>.</li>
                    <li>Tarih formatı: <code className="bg-surface-container px-1 py-0.5 rounded text-[10px]">GG.AA.YYYY</code> (örn: 20.04.2026).</li>
                    <li>Virgülle ayır: Tercih Şehirler, Etiketler vb.</li>
                  </ul>
                </div>

                {/* Sütun listesi (opsiyonel) */}
                {importGuide && importGuide.length > 0 && (
                  <div className="bg-surface-container-low rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sütunlar</p>
                    <ul className="text-xs text-on-surface-variant space-y-1">
                      {importGuide.map((g) => (
                        <li key={g.columnName}>
                          <strong className="text-on-surface">{g.columnName}</strong> — {g.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-outline-variant/10 flex items-center justify-end gap-3 bg-surface-container-low/50">
                <button
                  onClick={() => setGuideOpen(false)}
                  className="px-5 py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => {
                    setGuideOpen(false);
                    fileRef.current?.click();
                  }}
                  className="primary-gradient text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Dosya Seç ve Yükle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && !applying && setPreview(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-on-surface">Excel İçe Aktarma Önizlemesi</h2>
                    <p className="text-sm text-on-surface-variant">{preview.file.name}</p>
                  </div>
                </div>
                <button onClick={() => !applying && setPreview(null)} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Özet */}
              <div className="p-6 border-b border-outline-variant/10 grid grid-cols-4 gap-3">
                <StatTile label="Toplam Satır" value={preview.summary.total} color="text-on-surface" />
                <StatTile label="Yeni" value={preview.summary.create} color="text-green-600" />
                <StatTile label="Güncelleme" value={preview.summary.update} color="text-primary" />
                <StatTile label="Hatalı" value={preview.summary.invalid} color="text-error" />
              </div>

              {/* Satırlar */}
              <div className="flex-1 overflow-auto p-6">
                <div className="space-y-2">
                  {preview.rows.map((row) => (
                    <div key={row.index}
                      className={cn("p-3 rounded-xl text-sm flex items-start gap-3",
                        row.action === "create" ? "bg-green-50 border border-green-200" :
                        row.action === "update" ? "bg-primary-fixed/40 border border-primary/20" :
                        "bg-error-container/20 border border-error/20"
                      )}>
                      <span className="text-[10px] font-black uppercase tracking-wider shrink-0 mt-0.5">
                        #{row.index}
                      </span>
                      <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0",
                        row.action === "create" ? "bg-green-600 text-white" :
                        row.action === "update" ? "bg-primary text-white" :
                        "bg-error text-white"
                      )}>
                        {row.action === "create" ? "Yeni" : row.action === "update" ? "Güncelle" : "Atla"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">
                          {previewRowSummary(row)}
                        </p>
                        {row.errors.length > 0 && (
                          <ul className="mt-1 text-[10px] text-error space-y-0.5">
                            {row.errors.map((err, i) => <li key={i}>• {err}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Butonlar */}
              <div className="p-6 border-t border-outline-variant/10 flex items-center justify-between gap-4 bg-surface-container-low/50">
                <p className="text-xs text-on-surface-variant">
                  {preview.summary.create + preview.summary.update} satır veritabanına kaydedilecek.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => !applying && setPreview(null)} disabled={applying}
                    className="px-5 py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold disabled:opacity-50">
                    İptal
                  </button>
                  <button onClick={handleApply} disabled={applying || (preview.summary.create + preview.summary.update === 0)}
                    className="primary-gradient text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {applying ? "Kaydediliyor..." : "Onayla ve Kaydet"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-3 text-center">
      <p className={cn("text-2xl font-black", color)}>{value}</p>
      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function previewRowSummary(row: ImportRow): string {
  const d = row.data;
  // Müşteri için ad/soyad; ilan için başlık
  const name = [d["firstName"], d["lastName"]].filter(Boolean).join(" ");
  if (name) return name;
  const title = d["title"];
  if (title) return String(title);
  return `Satır ${row.index}`;
}
