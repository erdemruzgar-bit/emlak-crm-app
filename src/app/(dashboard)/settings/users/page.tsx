"use client";

import { useEffect, useState } from "react";
import { UserPlus, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  branch: { name: string } | null;
  createdAt: string;
}

const roleLabels: Record<string, string> = { ADMIN: "Yönetici", MANAGER: "Şube Müdürü", AGENT: "Danışman" };
const roleColors: Record<string, string> = {
  ADMIN: "bg-error-container text-on-error-container",
  MANAGER: "bg-primary-fixed text-on-primary-fixed-variant",
  AGENT: "bg-secondary-container text-on-secondary-container",
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Sistem kullanıcılarını yönetin</p>
        </div>
        <button className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Yeni Kullanıcı
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden border border-outline-variant/10">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Ad Soyad</th>
              <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">E-posta</th>
              <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Rol</th>
              <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Şube</th>
              <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Yükleniyor...
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                <Users className="w-10 h-10 opacity-30 mx-auto mb-2" />
                Kullanıcı bulunamadı
              </td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low transition-all">
                  <td className="px-6 py-5 text-sm font-semibold text-on-surface">{u.name}</td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant">{u.email}</td>
                  <td className="px-6 py-5">
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider", roleColors[u.role])}>
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant">{u.branch?.name || "-"}</td>
                  <td className="px-6 py-5">
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase", u.isActive ? "bg-green-100 text-green-700" : "bg-surface-container-high text-on-surface-variant")}>
                      {u.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
