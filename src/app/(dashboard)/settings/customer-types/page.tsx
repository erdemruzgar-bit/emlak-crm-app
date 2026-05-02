"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { UserCog, Plus, Trash2, Loader2, Home, Building2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface CustomerTypeCatalog {
  id: string;
  code: string;
  label: string;
  isTenantSide: boolean;
  isOwnerSide: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function CustomerTypesSettingsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<CustomerTypeCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newTenantSide, setNewTenantSide] = useState(false);
  const [newOwnerSide, setNewOwnerSide] = useState(false);
  const [newOrder, setNewOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/customer-types");
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
      isTenantSide: newTenantSide,
      isOwnerSide: newOwnerSide,
    };
    if (newOrder && /^-?\d+$/.test(newOrder)) payload.sortOrder = parseInt(newOrder);
    const res = await fetch("/api/customer-types", {
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
      setNewTenantSide(false);
      setNewOwnerSide(false);
      setNewOrder("");
      await load();
    }
    setSaving(false);
  }

  async function toggleFlag(id: string, key: "isTenantSide" | "isOwnerSide", value: boolean) {
    const res = await fetch(`/api/customer-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (res.ok) load();
  }

  async function deleteItem(id: string, label: string) {
    const ok = await confirm({
      title: `"${label}" tipini sil?`,
      message: "Bu tipi kullanan müşteriler varsa silme engellenebilir.",
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/customer-types/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Silinemedi");
      return;
    }
    toast.success("Tip silindi");
    load();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
          <UserCog className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface">Müşteri Tipleri</h1>
          <p className="text-sm text-on-surface-variant">
            Müşteri kategorilerini yönet. &quot;Kiracı/Alıcı&quot; ve &quot;Mülk Sahibi&quot; işaretleri
            kontrat formundaki filtreleri belirler.
          </p>
        </div>
      </div>

      <form
        onSubmit={addItem}
        className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Kod * (BÜYÜK)
            </label>
            <input
              placeholder="YATIRIMCI"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              required
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Etiket (Türkçe) *
            </label>
            <input
              placeholder="Yatırımcı"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
              Sıra
            </label>
            <input
              type="number"
              placeholder="60"
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={newTenantSide}
              onChange={(e) => setNewTenantSide(e.target.checked)}
              className="accent-primary"
            />
            <Home className="w-3.5 h-3.5" />
            Kontrat &quot;Kiracı/Alıcı&quot; tarafında
          </label>
          <label className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={newOwnerSide}
              onChange={(e) => setNewOwnerSide(e.target.checked)}
              className="accent-primary"
            />
            <Building2 className="w-3.5 h-3.5" />
            Kontrat &quot;Mülk Sahibi&quot; tarafında
          </label>
          <button
            type="submit"
            disabled={saving || !newCode.trim() || !newLabel.trim()}
            className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 ml-auto"
          >
            <Plus className="w-4 h-4" />
            {saving ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <UserCog className="w-12 h-12 mx-auto text-on-surface-variant/40" />
          <p className="text-sm font-bold text-on-surface mt-4">Kayıtlı tip yok</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-container-lowest rounded-2xl shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-on-surface">{it.label}</span>
                  <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                    {it.code}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">Sıra: {it.sortOrder}</span>
                </div>
                <div className="flex gap-3 mt-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={it.isTenantSide}
                      onChange={(e) => toggleFlag(it.id, "isTenantSide", e.target.checked)}
                      className="accent-primary"
                    />
                    <Home className="w-3 h-3" /> Kiracı/Alıcı tarafı
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={it.isOwnerSide}
                      onChange={(e) => toggleFlag(it.id, "isOwnerSide", e.target.checked)}
                      className="accent-primary"
                    />
                    <Building2 className="w-3 h-3" /> Mülk Sahibi tarafı
                  </label>
                </div>
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
