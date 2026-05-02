"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom ConfirmDialog — tarayıcı native window.confirm() yerine.
 *
 * Kullanım:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Sil?", message: "...", tone: "danger" });
 *   if (!ok) return;
 */

export type ConfirmTone = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Onay butonu metni (default: "Onayla") */
  confirmText?: string;
  /** İptal butonu metni (default: "Vazgeç") */
  cancelText?: string;
  /** Renk tonu (default: "warning") */
  tone?: ConfirmTone;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && close(false)}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: "spring", duration: 0.25 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onKeyDown={(e) => {
                if (e.key === "Escape") close(false);
                if (e.key === "Enter") close(true);
              }}
              tabIndex={-1}
            >
              <ConfirmBody opts={pending} onClose={close} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

function ConfirmBody({ opts, onClose }: { opts: PendingConfirm; onClose: (v: boolean) => void }) {
  const tone: ConfirmTone = opts.tone ?? "warning";
  const palette = {
    danger: {
      icon: Trash2,
      iconBg: "bg-error-container",
      iconColor: "text-on-error-container",
      buttonClass: "bg-error text-on-error hover:opacity-90",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-tertiary-fixed",
      iconColor: "text-tertiary",
      buttonClass: "primary-gradient text-white hover:opacity-90",
    },
    info: {
      icon: Info,
      iconBg: "bg-primary-fixed",
      iconColor: "text-primary",
      buttonClass: "primary-gradient text-white hover:opacity-90",
    },
  }[tone];
  const Icon = palette.icon;

  return (
    <>
      <div className="p-6 flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center", palette.iconBg, palette.iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-on-surface tracking-tight mb-1">{opts.title}</h3>
          {opts.message && (
            <p className="text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">{opts.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClose(false)}
          className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant shrink-0"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={() => onClose(false)}
          className="flex-1 py-3 rounded-xl text-sm font-bold bg-surface-container-low hover:bg-surface-container text-on-surface transition-all"
        >
          {opts.cancelText ?? "Vazgeç"}
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => onClose(true)}
          className={cn("flex-1 py-3 rounded-xl text-sm font-bold transition-all", palette.buttonClass)}
        >
          {opts.confirmText ?? "Onayla"}
        </button>
      </div>
    </>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
