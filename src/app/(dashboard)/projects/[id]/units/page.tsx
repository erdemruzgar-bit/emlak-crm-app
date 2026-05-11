"use client";

import { use } from "react";
import Link from "next/link";
import { ClipboardPaste, Home } from "lucide-react";
import { UnitsTable } from "@/components/ui/units-table";
import { HelpButton } from "@/components/ui/help-button";

export default function ProjectUnitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black tracking-tight text-on-surface">Daireler & Sahipleri</h2>
          <HelpButton page="projects-units" title="Daireler & Sahipleri" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/properties?projectId=${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-surface-container-low hover:bg-surface-container rounded-xl"
          >
            <Home className="w-3.5 h-3.5" />
            Portföyde aç
          </Link>
          <Link
            href={`/properties/bulk-paste?projectId=${id}&mode=range`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-surface-container-low hover:bg-surface-container rounded-xl"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Bu projeye toplu birim ekle
          </Link>
        </div>
      </div>
      <UnitsTable projectId={id} />
    </div>
  );
}
