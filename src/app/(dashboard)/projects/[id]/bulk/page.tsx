"use client";

// Toplu placeholder daire üretimi: blok seç + aralık → N daire üretilir.

import { use, useEffect, useState } from "react";
import { Loader2, Layers, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { HelpButton } from "@/components/ui/help-button";

interface Block {
  id: string;
  name: string;
}

export default function ProjectBulkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const confirm = useConfirm();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState("");
  const [startUnit, setStartUnit] = useState("1");
  const [endUnit, setEndUnit] = useState("30");
  const [unitPrefix, setUnitPrefix] = useState("");
  const [unitPadding, setUnitPadding] = useState("3");
  const [defaultPrice, setDefaultPrice] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; skippedUnits: string[] } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { blocks?: Block[] } | null) => {
        if (p?.blocks) setBlocks(p.blocks);
      })
      .catch(() => {});
  }, [projectId]);

  const start = parseInt(startUnit) || 0;
  const end = parseInt(endUnit) || 0;
  const count = end >= start ? end - start + 1 : 0;
  const padding = Math.max(0, Math.min(6, parseInt(unitPadding) || 0));
  const sample =
    count > 0 && blockId
      ? `${unitPrefix}${start.toString().padStart(padding, "0")} … ${unitPrefix}${end.toString().padStart(padding, "0")}`
      : "";

  async function handleSubmit() {
    if (!blockId) {
      toast.error("Önce bir blok seçin");
      return;
    }
    if (count <= 0) {
      toast.error("Geçersiz aralık");
      return;
    }
    if (count > 500) {
      toast.error("Tek seferde en fazla 500 daire üretilebilir");
      return;
    }
    const ok = await confirm({
      title: `${count} daire oluşturulsun mu?`,
      message: `${sample} aralığında placeholder daireler oluşturulacak. Mevcut numaralar atlanır.`,
      confirmText: "Üret",
    });
    if (!ok) return;
    setLoading(true);
    setResult(null);
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
          defaultPrice: parseFloat(defaultPrice) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Üretim başarısız");
        return;
      }
      setResult(data);
      toast.success(`${data.created} daire oluşturuldu`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black tracking-tight text-on-surface">Toplu Daire Üret</h2>
        <HelpButton page="projects-bulk" title="Toplu Daire Üret" />
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
            Blok <span className="text-error">*</span>
          </label>
          <select
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Blok seçin</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {blocks.length === 0 && (
            <p className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Bu projede blok yok. Önce Ayarlar → Projeler'den blok ekleyin.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Başlangıç No
            </label>
            <input
              type="number"
              value={startUnit}
              onChange={(e) => setStartUnit(e.target.value)}
              min="0"
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Bitiş No
            </label>
            <input
              type="number"
              value={endUnit}
              onChange={(e) => setEndUnit(e.target.value)}
              min="0"
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Önek (opsiyonel)
            </label>
            <input
              type="text"
              value={unitPrefix}
              onChange={(e) => setUnitPrefix(e.target.value)}
              placeholder="Örn: A1-"
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Hane (padding)
            </label>
            <input
              type="number"
              value={unitPadding}
              onChange={(e) => setUnitPadding(e.target.value)}
              min="0"
              max="6"
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
            Varsayılan Fiyat (TRY) — placeholder
          </label>
          <input
            type="number"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            min="0"
            className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {sample && (
          <div className="bg-primary-fixed/40 rounded-xl p-4 text-sm flex items-start gap-2">
            <Layers className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-on-surface">
                {count} daire üretilecek
              </p>
              <p className="text-xs text-on-surface-variant font-mono mt-1">{sample}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !blockId || count <= 0}
          className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Üret
        </button>

        {result && (
          <div className="bg-secondary-container/40 rounded-xl p-4 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-on-surface">
                {result.created} yeni daire oluşturuldu
              </p>
              {result.skipped > 0 && (
                <p className="text-xs text-on-surface-variant mt-1">
                  {result.skipped} numara mevcuttu, atlandı: {result.skippedUnits.slice(0, 10).join(", ")}
                  {result.skippedUnits.length > 10 && ` +${result.skippedUnits.length - 10}`}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
