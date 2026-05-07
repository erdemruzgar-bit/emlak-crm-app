"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Building2, Home, Upload } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProjectMeta {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  developer: string | null;
  _count?: { properties: number; blocks: number };
}

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const [project, setProject] = useState<ProjectMeta | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProject(data))
      .catch(() => setProject(null));
  }, [id]);

  const tabs = [
    { href: `/projects/${id}/units`, label: "Daireler & Sahipleri", icon: Home },
    { href: `/projects/${id}/excel`, label: "Excel", icon: Upload },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/projects"
          className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center text-white">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight text-on-surface truncate">
            {project?.name ?? "Proje"}
          </h1>
          <p className="text-xs text-on-surface-variant">
            {project ? (
              <>
                {[project.developer, project.district, project.city].filter(Boolean).join(" · ")}
                {project._count && (
                  <> · {project._count.properties} daire · {project._count.blocks} blok</>
                )}
              </>
            ) : (
              "Yükleniyor..."
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                active ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </motion.div>
  );
}
