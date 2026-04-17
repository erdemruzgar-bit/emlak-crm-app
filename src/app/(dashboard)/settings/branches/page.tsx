"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, Loader2, Plus } from "lucide-react";
import { motion } from "motion/react";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  _count: { users: number; customers: number; properties: number };
  createdAt: string;
}

export default function BranchesSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => { setBranches(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Şube Yönetimi</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">Şubelerinizi yönetin</p>
        </div>
        <button className="primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni Şube
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-on-surface-variant col-span-full text-center py-12">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Yükleniyor...
          </p>
        ) : branches.length === 0 ? (
          <p className="text-on-surface-variant col-span-full text-center py-12">
            <Building2 className="w-10 h-10 opacity-30 mx-auto mb-2" />
            Şube bulunamadı
          </p>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 hover:shadow-xl transition-all border border-outline-variant/10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary-fixed rounded-2xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <h3 className="font-bold text-on-surface text-lg tracking-tight">{b.name}</h3>
              {b.address && (
                <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {b.address}
                </p>
              )}
              {b.phone && (
                <p className="text-sm text-on-surface-variant flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {b.phone}
                </p>
              )}
              <div className="flex gap-4 mt-5 pt-4 border-t border-outline-variant/10">
                <div className="bg-surface-container-low px-3 py-2 rounded-xl text-center flex-1">
                  <span className="text-lg font-black text-on-surface block">{b._count.users}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Danışman</span>
                </div>
                <div className="bg-surface-container-low px-3 py-2 rounded-xl text-center flex-1">
                  <span className="text-lg font-black text-on-surface block">{b._count.customers}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Müşteri</span>
                </div>
                <div className="bg-surface-container-low px-3 py-2 rounded-xl text-center flex-1">
                  <span className="text-lg font-black text-on-surface block">{b._count.properties}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">İlan</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
