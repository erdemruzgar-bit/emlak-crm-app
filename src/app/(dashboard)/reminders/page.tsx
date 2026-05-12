"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Bell, Plus, Check, Trash2, Calendar, AlertTriangle, Loader2, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { HelpButton } from "@/components/ui/help-button";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  isDone: boolean;
  doneAt: string | null;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

const priorityLabels: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek" };
const priorityColors: Record<string, string> = {
  LOW: "bg-surface-container text-on-surface-variant",
  MEDIUM: "bg-tertiary-fixed text-tertiary",
  HIGH: "bg-error-container text-on-error-container",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RemindersPage() {
  const confirm = useConfirm();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"me" | "team">("me");
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignUserId, setAssignUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, filter]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setUsers(data.filter((u: UserOption & { isActive: boolean }) => u.isActive));
      })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ scope });
    if (filter === "pending") params.set("done", "false");
    if (filter === "done") params.set("done", "true");
    const res = await fetch(`/api/reminders?${params}`);
    if (res.ok) setReminders(await res.json());
    setLoading(false);
  }

  async function createReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      dueDate: new Date(dueDate).toISOString(),
      priority,
    };
    if (description.trim()) payload.description = description.trim();
    if (assignUserId) payload.userId = assignUserId;
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("MEDIUM");
      setAssignUserId("");
      setShowForm(false);
      toast.success("Hatırlatma eklendi");
      await load();
    } else {
      toast.error("Hatırlatma eklenemedi");
    }
    setSaving(false);
  }

  async function toggleDone(r: Reminder) {
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !r.isDone }),
    });
    if (res.ok) load();
  }

  async function deleteReminder(id: string) {
    const ok = await confirm({
      title: "Hatırlatmayı sil?",
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Hatırlatma silindi");
      load();
    } else {
      toast.error("Silinemedi");
    }
  }

  const overdue = reminders.filter((r) => !r.isDone && daysUntil(r.dueDate) < 0);
  const today = reminders.filter((r) => !r.isDone && daysUntil(r.dueDate) === 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 primary-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/10">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tighter text-on-surface">Hatırlatmalar</h1>
              <HelpButton page="reminders" title="Hatırlatmalar" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium mt-1">
              Kişisel ve ekip hatırlatmaları
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Yeni Hatırlatma
        </button>
      </div>

      {/* Uyarı kartları */}
      {(overdue.length > 0 || today.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {overdue.length > 0 && (
            <div className="bg-error-container border border-error/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-on-error-container">
                  {overdue.length} hatırlatma gecikmiş
                </p>
              </div>
            </div>
          )}
          {today.length > 0 && (
            <div className="bg-tertiary-fixed border border-tertiary/20 rounded-2xl p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-on-surface">
                  {today.length} hatırlatma bugün için
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={createReminder}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_24px_rgba(25,28,30,0.04)] space-y-4 overflow-hidden"
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
              Yeni Hatırlatma
            </h2>
            <input
              placeholder="Başlık *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              placeholder="Açıklama (opsiyonel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
                  Zaman *
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
                  Öncelik
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksek</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
                  Kime
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Kendim</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
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

      {/* Scope + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-surface-container-low p-1 rounded-xl">
          <button
            onClick={() => setScope("me")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              scope === "me" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant"
            )}
          >
            Benim
          </button>
          <button
            onClick={() => setScope("team")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              scope === "team" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant"
            )}
          >
            Ekip
          </button>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-xl">
          {(["pending", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                filter === f ? "bg-white shadow-sm text-primary" : "text-on-surface-variant"
              )}
            >
              {f === "pending" ? "Bekleyen" : f === "done" ? "Tamamlanan" : "Tümü"}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-on-surface-variant/40" />
          <p className="text-sm font-bold text-on-surface mt-4">Hatırlatma yok</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Yeni bir hatırlatma ekleyerek başlayın.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => {
            const days = daysUntil(r.dueDate);
            const isOverdue = !r.isDone && days < 0;
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-2xl transition-all",
                  r.isDone ? "bg-surface-container-low opacity-60" : "bg-surface-container-lowest shadow-sm"
                )}
              >
                <button
                  onClick={() => toggleDone(r)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    r.isDone ? "bg-primary border-primary text-white" : "border-outline-variant hover:border-primary"
                  )}
                >
                  {r.isDone && <Check className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={cn("text-sm font-bold text-on-surface", r.isDone && "line-through")}>
                      {r.title}
                    </h3>
                    <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full", priorityColors[r.priority])}>
                      {priorityLabels[r.priority]}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-error-container text-on-error-container">
                        {Math.abs(days)} gün gecikmiş
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-on-surface-variant mt-1 whitespace-pre-wrap">{r.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(r.dueDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> {r.user.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteReminder(r.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error-container shrink-0"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4 text-on-surface-variant" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
