"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Search, Plus, Loader2, MapPin, Home } from "lucide-react";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import { HelpButton } from "@/components/ui/help-button";

interface ProjectCard {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  developer: string | null;
  _count?: { properties: number; blocks: number };
  blocks?: { id: string; name: string }[];
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canCreate = role === "ADMIN" || role === "MANAGER";

  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.developer?.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Projeler</h1>
            <HelpButton page="projects-list" title="Projeler" />
          </div>
          <p className="text-on-surface-variant text-sm mt-1 font-medium">
            {projects.length} proje · proje bazlı operasyonel ekran (daireler, sahipler, görüşmeler)
          </p>
        </div>
        {canCreate && (
          <Link
            href="/settings/projects"
            className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Proje
          </Link>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Proje adı, şehir, müteahhit..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-on-surface-variant/40" />
          <p className="text-sm font-bold text-on-surface mt-4">Proje yok</p>
          <p className="text-xs text-on-surface-variant mt-1">Ayarlar → Projeler bölümünden yeni proje oluşturun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}/units`}
              className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_16px_rgba(25,28,30,0.04)] p-5 hover:shadow-[0_8px_24px_rgba(25,28,30,0.08)] transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 primary-gradient rounded-xl flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="text-right text-[10px] text-on-surface-variant">
                  {p._count?.properties ?? 0} daire · {p._count?.blocks ?? p.blocks?.length ?? 0} blok
                </div>
              </div>
              <div>
                <h3 className="text-base font-black text-on-surface truncate">{p.name}</h3>
                {p.developer && <p className="text-xs text-on-surface-variant truncate">{p.developer}</p>}
              </div>
              {(p.city || p.district) && (
                <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                  <MapPin className="w-3 h-3" />
                  {[p.district, p.city].filter(Boolean).join(", ")}
                </div>
              )}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-outline-variant/10 text-[10px] font-bold text-primary">
                <Home className="w-3 h-3" />
                Daireler & Sahipleri →
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
