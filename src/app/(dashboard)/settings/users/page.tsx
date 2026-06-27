"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Loader2, X, AlertCircle, Pencil, UserX, UserCheck, ShieldAlert, Camera, ArrowLeftRight, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { HelpButton } from "@/components/ui/help-button";
import { SafeImage } from "@/components/ui/safe-image";
import { EmptyState } from "@/components/ui/empty-state";
import { MODULES } from "@/lib/modules";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  photoUrl: string | null;
  canExport: boolean;
  canImport: boolean;
  disabledModules: string[];
  branchId: string | null;
  branch: { id: string; name: string } | null;
  authorizedBranches?: { id: string; name: string }[];
  createdAt: string;
  _count?: {
    assignedCustomers: number;
    assignedProperties: number;
  };
}

interface Branch {
  id: string;
  name: string;
}

const ROLE_RANK: Record<string, number> = { ADMIN: 3, MANAGER: 2, AGENT: 1 };

const roleLabels: Record<string, string> = { ADMIN: "Yönetici", MANAGER: "Şube Müdürü", AGENT: "Danışman" };
const roleColors: Record<string, string> = {
  ADMIN: "bg-error-container text-on-error-container",
  MANAGER: "bg-primary-fixed text-on-primary-fixed-variant",
  AGENT: "bg-secondary-container text-on-secondary-container",
};

const inputClass = "w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm";

// Returns the role options a user with `sessionRole` is allowed to assign
function allowedRoles(sessionRole: string) {
  if (sessionRole === "ADMIN") return [
    { value: "AGENT", label: "Danışman" },
    { value: "MANAGER", label: "Şube Müdürü" },
    { value: "ADMIN", label: "Yönetici" },
  ];
  // MANAGER can only assign AGENT
  return [{ value: "AGENT", label: "Danışman" }];
}

