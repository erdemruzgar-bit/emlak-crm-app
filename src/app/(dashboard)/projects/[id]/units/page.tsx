"use client";

import { use } from "react";
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
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black tracking-tight text-on-surface">Daireler & Sahipleri</h2>
        <HelpButton page="projects-units" title="Daireler & Sahipleri" />
      </div>
      <UnitsTable projectId={id} />
    </div>
  );
}
