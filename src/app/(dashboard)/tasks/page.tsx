"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Clock, Loader2, Trash2, AlertTriangle, ChevronDown, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExcelToolbar } from "@/components/ui/excel-toolbar";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  user: { name: string };
  assignedBy: { name: string } | null;
  createdAt: string;
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
const statusCols = [
  { key: "TODO", label: "Yapılacak", icon: Circle, color: "text-on-surface-variant" },
  { key: "IN_PROGRESS", label: "Devam Ediyor", icon: Clock, color: "text-tertiary" },
  { key: "DONE", label: "Tamamlandı", icon: CheckCircle2, color: "text-green-600" },
];

export default function TasksPage() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formDue, setFormDue] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    loadTasks();
    fetch("/api/users").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setUsers(data.filter((u: UserOption & { isActive: boolean }) => u.isActive));
    });
  }, []);

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formTitle, description: formDesc || undefined, priority: formPriority, dueDate: formDue || undefined, assignedToId: formAssignee || undefined }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks([task, ...tasks]);
      setFormTitle(""); setFormDesc(""); setFormPriority("MEDIUM"); setFormDue(""); setFormAssignee(""); setShowForm(false);
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => t.id === id ? updated : t));
    }
  }

  async function deleteTask(id: string) {
    const ok = await confirm({
      title: "Görevi sil?",
      message: "Bu işlem geri alınamaz.",
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks(tasks.filter((t) => t.id !== id));
      toast.success("Görev silindi");
    } else {
      toast.error("Silinemedi");
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Görevler</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">{tasks.filter(t => t.status !== "DONE").length} aktif görev</p>
        </div>
        <div className="flex items-center gap-3">
          <ExcelToolbar exportUrl="/api/tasks/export" label="görev" />
          <button onClick={() => setShowForm(!showForm)}
            className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Yeni Görev
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={createTask} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl p-6 space-y-4 border border-outline-variant/10 shadow-[0_12px_32px_rgba(25,28,30,0.06)]">
            <h3 className="text-sm font-bold text-on-surface">Yeni Görev Oluştur</h3>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Başlık *</label>
              <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required placeholder="Görev başlığı..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Açıklama</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} placeholder="Opsiyonel..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Öncelik</label>
                <div className="flex gap-2">
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setFormPriority(k)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        formPriority === k ? priorityColors[k] + " ring-2 ring-primary/20" : "bg-surface-container-low text-on-surface-variant"
                      )}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Son Tarih</label>
                <input type="date" value={formDue} onChange={(e) => setFormDue(e.target.value)}
                  className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm" />
              </div>
              {users.length > 0 && (
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Atanan Kişi</label>
                  <select value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)}
                    className="px-4 py-2.5 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="">Kendim (varsayılan)</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-bold bg-surface-container-low rounded-xl">İptal</button>
              <button type="submit" disabled={saving || !formTitle.trim()}
                className="primary-gradient text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Oluştur
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {statusCols.map(({ key, label, icon: Icon, color }) => {
            const col = tasks.filter((t) => t.status === key);
            return (
              <div key={key} className="space-y-3">
                <div className={cn("flex items-center gap-2 px-2", color)}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-bold">{label}</span>
                  <span className="ml-auto text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant font-bold">{col.length}</span>
                </div>
                <div className="space-y-3 min-h-[120px]">
                  {col.length === 0 ? (
                    <div className="text-xs text-on-surface-variant text-center py-8 border-2 border-dashed border-outline-variant/20 rounded-2xl">Görev yok</div>
                  ) : (
                    col.map((task) => {
                      const isOverdue = task.dueDate && task.status !== "DONE" && task.dueDate.split("T")[0] < today;
                      return (
                        <div key={task.id} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-sm font-bold text-on-surface leading-snug", task.status === "DONE" && "line-through text-on-surface-variant")}>{task.title}</p>
                            <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-on-surface-variant hover:text-error">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {task.description && <p className="text-xs text-on-surface-variant mt-1">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", priorityColors[task.priority])}>{priorityLabels[task.priority]}</span>
                            {task.dueDate && (
                              <span className={cn("text-[10px] flex items-center gap-1 font-medium", isOverdue ? "text-error" : "text-on-surface-variant")}>
                                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                                {new Date(task.dueDate).toLocaleDateString("tr-TR")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-on-surface-variant">
                            <User className="w-3 h-3 shrink-0" />
                            <span>{task.user.name}</span>
                            {task.assignedBy && task.assignedBy.name !== task.user.name && (
                              <span className="ml-1 opacity-60">← {task.assignedBy.name}</span>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="relative">
                              <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}
                                className="w-full text-xs px-3 py-1.5 bg-surface-container-low rounded-lg outline-none appearance-none cursor-pointer font-medium">
                                <option value="TODO">Yapılacak</option>
                                <option value="IN_PROGRESS">Devam Ediyor</option>
                                <option value="DONE">Tamamlandı</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
