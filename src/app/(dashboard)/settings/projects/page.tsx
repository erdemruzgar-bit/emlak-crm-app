"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Blocks, Plus, Trash2, X, Home as HomeIcon, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Block {
  id: string;
  name: string;
  totalUnits: number | null;
}

interface Project {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  developer: string | null;
  description: string | null;
  blocks: Block[];
  _count: { properties: number };
}

export default function ProjectsSettingsPage() {
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Yeni proje form
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newDeveloper, setNewDeveloper] = useState("");
  const [newBlocks, setNewBlocks] = useState<{ name: string; totalUnits: string }[]>([
    { name: "", totalUnits: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }

  function toggle(id: string) {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const payload = {
      name: newName.trim(),
      city: newCity.trim() || undefined,
      district: newDistrict.trim() || undefined,
      developer: newDeveloper.trim() || undefined,
      blocks: newBlocks
        .filter((b) => b.name.trim())
        .map((b) => ({
          name: b.name.trim(),
          totalUnits: b.totalUnits ? parseInt(b.totalUnits) : undefined,
        })),
    };
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setNewName("");
      setNewCity("");
      setNewDistrict("");
      setNewDeveloper("");
      setNewBlocks([{ name: "", totalUnits: "" }]);
      setCreating(false);
      await load();
    }
    setSaving(false);
  }

  async function deleteProject(id: string, name: string) {
    const ok = await confirm({
      title: `"${name}" projesini sil?`,
      message: "Bağlı blok ve ilanlar varsa silme engellenebilir.",
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Silinemedi");
      return;
    }
    toast.success("Proje silindi");
    load();
  }

  async function addBlock(projectId: string) {
    const name = prompt("Yeni blok adı (örn: A, D/02):");
    if (!name) return;
    const totalStr = prompt("Toplam B. Bölüm adedi (opsiyonel):");
    const payload: Record<string, unknown> = { name };
    if (totalStr && /^\d+$/.test(totalStr)) payload.totalUnits = parseInt(totalStr);
    const res = await fetch(`/api/projects/${projectId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Blok eklenemedi");
      return;
    }
    load();
  }

  async function deleteBlock(projectId: string, blockId: string, name: string) {
    const ok = await confirm({
      title: `"${name}" bloğunu sil?`,
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/projects/${projectId}/blocks/${blockId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Silinemedi");
      return;
    }
    toast.success("Blok silindi");
    load();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
            <Blocks className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Projeler ve Bloklar</h1>
            <p className="text-sm text-on-surface-variant">
              Toplu konut projelerini ve bloklarını yönet · Günlük operasyon için{" "}
              <a href="/projects" className="text-primary font-bold hover:underline">
                Projeler modülü
              </a>
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="primary-gradient text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Yeni Proje
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={createProject}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4 overflow-hidden"
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">Yeni Proje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Proje adı (örn: AVRASYA 1) *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                placeholder="Müteahhit"
                value={newDeveloper}
                onChange={(e) => setNewDeveloper(e.target.value)}
                className="px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                placeholder="Şehir"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                placeholder="İlçe"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                className="px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
                Bloklar (opsiyonel)
              </label>
              <div className="space-y-2">
                {newBlocks.map((b, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      placeholder="Blok adı (A, D/02, ...)"
                      value={b.name}
                      onChange={(e) => {
                        const next = [...newBlocks];
                        next[i] = { ...next[i], name: e.target.value };
                        setNewBlocks(next);
                      }}
                      className="flex-1 px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      placeholder="B. Bölüm Adedi"
                      type="number"
                      value={b.totalUnits}
                      onChange={(e) => {
                        const next = [...newBlocks];
                        next[i] = { ...next[i], totalUnits: e.target.value };
                        setNewBlocks(next);
                      }}
                      className="w-32 px-4 py-2.5 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {newBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewBlocks(newBlocks.filter((_, j) => j !== i))}
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-error-container"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewBlocks([...newBlocks, { name: "", totalUnits: "" }])}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  + Blok ekle
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-on-surface-variant"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="primary-gradient text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <Blocks className="w-12 h-12 mx-auto text-on-surface-variant/40" />
          <p className="text-sm font-bold text-on-surface mt-4">Henüz proje yok</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Toplu konut projelerini burada tanımla, sonra mülk eklerken seçilebilir.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const isOpen = expanded.has(p.id);
            return (
              <div
                key={p.id}
                className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(25,28,30,0.04)]"
              >
                <div className="flex items-center justify-between p-5">
                  <button onClick={() => toggle(p.id)} className="flex items-center gap-3 text-left flex-1">
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-on-surface">{p.name}</h3>
                        {p.developer && (
                          <span className="text-xs text-on-surface-variant">· {p.developer}</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {[p.city, p.district].filter(Boolean).join(" / ") || "Konum belirtilmedi"} ·{" "}
                        {p.blocks.length} blok · {p._count.properties} mülk
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addBlock(p.id)}
                      className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg hover:bg-primary-fixed"
                    >
                      + Blok
                    </button>
                    <button
                      onClick={() => deleteProject(p.id, p.name)}
                      disabled={p._count.properties > 0}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        p._count.properties > 0
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-error-container"
                      )}
                      title={
                        p._count.properties > 0
                          ? "Bağlı mülk var, silinemez"
                          : "Projeyi sil"
                      }
                    >
                      <Trash2 className="w-4 h-4 text-on-surface-variant" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-outline-variant/10 p-5 pt-4 bg-surface-container-low/40">
                    {p.blocks.length === 0 ? (
                      <p className="text-xs text-on-surface-variant text-center py-4">
                        Bu projede blok yok. "+ Blok" ile ekleyebilirsin.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {p.blocks.map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center justify-between px-3 py-2 bg-surface-container-lowest rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <HomeIcon className="w-3.5 h-3.5 text-on-surface-variant" />
                              <span className="text-sm font-bold text-on-surface">{b.name}</span>
                              {b.totalUnits && (
                                <span className="text-xs text-on-surface-variant">
                                  · {b.totalUnits} b. bölüm
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteBlock(p.id, b.id, b.name)}
                              className="w-7 h-7 rounded flex items-center justify-center hover:bg-error-container"
                            >
                              <X className="w-3.5 h-3.5 text-on-surface-variant" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
