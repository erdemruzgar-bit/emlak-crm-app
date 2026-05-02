"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  optional?: boolean;
  children: ReactNode;
}

/**
 * Form bölümlerini açılır-kapanır hale getiren bileşen.
 * Default kapalı (opsiyonel detaylar kalabalık etmesin); kullanıcı tıklayarak açar.
 */
export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  optional = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-6 hover:bg-surface-container-low/50 transition-all"
      >
        <div className="flex items-center gap-3 flex-wrap text-left">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">{title}</h2>
          {optional && (
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-surface-container text-on-surface-variant">
              Opsiyonel
            </span>
          )}
          {description && !open && (
            <span className="text-xs text-on-surface-variant">— {description}</span>
          )}
        </div>
        <ChevronDown
          className={cn("w-5 h-5 text-on-surface-variant transition-transform shrink-0", open && "rotate-180")}
        />
      </button>
      {open && <div className="p-8 pt-2 space-y-5">{children}</div>}
    </div>
  );
}
