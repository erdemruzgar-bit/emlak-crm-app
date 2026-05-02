"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Tags, Plus, Trash2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface ListingTypeCatalog {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function ListingTypesSettingsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<ListingTypeCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/listing-types");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newLabel.trim()) return;
    setError("");
    setSaving(true);
    const payload: Record<string, unknown> = {
      code: newCode.trim().toUpperCase(),
      label: newLabel.trim(),
    };
    if (newOrder && /^-?\d+$/.test(newOrder)) payload.sortOrder = parseInt(newOrder);
    const res = await fetch("/api/listing-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Eklenemedi");
    } else {
      setNewCode("");
      setNewLabel("");
      setNewOrder("");
      await load();
    }
    setSaving(false);
  }

  async function deleteItem(id: string, label: string) {
    const ok = await confirm({
      title: `"${label}" tipini sil?`,
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/listing-types/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Silinemedi");
      return;
    }
    toast.success("İlan tipi silindi");
    load();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
          <Tags className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface">İlan Tipleri</h1>
          <p className="text-sm text-on-surface-variant">
            İlan formundaki ve filtrelerdeki tip seçeneklerini yönet (örn: Satılık, Kiralık, Arşiv).
          </p>
        </div>
      </div>

      <form
        onSubmit={addItem}
        className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)] flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
            Kod * (BÜYÜK)
          </label>
          <input
            placeholder="DEVREN_KIRALIK"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
            required
            className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
            Etiket (Türkçe) *
          </label>
          <input
            placeholder="Devren Kiralık"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="w-28">
          <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
            Sıra
          </label>
          <input
            type="number"
            placeholder="40"
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newCode.trim() || !newLabel.trim()}
          className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {saving ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-3 text-sm font-medium">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <Tags className="w-12 h-12 mx-auto text-on-surface-variant/40" />
          <p className="text-sm font-bold text-on-surface mt-4">Kayıtlı tip yok</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 px-4 py-3 bg-surface-container-lowest rounded-2xl shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface truncate">{it.label}</p>
                <p className="text-[10px] text-on-surface-variant font-mono">{it.code} · Sıra: {it.sortOrder}</p>
              </div>
              <button
                onClick={() => deleteItem(it.id, it.label)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error-container shrink-0"
                title="Sil"
              >
                <Trash2 className="w-4 h-4 text-on-surface-variant" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
