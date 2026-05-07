"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  side?: "right" | "left";
  widthClass?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  widthClass = "w-full sm:max-w-md md:max-w-lg",
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.aside
            key="sheet-panel"
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "fixed top-0 bottom-0 z-50 bg-surface-container-lowest shadow-2xl flex flex-col",
              side === "right" ? "right-0" : "left-0",
              widthClass
            )}
            role="dialog"
            aria-modal="true"
          >
            <header className="flex items-start justify-between gap-4 p-5 border-b border-outline-variant/20 shrink-0">
              <div className="min-w-0">
                {title && (
                  <h2 className="text-lg font-black tracking-tight text-on-surface truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
