"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, Loader2, Plus, X, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  _count: { users: number; customers: number; properties: number };
  createdAt: string;
}

const inputClass = "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

export default function BranchesSettingsPage() {
  const confirm = useConfirm();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => { setBranches(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditBranch(null);
    setForm({ name: "", address: "", phone: "" });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(b: Branch) {
    setEditBranch(b);
    setForm({ name: b.name, address: b.address || "", phone: b.phone || "" });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const body = { name: form.name, address: form.address || undefined, phone: form.phone || undefined };

    const res = await fetch(editBranch ? `/api/branches/${editBranch.id}` : "/api/branches", {
      method: editBranch ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(typeof data.error === "string" ? data.error : "Bir hata oluştu");
      return;
    }

    if (editBranch) {
      setBranches(branches.map((b) => b.id === editBranch.id ? data : b));
    } else {
      setBranches([data, ...branches]);
    }
    setShowModal(false);
  }

  async function deleteBranch(id: string) {
    const ok = await confirm({
      title: "Şubeyi sil?",
      message: "Bağlı kullanıcı/müşteri/ilan varsa silinemez.",
      tone: "danger",
      confirmText: "Sil",
    });
    if (!ok) return;
    const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBranches(branches.filter((b) => b.id !== id));
      toast.success("Şube silindi");
    } else {
      const data = await res.json();
      toast.error(data.error || "Şube silinemedi");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Şube Yönetimi</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Şubelerinizi yönetin</p>
        </div>
        <button onClick={openCreate} className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" />Yeni Şube
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-on-surface-variant col-span-full text-center py-12">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Yükleniyor...
          </p>
        ) : branches.length === 0 ? (
          <p className="text-on-surface-variant col-span-full text-center py-12">
            <Building2 className="w-10 h-10 opacity-30 mx-auto mb-2" />Şube bulunamadı
          </p>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 hover:shadow-xl transition-all border border-outline-variant/10 group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary-fixed rounded-2xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(b)} className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteBranch(b.id)} className="p-2 hover:bg-error-container/30 rounded-lg text-on-surface-variant hover:text-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-on-surface text-lg tracking-tight">{b.name}</h3>
              {b.address && <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{b.address}</p>}
              {b.phone && <p className="text-sm text-on-surface-variant flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</p>}
              <div className="flex gap-4 mt-5 pt-4 border-t border-outline-variant/10">
                {[{ label: "Danışman", val: b._count.users }, { label: "Müşteri", val: b._count.customers }, { label: "İlan", val: b._count.properties }].map(({ label, val }) => (
                  <div key={label} className="bg-surface-container-low px-3 py-2 rounded-xl text-center flex-1">
                    <span className="text-lg font-black text-on-surface block">{val}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-on-surface">{editBranch ? "Şubeyi Düzenle" : "Yeni Şube"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant"><X className="w-5 h-5" /></button>
              </div>

              {formError && (
                <div className="bg-error-container text-on-error-container text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Şube Adı *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Adres</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Telefon</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all">İptal</button>
                  <button type="submit" disabled={saving} className="flex-1 primary-gradient text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {editBranch ? "Güncelle" : "Oluştur"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