export default function UsersSettingsPage() {
  const { data: session } = useSession();
  const confirm = useConfirm();
  const sessionRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const sessionId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "AGENT", branchId: "", authorizedBranchIds: [] as string[], phone: "", photoUrl: "", canExport: false, canImport: false, disabledModules: [] as string[] });

  // Devir (reassign) modalı durumu
  const [reassignFor, setReassignFor] = useState<User | null>(null);   // kayıtları devredilecek kaynak kullanıcı
  const [reassignTarget, setReassignTarget] = useState("");            // hedef danışman id
  const [reassignWithDeactivate, setReassignWithDeactivate] = useState(false); // devir sonrası pasife al
  const [reassigning, setReassigning] = useState(false);

  function reloadUsers() {
    return fetch("/api/users")
      .then((r) => r.json())
      .then((u) => setUsers(Array.isArray(u) ? u : []))
      .catch(() => {});
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
    ]).then(([u, b]) => {
      setUsers(Array.isArray(u) ? u : []);
      setBranches(Array.isArray(b) ? b : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Can the current session user edit the target user?
  function canEdit(target: User) {
    if (!sessionRole) return false;
    if (target.id === sessionId) return true; // can edit own profile (but not own role)
    return ROLE_RANK[sessionRole] > ROLE_RANK[target.role];
  }

  // Can the current session user deactivate the target user?
  function canDeactivate(target: User) {
    if (sessionRole !== "ADMIN") return false;
    if (target.id === sessionId) return false; // cannot deactivate yourself
    return true;
  }

  // Can the current session user reassign this user's records?
  // ADMIN: anyone. MANAGER: only AGENT-role targets (server further restricts to own branch).
  function canReassign(target: User) {
    if (sessionRole === "ADMIN") return true;
    if (sessionRole === "MANAGER") return target.role === "AGENT";
    return false;
  }

  function assignedCount(u: User) {
    return (u._count?.assignedCustomers ?? 0) + (u._count?.assignedProperties ?? 0);
  }

  function openCreate() {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "AGENT", branchId: "", authorizedBranchIds: [], phone: "", photoUrl: "", canExport: false, canImport: false, disabledModules: [] });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, branchId: u.branchId || "", authorizedBranchIds: (u.authorizedBranches ?? []).map((b) => b.id), phone: "", photoUrl: u.photoUrl || "", canExport: u.canExport, canImport: u.canImport, disabledModules: u.disabledModules ?? [] });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role };
    if (form.branchId) body.branchId = form.branchId;
    if (form.phone) body.phone = form.phone;
    if (!editUser || form.password) body.password = form.password;
    body.photoUrl = form.photoUrl || null;
    // Yetkili olduğu ek şubeler — ana şube zaten branchId, burada onun dışındakiler.
    body.authorizedBranchIds = form.authorizedBranchIds.filter((id) => id !== form.branchId);
    // Yalnız ADMIN bu bayrakları göndermeli (API de filtreler ama UI'da da kısıtlayalım)
    if (sessionRole === "ADMIN") {
      body.canExport = form.canExport;
      body.canImport = form.canImport;
      body.disabledModules = form.disabledModules;
    }

    const res = await fetch(editUser ? `/api/users/${editUser.id}` : "/api/users", {
      method: editUser ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      // Hata string olabilir veya zod issue dizisi (or. "Şifre en az 8 karakter olmalı").
      // Diziyi gerçek mesajlara çevir ki kullanıcı sebebi görsün (önceden "Bir hata oluştu" gizliyordu).
      let msg = "Bir hata oluştu";
      if (typeof data.error === "string") {
        msg = data.error;
      } else if (Array.isArray(data.error)) {
        const joined = data.error.map((i: { message?: string }) => i?.message).filter(Boolean).join(" • ");
        if (joined) msg = joined;
      }
      setFormError(msg);
      return;
    }

    if (editUser) {
      setUsers(users.map((u) => u.id === editUser.id ? { ...u, ...data } : u));
      toast.success("Kullanıcı güncellendi");
    } else {
      setUsers([data, ...users]);
      toast.success("Kullanıcı eklendi");
    }
    setShowModal(false);
  }

  async function deactivate(id: string) {
    const u = users.find((x) => x.id === id);
    const c = u?._count?.assignedCustomers ?? 0;
    const p = u?._count?.assignedProperties ?? 0;
    // Atanmış müşteri/ilan varsa: doğrudan pasife alma yerine devir modalını aç.
    if (u && (c > 0 || p > 0)) {
      setReassignFor(u);
      setReassignTarget("");
      setReassignWithDeactivate(true);
      return;
    }
    // Atanmış kayıt yoksa: basit onay + pasife al.
    const ok = await confirm({
      title: "Kullanıcıyı pasife al?",
      message: "Pasif kullanıcı sisteme giremez. Verileri korunur.",
      tone: "warning",
      confirmText: "Pasife Al",
    });
    if (!ok) return;
    await doDeactivate(id);
  }

  // Devretmeden doğrudan pasife alma (DELETE).
  async function doDeactivate(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setUsers((prev) => prev.map((x) => x.id === id ? { ...x, isActive: false } : x));
      toast.success("Kullanıcı pasife alındı");
    } else {
      toast.error(data.error || "İşlem başarısız");
    }
  }

  // Bağımsız "Devret" butonu — pasife almadan kayıtları aktarır (boşta kalan kayıtları da kurtarır).
  function openReassign(u: User) {
    setReassignFor(u);
    setReassignTarget("");
    setReassignWithDeactivate(false);
  }

  function closeReassign() {
    setReassignFor(null);
    setReassignTarget("");
    setReassignWithDeactivate(false);
  }

  async function doReassign() {
    if (!reassignFor || !reassignTarget) return;
    setReassigning(true);
    const res = await fetch(`/api/users/${reassignFor.id}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAgentId: reassignTarget, deactivate: reassignWithDeactivate }),
    });
    const data = await res.json();
    setReassigning(false);
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Devir başarısız");
      return;
    }
    const target = users.find((x) => x.id === reassignTarget);
    const parts: string[] = [];
    if (data.customers > 0) parts.push(`${data.customers} müşteri`);
    if (data.properties > 0) parts.push(`${data.properties} ilan`);
    const what = parts.length ? parts.join(" ve ") : "Kayıt";
    toast.success(
      `${what} ${target?.name ?? "danışman"} kişisine devredildi${data.deactivated ? " ve kullanıcı pasife alındı" : ""}`
    );
    closeReassign();
    await reloadUsers();
  }

  // "Devretmeden pasife al" — devir modalındaki ikincil aksiyon.
  async function deactivateWithoutTransfer() {
    if (!reassignFor) return;
    const id = reassignFor.id;
    closeReassign();
    const ok = await confirm({
      title: "Devretmeden pasife alınsın mı?",
      message: 'Atanmış kayıtlar "yetkisiz danışmanda" kalır ve düzenlenemez. Daha sonra "Devret" ile aktarabilirsiniz.',
      tone: "warning",
      confirmText: "Yine de Pasife Al",
    });
    if (!ok) return;
    await doDeactivate(id);
  }

  async function activate(id: string) {
    const ok = await confirm({
      title: "Kullanıcıyı aktife al?",
      message: "Kullanıcı tekrar sisteme erişebilir.",
      tone: "info",
      confirmText: "Aktife Al",
    });
    if (!ok) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(users.map((u) => u.id === id ? { ...u, isActive: true } : u));
      toast.success("Kullanıcı aktife alındı");
    } else {
      toast.error(data.error || "İşlem başarısız");
    }
  }

  const roleOptions = sessionRole ? allowedRoles(sessionRole) : [];
  // Is the edit modal showing for own profile or a lower-rank user?
  const isEditingSelf = editUser?.id === sessionId;
  const canChangeRole = editUser ? (!isEditingSelf && sessionRole && ROLE_RANK[sessionRole] > ROLE_RANK[editUser.role]) : true;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Kullanıcı Yönetimi</h1>
            <HelpButton page="settings-users" title="Kullanıcı Yönetimi" />
          </div>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Sistem kullanıcılarını yönetin</p>
        </div>
        <button onClick={openCreate}
          className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
          <UserPlus className="w-4 h-4" />Yeni Kullanıcı
        </button>
      </div>

      {sessionRole === "MANAGER" && (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-low px-4 py-3 rounded-xl">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
          Şube Müdürü olarak yalnızca kendi şubenizdeki <strong className="text-on-surface mx-1">Danışman</strong> rolünde kullanıcı oluşturabilir ve düzenleyebilirsiniz.
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden border border-outline-variant/10">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              {["Ad Soyad", "E-posta", "Rol", "Şube", "Durum", "İşlem"].map((h) => (
                <th key={h} className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState icon={Users} title="Kullanıcı bulunamadı" />
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.photoUrl ? (
                        <SafeImage src={u.photoUrl} alt={u.name} width={40} height={40}
                          className="w-10 h-10 rounded-xl object-cover object-top shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {u.name}
                          {u.id === sessionId && <span className="ml-2 text-[10px] text-primary font-black">(Siz)</span>}
                        </p>
                        <p className="text-xs text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString("tr-TR")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase", roleColors[u.role])}>
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{u.branch?.name || "-"}</span>
                      {(u.authorizedBranches?.length ?? 0) > 0 && (
                        <span
                          title={`Ek yetkili: ${u.authorizedBranches!.map((b) => b.name).join(", ")}`}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-primary-fixed text-primary font-bold"
                        >
                          +{u.authorizedBranches!.length} şube
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase",
                        u.isActive ? "bg-green-100 text-green-700" : "bg-surface-container text-on-surface-variant")}>
                        {u.isActive ? "Aktif" : "Pasif"}
                      </span>
                      {!u.isActive && ((u._count?.assignedCustomers ?? 0) > 0 || (u._count?.assignedProperties ?? 0) > 0) && (
                        <span
                          title={`${u._count?.assignedCustomers ?? 0} müşteri / ${u._count?.assignedProperties ?? 0} ilan üzerinde atanmış kalıyor — düzenlenemez. Lütfen başka bir danışmana devredin.`}
                          className="text-[10px] px-2 py-1 rounded-lg font-bold uppercase bg-error-container text-on-error-container flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {(u._count?.assignedCustomers ?? 0) + (u._count?.assignedProperties ?? 0)} yetkisiz
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {canEdit(u) ? (
                        <button onClick={() => openEdit(u)}
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
                          title="Düzenle">
                          <Pencil className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="p-2 text-on-surface-variant/20 cursor-not-allowed" title="Bu kullanıcıyı düzenleme yetkiniz yok">
                          <Pencil className="w-4 h-4" />
                        </span>
                      )}
                      {canReassign(u) && assignedCount(u) > 0 && (
                        <button onClick={() => openReassign(u)}
                          className="p-2 hover:bg-primary-fixed rounded-lg transition-colors text-on-surface-variant hover:text-primary"
                          title="Müşteri/portföyü başka danışmana devret">
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                      )}
                      {u.isActive && canDeactivate(u) && (
                        <button onClick={() => deactivate(u.id)}
                          className="p-2 hover:bg-error-container/30 rounded-lg transition-colors text-on-surface-variant hover:text-error"
                          title="Pasife Al">
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                      {!u.isActive && canDeactivate(u) && (
                        <button onClick={() => activate(u.id)}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors text-on-surface-variant hover:text-green-700"
                          title="Aktife Al">
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
              {/* Sticky header */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-outline-variant/10 shrink-0">
                <h2 className="text-xl font-black text-on-surface">{editUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                {/* Scroll-able body */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-4">
                  {formError && (
                    <div className="bg-error-container text-on-error-container text-sm p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                    </div>
                  )}
                {/* Fotoğraf yükleme */}
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
                  {form.photoUrl ? (
                    <SafeImage src={form.photoUrl} alt="" width={64} height={64} className="w-16 h-16 rounded-2xl object-cover object-top shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/70 flex items-center justify-center shrink-0">
                      <span className="text-xl font-black text-white select-none">
                        {form.name ? form.name.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer px-4 py-2 bg-surface-container-lowest rounded-xl text-sm font-bold hover:bg-surface-container transition-all flex items-center gap-2 shadow-sm">
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {photoUploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
                      <input type="file" accept="image/*" className="hidden" disabled={photoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setPhotoUploading(true);
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/upload", { method: "POST", body: fd });
                          if (res.ok) {
                            const data = await res.json();
                            setForm({ ...form, photoUrl: data.url });
                          }
                          setPhotoUploading(false);
                        }} />
                    </label>
                    {form.photoUrl && (
                      <button type="button" onClick={() => setForm({ ...form, photoUrl: "" })}
                        className="text-xs text-on-surface-variant hover:text-error transition-colors flex items-center gap-1">
                        <X className="w-3 h-3" /> Kaldır
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Ad Soyad *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">E-posta *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">
                    {editUser ? "Yeni Şifre (boş bırakılırsa değişmez)" : "Şifre *"}
                  </label>
                  <input type="password" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editUser} minLength={8}
                    pattern="(?=.*[A-Za-zçğıöşüÇĞİÖŞÜ])(?=.*[^A-Za-z0-9çğıöşüÇĞİÖŞÜ\s]).{8,}"
                    title="En az 8 karakter, en az bir harf ve bir özel karakter (örn. !@#?*)"
                    className={inputClass} />
                  <p className="mt-1.5 text-[11px] text-on-surface-variant">
                    En az 8 karakter, bir harf ve bir özel karakter (örn. <span className="font-mono">!@#?*</span>) içermeli.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Rol</label>
                    {canChangeRole ? (
                      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
                        {roleOptions.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className={cn("px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-surface-container-low text-on-surface-variant")}>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase", roleColors[form.role])}>
                          {roleLabels[form.role]}
                        </span>
                        <span className="text-xs opacity-60">değiştirilemez</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Ana Şube</label>
                    <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputClass}>
                      <option value="">Seçiniz</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Ek yetkili olduğu şubeler (multi-select) */}
                {branches.length > 1 && (
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Ek Yetkili Olduğu Şubeler</label>
                    <p className="text-xs text-on-surface-variant mb-3">Ana şube dışında erişim/düzenleme yetkisi olan diğer şubeleri seçin. Yöneticiler/danışmanlar birden fazla şubeye atanabilir.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {branches.filter((b) => b.id !== form.branchId).map((b) => {
                        const checked = form.authorizedBranchIds.includes(b.id);
                        return (
                          <label key={b.id} className={cn(
                            "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                            checked ? "bg-primary-fixed border-primary/30" : "bg-surface-container-low border-outline-variant/10 hover:bg-surface-container"
                          )}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.authorizedBranchIds, b.id]
                                  : form.authorizedBranchIds.filter((id) => id !== b.id);
                                setForm({ ...form, authorizedBranchIds: next });
                              }}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-medium text-on-surface">{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Telefon</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                </div>

                {/* Excel izinleri — sadece ADMIN düzenleyebilir */}
                {sessionRole === "ADMIN" && form.role !== "ADMIN" && (
                  <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                    <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Excel İzinleri</p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.canExport}
                        onChange={(e) => setForm({ ...form, canExport: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-primary rounded" />
                      <div>
                        <p className="text-sm font-bold text-on-surface">Dışa Aktarma (Excel'e Al)</p>
                        <p className="text-xs text-on-surface-variant">Müşteri/portföy/görev/randevu listelerini Excel olarak indirebilir.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.canImport}
                        onChange={(e) => setForm({ ...form, canImport: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-primary rounded" />
                      <div>
                        <p className="text-sm font-bold text-on-surface">İçe Aktarma (Excel'den Yükle)</p>
                        <p className="text-xs text-on-surface-variant">Excel dosyası yükleyerek toplu müşteri/portföy ekleyebilir. Riskli — güvenilir kişilere verin.</p>
                      </div>
                    </label>
                  </div>
                )}
                {sessionRole === "ADMIN" && form.role === "ADMIN" && (
                  <div className="bg-primary-fixed/60 rounded-xl p-3 text-xs text-on-surface-variant">
                    <strong className="text-primary">Yöneticiler</strong> Excel dışa/içe aktarma yetkilerine ve tüm modüllere otomatik sahiptir.
                  </div>
                )}

                {/* Modül-bazlı yetkilendirme — sadece ADMIN düzenleyebilir, ADMIN role olan kullanıcılar her zaman tam erişim */}
                {sessionRole === "ADMIN" && form.role !== "ADMIN" && (
                  <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Modül Erişimleri</p>
                        <p className="text-[11px] text-on-surface-variant mt-1">İşaretli modüller bu kullanıcıya görünmez. Boş bırakırsanız tüm modüller açıktır.</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => setForm({ ...form, disabledModules: [] })}
                          className="px-3 py-1.5 text-[11px] font-bold bg-surface-container hover:bg-surface-container-high rounded-lg">
                          Tümünü Aç
                        </button>
                        <button type="button"
                          onClick={() => setForm({ ...form, disabledModules: MODULES.filter((m) => !m.required).map((m) => m.key) })}
                          className="px-3 py-1.5 text-[11px] font-bold bg-surface-container hover:bg-surface-container-high rounded-lg">
                          Tümünü Kapat
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MODULES.map((mod) => {
                        const isDisabled = form.disabledModules.includes(mod.key);
                        const required = !!mod.required;
                        return (
                          <label key={mod.key}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded-lg transition-all",
                              required ? "bg-surface-container/40 cursor-not-allowed opacity-60" : "bg-surface-container-lowest hover:bg-surface-container cursor-pointer"
                            )}>
                            <input
                              type="checkbox"
                              checked={!isDisabled}
                              disabled={required}
                              onChange={(e) => {
                                if (required) return;
                                const next = e.target.checked
                                  ? form.disabledModules.filter((k) => k !== mod.key)
                                  : [...form.disabledModules, mod.key];
                                setForm({ ...form, disabledModules: next });
                              }}
                              className="mt-0.5 w-4 h-4 accent-primary rounded shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-on-surface">{mod.label}{required && <span className="ml-1 text-[10px] text-on-surface-variant">(zorunlu)</span>}</p>
                              <p className="text-[10px] text-on-surface-variant leading-tight">{mod.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>
                {/* Sticky footer */}
                <div className="flex gap-3 px-6 sm:px-8 py-4 border-t border-outline-variant/10 bg-surface-container-lowest shrink-0">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all">İptal</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 primary-gradient text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {editUser ? "Güncelle" : "Oluştur"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kayıtları Devret modalı */}
      <AnimatePresence>
        {reassignFor && (() => {
          const c = reassignFor._count?.assignedCustomers ?? 0;
          const p = reassignFor._count?.assignedProperties ?? 0;
          const countParts: string[] = [];
          if (c > 0) countParts.push(`${c} müşteri`);
          if (p > 0) countParts.push(`${p} ilan`);
          const targets = users.filter((x) =>
            x.isActive && x.id !== reassignFor.id && (sessionRole === "ADMIN" || x.role === "AGENT")
          );
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
              onClick={(e) => e.target === e.currentTarget && !reassigning && closeReassign()}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center shrink-0">
                      <ArrowLeftRight className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-black text-on-surface">
                      {reassignWithDeactivate ? "Kayıtları Devret ve Pasife Al" : "Kayıtları Devret"}
                    </h2>
                  </div>
                  <button onClick={() => !reassigning && closeReassign()} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 sm:px-8 py-6 space-y-5">
                  <p className="text-sm text-on-surface-variant">
                    <strong className="text-on-surface">{reassignFor.name}</strong> üzerindeki{" "}
                    <strong className="text-on-surface">{countParts.join(" ve ") || "kayıt"}</strong>{" "}
                    seçeceğiniz danışmana aktarılacak. Kayıtların şubesi değişmez.
                  </p>

                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Yeni Danışman *</label>
                    {targets.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-low px-4 py-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-error shrink-0" />
                        Devredilebilecek aktif başka kullanıcı yok. Önce yeni bir danışman ekleyin.
                      </div>
                    ) : (
                      <select value={reassignTarget} onChange={(e) => setReassignTarget(e.target.value)} className={inputClass} disabled={reassigning}>
                        <option value="">Seçiniz</option>
                        {targets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({roleLabels[t.role] ?? t.role}{t.branch?.name ? ` · ${t.branch.name}` : ""})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {reassignWithDeactivate && (
                    <div className="flex items-start gap-2 text-xs text-on-surface-variant bg-surface-container-low px-4 py-3 rounded-xl">
                      <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      Devirden sonra <strong className="text-on-surface mx-1">{reassignFor.name}</strong> pasife alınır ve sisteme giremez.
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 px-6 sm:px-8 py-4 border-t border-outline-variant/10">
                  <button type="button" onClick={() => !reassigning && closeReassign()}
                    className="sm:flex-1 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all">
                    Vazgeç
                  </button>
                  {reassignWithDeactivate && (
                    <button type="button" onClick={deactivateWithoutTransfer} disabled={reassigning}
                      className="sm:flex-1 py-3 text-sm font-bold text-error bg-error-container/40 hover:bg-error-container rounded-xl transition-all disabled:opacity-50">
                      Devretmeden Pasife Al
                    </button>
                  )}
                  <button type="button" onClick={doReassign} disabled={reassigning || !reassignTarget}
                    className="sm:flex-1 primary-gradient text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {reassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {reassignWithDeactivate ? "Devret ve Pasife Al" : "Devret"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
