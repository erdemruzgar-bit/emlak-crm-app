"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  ListChecks,
  CalendarRange,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { HelpButton } from "@/components/ui/help-button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type PropertyType = "DAIRE" | "ISYERI" | "VILLA" | "MUSTAKILEV";
type ListingType = "SATILIK" | "KIRALIK";
type Mode = "range" | "list";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "ISYERI", label: "İşyeri / Dükkan" },
  { value: "DAIRE", label: "Daire" },
  { value: "VILLA", label: "Villa" },
  { value: "MUSTAKILEV", label: "Müstakil Ev" },
];

const PROPERTY_TYPE_NOUN: Record<PropertyType, string> = {
  ISYERI: "dükkan",
  DAIRE: "daire",
  VILLA: "villa",
  MUSTAKILEV: "müstakil ev",
};

interface PreviewRow {
  lineNumber: number;
  projectCode: string;
  blockName: string;
  unitNumber: string;
  status: "VALID" | "CONFLICT" | "MISSING_PROJECT" | "MISSING_BLOCK";
  projectId: string | null;
  blockId: string | null;
  projectName?: string;
}

interface PreviewResponse {
  ok: boolean;
  maxRows: number;
  summary: { total: number; valid: number; conflicts: number; missingProjects: number; missingBlocks: number };
  rows: PreviewRow[];
  parseErrors: { lineNumber: number; raw: string; reason: string }[];
  missingProjectCodes: string[];
  missingBlocks: { projectCode: string; blockName: string }[];
}

interface ProjectOption {
  id: string;
  name: string;
  code: string | null;
  blocks: { id: string; name: string }[];
}

function BulkPasteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();

  const initialMode = (searchParams.get("mode") === "list" ? "list" : "range") as Mode;
  const initialProjectId = searchParams.get("projectId") || "";
  const initialPropertyType = (searchParams.get("propertyType") as PropertyType) || "ISYERI";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [propertyType, setPropertyType] = useState<PropertyType>(
    PROPERTY_TYPES.some((t) => t.value === initialPropertyType) ? initialPropertyType : "ISYERI",
  );
  const [listingType, setListingType] = useState<ListingType>("SATILIK");
  const [defaultPrice, setDefaultPrice] = useState("");

  // ===== Aralık modu state =====
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [blockId, setBlockId] = useState("");
  const [startUnit, setStartUnit] = useState("1");
  const [endUnit, setEndUnit] = useState("30");
  const [unitPrefix, setUnitPrefix] = useState("");
  const [unitPadding, setUnitPadding] = useState("3");
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeResult, setRangeResult] = useState<{ created: number; skipped: number; skippedUnits: string[] } | null>(null);

  // ===== Liste modu state =====
  const [raw, setRaw] = useState("");
  const [autoCreateBlocks, setAutoCreateBlocks] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => setProjects([]));
  }, []);

  // Proje değişince blok seçimini sıfırla
  useEffect(() => {
    setBlockId("");
  }, [projectId]);

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId) || null, [projects, projectId]);
  const propertyNoun = PROPERTY_TYPE_NOUN[propertyType];

  // ===== Aralık modu hesaplamaları =====
  const start = parseInt(startUnit) || 0;
  const end = parseInt(endUnit) || 0;
  const rangeCount = end >= start ? end - start + 1 : 0;
  const padding = Math.max(0, Math.min(6, parseInt(unitPadding) || 0));
  const rangeSample =
    rangeCount > 0 && blockId
      ? `${unitPrefix}${start.toString().padStart(padding, "0")} … ${unitPrefix}${end.toString().padStart(padding, "0")}`
      : "";

  async function handleRangeSubmit() {
    if (!projectId) {
      toast.error("Önce bir proje seçin");
      return;
    }
    if (!blockId) {
      toast.error("Önce bir blok seçin");
      return;
    }
    if (rangeCount <= 0) {
      toast.error("Geçersiz aralık");
      return;
    }
    if (rangeCount > 500) {
      toast.error("Tek seferde en fazla 500 birim üretilebilir");
      return;
    }
    const ok = await confirm({
      title: `${rangeCount} ${propertyNoun} oluşturulsun mu?`,
      message: `${rangeSample} aralığında placeholder kayıtlar oluşturulacak. Mevcut numaralar atlanır.`,
      confirmText: "Üret",
    });
    if (!ok) return;
    setRangeLoading(true);
    setRangeResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/bulk-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId,
          startUnit: start,
          endUnit: end,
          unitPrefix,
          unitPadding: padding,
          propertyType,
          listingType,
          defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Üretim başarısız");
        return;
      }
      setRangeResult(data);
      toast.success(`${data.created} ${propertyNoun} oluşturuldu`);
    } finally {
      setRangeLoading(false);
    }
  }

  // ===== Liste modu işleyici =====
  async function handlePreview() {
    if (!raw.trim()) {
      toast.error("Önce listeyi yapıştırın");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/properties/bulk-paste/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, propertyType, listingType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Önizleme oluşturulamadı");
        setPreview(null);
        return;
      }
      setPreview(data);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    if (preview.summary.missingProjects > 0) {
      toast.error("Eşleşmeyen proje(ler) var. Listede proje adı veya kısa kod doğru mu?");
      return;
    }
    if (preview.summary.missingBlocks > 0 && !autoCreateBlocks) {
      toast.error('Eksik bloklar var. "Eksik blokları otomatik oluştur" seçeneğini açın');
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch("/api/properties/bulk-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw,
          propertyType,
          listingType,
          defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0,
          autoCreateBlocks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Üretim başarısız");
        return;
      }
      toast.success(
        `${data.created} ${propertyNoun} üretildi · ${data.skippedConflicts} çakışan atlandı${data.createdBlocks > 0 ? ` · ${data.createdBlocks} yeni blok` : ""}`,
      );
      router.push("/properties");
    } finally {
      setCommitting(false);
    }
  }

  const statusStyle: Record<PreviewRow["status"], string> = {
    VALID: "text-green-700 bg-green-50",
    CONFLICT: "text-amber-700 bg-amber-50",
    MISSING_PROJECT: "text-red-700 bg-red-50",
    MISSING_BLOCK: "text-red-700 bg-red-50",
  };
  const statusLabel: Record<PreviewRow["status"], string> = {
    VALID: "✓ Yeni",
    CONFLICT: "⚠ Zaten var",
    MISSING_PROJECT: "✗ Proje yok",
    MISSING_BLOCK: "✗ Blok yok",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/properties"
          className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface flex items-center gap-2">
            <ClipboardPaste className="w-7 h-7 text-primary" />
            Toplu Mülk Üret
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            İki yöntem var: Aralık (tek proje, ardışık numaralar) veya Liste (birden çok proje, yapıştırılabilir).
          </p>
        </div>
        <div className="ml-auto">
          <HelpButton page="properties-bulk-paste" title="Toplu Mülk Üret" />
        </div>
      </div>

      {/* Mod seçici */}
      <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode("range")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            mode === "range" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <CalendarRange className="w-4 h-4" />
          Aralık ile Üret
        </button>
        <button
          type="button"
          onClick={() => setMode("list")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            mode === "list" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <ListChecks className="w-4 h-4" />
          Liste ile Üret (Çoklu Proje)
        </button>
      </div>

      {/* Ortak: mülk tipi + ilan tipi + fiyat */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 space-y-5 border border-outline-variant/10 shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Mülk tipi ve varsayılanlar
        </h2>
        <div>
          <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">Mülk Tipi *</label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setPropertyType(pt.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  propertyType === pt.value
                    ? "primary-gradient text-white shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
                )}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">İlan Tipi</label>
            <select
              value={listingType}
              onChange={(e) => setListingType(e.target.value as ListingType)}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="SATILIK">Satılık</option>
              <option value="KIRALIK">Kiralık</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Varsayılan Fiyat (₺)</label>
            <input
              type="number"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              placeholder="0 (sonra düzenlenebilir)"
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </section>

      {/* MOD: ARALIK */}
      {mode === "range" && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 space-y-5 border border-outline-variant/10 shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            Tek proje, ardışık numaralar
            <HelpButton page="projects-bulk" title="Aralık ile Daire Üret" />
          </h2>
          <p className="text-xs text-on-surface-variant">
            Bir projedeki bir bloka ardışık birim numarası ile {propertyNoun} kayıtları oluşturun. Mevcut numaralar atlanır.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Proje *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Proje seçin</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.code ? ` (${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Blok *</label>
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                disabled={!selectedProject}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">{selectedProject ? "Blok seçin" : "Önce proje seçin"}</option>
                {selectedProject?.blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {selectedProject && selectedProject.blocks.length === 0 && (
                <p className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Bu projede blok yok. Önce Ayarlar → Projeler'den blok ekleyin.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Başlangıç No</label>
              <input
                type="number"
                value={startUnit}
                onChange={(e) => setStartUnit(e.target.value)}
                min="0"
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Bitiş No</label>
              <input
                type="number"
                value={endUnit}
                onChange={(e) => setEndUnit(e.target.value)}
                min="0"
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Önek (opsiyonel)</label>
              <input
                type="text"
                value={unitPrefix}
                onChange={(e) => setUnitPrefix(e.target.value)}
                placeholder="Örn: A1-"
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Hane (padding)</label>
              <input
                type="number"
                value={unitPadding}
                onChange={(e) => setUnitPadding(e.target.value)}
                min="0"
                max="6"
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {rangeSample && (
            <div className="bg-primary-fixed/40 rounded-xl p-4 text-sm flex items-start gap-2">
              <Layers className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-on-surface">
                  {rangeCount} {propertyNoun} üretilecek
                </p>
                <p className="text-xs text-on-surface-variant font-mono mt-1">{rangeSample}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRangeSubmit}
              disabled={rangeLoading || !projectId || !blockId || rangeCount <= 0}
              className="primary-gradient text-white px-8 py-3 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {rangeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {rangeCount > 0 ? `${rangeCount} ${propertyNoun} üret` : "Üret"}
            </button>
          </div>

          {rangeResult && (
            <div className="bg-secondary-container/40 rounded-xl p-4 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-on-surface">
                  {rangeResult.created} yeni {propertyNoun} oluşturuldu
                </p>
                {rangeResult.skipped > 0 && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    {rangeResult.skipped} numara mevcuttu, atlandı: {rangeResult.skippedUnits.slice(0, 10).join(", ")}
                    {rangeResult.skippedUnits.length > 10 && ` +${rangeResult.skippedUnits.length - 10}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* MOD: LİSTE */}
      {mode === "list" && (
        <>
          <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 space-y-4 border border-outline-variant/10 shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              Listeyi yapıştırın (birden çok proje)
            </h2>
            <p className="text-xs text-on-surface-variant">
              Her satırda <b>proje (ad veya kısa kod)</b>, <b>blok</b>, <b>birim no</b> — TAB veya çoklu boşlukla ayrılmış. Excel/Sheets&apos;ten kopyala-yapıştır çalışır.
              <br />Örn:&nbsp;
              <code className="px-2 py-0.5 rounded bg-surface-container-low">2124&nbsp;&nbsp;&nbsp;A1&nbsp;&nbsp;&nbsp;21</code>
              &nbsp;veya&nbsp;
              <code className="px-2 py-0.5 rounded bg-surface-container-low">MEYDAN BAŞAKŞEHİR&nbsp;&nbsp;&nbsp;A1&nbsp;&nbsp;&nbsp;21</code>
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={12}
              placeholder={"2124\tA1\t21\n2124\tA1\t22\n2125\tB1\t33\n..."}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-mono border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-surface-container-low rounded-xl w-fit">
              <input
                type="checkbox"
                checked={autoCreateBlocks}
                onChange={(e) => setAutoCreateBlocks(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-primary rounded-md"
              />
              <div>
                <p className="text-xs font-bold text-on-surface">Eksik blokları otomatik oluştur</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Kapalıyken eksik blok hatası alırsınız.</p>
              </div>
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewLoading || !raw.trim()}
                className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Önizle
              </button>
            </div>
          </section>

          {preview && (
            <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 space-y-4 border border-outline-variant/10 shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Önizleme ve onay
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-2xl font-black text-on-surface">{preview.summary.total}</p>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">Toplam Satır</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-green-700">{preview.summary.valid}</p>
                  <p className="text-[10px] uppercase tracking-wider text-green-700 mt-1">Yeni</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-amber-700">{preview.summary.conflicts}</p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-700 mt-1">Çakışma</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-red-700">{preview.summary.missingProjects}</p>
                  <p className="text-[10px] uppercase tracking-wider text-red-700 mt-1">Eksik Proje</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-2xl font-black text-red-700">{preview.summary.missingBlocks}</p>
                  <p className="text-[10px] uppercase tracking-wider text-red-700 mt-1">Eksik Blok</p>
                </div>
              </div>

              {preview.missingProjectCodes.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800">
                  <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Eşleşmeyen proje(ler)</p>
                  Şu referans(lar) hiçbir proje adı veya kısa kodla eşleşmedi: <b>{preview.missingProjectCodes.join(", ")}</b>. Ayarlar → Projeler ekranından kısa kod atayabilir veya tam proje adıyla yeniden deneyebilirsiniz.
                </div>
              )}

              {preview.missingBlocks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                  <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Eksik bloklar</p>
                  {preview.missingBlocks.map((mb, i) => (
                    <span key={i} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-white/60 rounded">
                      {mb.projectCode} / {mb.blockName}
                    </span>
                  ))}
                  <p className="mt-2">
                    &quot;Eksik blokları otomatik oluştur&quot; seçeneğini açarsanız onay sırasında oluşturulur.
                  </p>
                </div>
              )}

              {preview.parseErrors.length > 0 && (
                <div className="bg-surface-container-low rounded-xl p-4 text-xs space-y-1">
                  <p className="font-bold mb-2">Parse hataları:</p>
                  {preview.parseErrors.slice(0, 10).map((e, i) => (
                    <div key={i} className="text-on-surface-variant">
                      Satır {e.lineNumber}: <code>{e.raw}</code> — {e.reason}
                    </div>
                  ))}
                  {preview.parseErrors.length > 10 && (
                    <p className="text-on-surface-variant">… ve {preview.parseErrors.length - 10} hata daha</p>
                  )}
                </div>
              )}

              <div className="max-h-80 overflow-auto rounded-xl border border-outline-variant/10">
                <table className="w-full text-xs">
                  <thead className="bg-surface-container-low sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Proje</th>
                      <th className="text-left px-3 py-2">Blok</th>
                      <th className="text-left px-3 py-2">Birim</th>
                      <th className="text-left px-3 py-2">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {preview.rows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 text-on-surface-variant">{r.lineNumber}</td>
                        <td className="px-3 py-1.5">
                          <span className="font-bold">{r.projectCode}</span>
                          {r.projectName && <span className="text-on-surface-variant"> — {r.projectName}</span>}
                        </td>
                        <td className="px-3 py-1.5">{r.blockName}</td>
                        <td className="px-3 py-1.5 font-mono">{r.unitNumber}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn("px-2 py-0.5 rounded font-bold", statusStyle[r.status])}>
                            {statusLabel[r.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="px-6 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={
                    committing ||
                    preview.summary.valid === 0 ||
                    preview.summary.missingProjects > 0 ||
                    (preview.summary.missingBlocks > 0 && !autoCreateBlocks)
                  }
                  className="primary-gradient text-white px-8 py-3 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {committing ? "Üretiliyor..." : `${preview.summary.valid} ${propertyNoun} üret`}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </motion.div>
  );
}

export default function BulkPastePage() {
  return (
    <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <BulkPasteInner />
    </Suspense>
  );
}
