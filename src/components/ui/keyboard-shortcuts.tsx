"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Keyboard, Search, X, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

/**
 * Global klavye kısayolları + Komut Paleti.
 *
 * Kısayollar:
 *   /          → Header arama kutusuna fokus
 *   N          → Liste sayfalarında "Yeni" butonu (Müşteriler/Portföy/Sözleşmeler)
 *   Ctrl+K     → Komut paleti aç
 *   Ctrl+B     → Sidebar aç/kapa (mobil drawer)
 *   D          → Dark mode toggle
 *   ?          → Bu yardım popup'ını aç
 *   Esc        → Açık popup/modal kapat
 *
 * Form/input alanına yazarken hiçbir kısayol tetiklenmez.
 */

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleDarkMode } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable
      );
    };

    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd kombinasyonları
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          setPaletteOpen((v) => !v);
          return;
        }
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          window.dispatchEvent(new Event("toggle-sidebar"));
          return;
        }
      }

      // Esc → açık popup'ları kapat
      if (e.key === "Escape") {
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
      }

      // Yazma alanında değilsek tek-tuş kısayollar
      if (isTyping(e)) return;

      if (e.key === "/") {
        e.preventDefault();
        const headerInput = document.querySelector<HTMLInputElement>(
          "header input[type='text']"
        );
        headerInput?.focus();
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (e.key === "n" || e.key === "N") {
        // Sayfa bağlamına göre yeni kayıt
        if (pathname.startsWith("/customers") && !pathname.includes("/new")) {
          e.preventDefault();
          router.push("/customers/new");
        } else if (pathname.startsWith("/properties") && !pathname.includes("/new")) {
          e.preventDefault();
          router.push("/properties/new");
        } else if (pathname.startsWith("/contracts") && !pathname.includes("/new")) {
          e.preventDefault();
          router.push("/contracts/new");
        }
        return;
      }

      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        toggleDarkMode();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, router, toggleDarkMode, helpOpen, paletteOpen]);

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        query={paletteQuery}
        setQuery={setPaletteQuery}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

// ─── Komut Paleti ───
function CommandPalette({
  open,
  onClose,
  query,
  setQuery,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const router = useRouter();
  const { toggleDarkMode } = useTheme();
  const [highlight, setHighlight] = useState(0);

  const navItems: CommandItem[] = [
    { id: "go-dashboard", label: "Panel", hint: "Ana sayfa", href: "/dashboard" },
    { id: "go-customers", label: "Müşteriler", href: "/customers" },
    { id: "go-properties", label: "Portföy / İlanlar", href: "/properties" },
    { id: "go-contracts", label: "Sözleşmeler", href: "/contracts" },
    { id: "go-finance", label: "Finans", href: "/finance" },
    { id: "go-tasks", label: "Görevler", href: "/tasks" },
    { id: "go-calendar", label: "Takvim", href: "/calendar" },
    { id: "go-reminders", label: "Hatırlatmalar", href: "/reminders" },
    { id: "go-reports", label: "Raporlar", href: "/reports" },
    { id: "go-settings-users", label: "Ayarlar — Kullanıcılar", href: "/settings/users" },
    { id: "go-settings-branches", label: "Ayarlar — Şubeler", href: "/settings/branches" },
    { id: "go-yardim", label: "Yardım / Kullanım Kılavuzu", href: "/yardim" },
  ];

  const actionItems: CommandItem[] = [
    { id: "new-customer", label: "Yeni Müşteri", hint: "Müşteri ekle", href: "/customers/new" },
    { id: "new-property", label: "Yeni İlan", hint: "İlan ekle", href: "/properties/new" },
    { id: "new-contract", label: "Yeni Sözleşme", href: "/contracts/new" },
    { id: "toggle-dark", label: "Koyu/Açık Mod", hint: "Tema değiştir", action: toggleDarkMode },
  ];

  const all = [...actionItems, ...navItems];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q))
    : all;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
    }
  }, [open, setQuery]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function execute(item: CommandItem) {
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[highlight];
      if (item) execute(item);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-start justify-center pt-[10vh] p-2 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-outline-variant/10"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10">
              <Search className="w-4 h-4 text-on-surface-variant" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Sayfa ara veya komut yaz..."
                className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50"
              />
              <kbd className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">Esc</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Eşleşme bulunamadı</p>
              ) : (
                filtered.map((item, idx) => (
                  <button
                    key={item.id}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => execute(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      idx === highlight
                        ? "bg-primary-fixed text-primary"
                        : "hover:bg-surface-container-low text-on-surface"
                    )}
                  >
                    {item.action ? (
                      <Plus className="w-4 h-4 shrink-0 text-on-surface-variant" />
                    ) : item.id.startsWith("new-") ? (
                      <Plus className="w-4 h-4 shrink-0 text-on-surface-variant" />
                    ) : (
                      <ArrowRight className="w-4 h-4 shrink-0 text-on-surface-variant" />
                    )}
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.hint && (
                      <span className="text-xs text-on-surface-variant">{item.hint}</span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-2 border-t border-outline-variant/10 bg-surface-container-low/50 text-[11px] text-on-surface-variant">
              <span><kbd className="font-bold">↑↓</kbd> gez</span>
              <span><kbd className="font-bold">Enter</kbd> seç</span>
              <span><kbd className="font-bold">Esc</kbd> kapat</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Yardım Popup ───
function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const groups = [
    {
      label: "Genel",
      items: [
        { keys: ["?"], desc: "Bu yardım pop-up'ını aç" },
        { keys: ["Ctrl", "K"], desc: "Komut paleti — sayfa ara, hızlı eylem" },
        { keys: ["Ctrl", "B"], desc: "Sidebar (sol menü) aç/kapa" },
        { keys: ["D"], desc: "Koyu/açık mod değiştir" },
        { keys: ["/"], desc: "Üst arama kutusuna git" },
        { keys: ["Esc"], desc: "Açık modal/pop-up'ı kapat" },
      ],
    },
    {
      label: "Liste sayfaları",
      items: [
        { keys: ["N"], desc: "Yeni kayıt formu (Müşteri/İlan/Sözleşme)" },
      ],
    },
    {
      label: "İlan detayı (galeri)",
      items: [
        { keys: ["←"], desc: "Önceki foto" },
        { keys: ["→"], desc: "Sonraki foto" },
        { keys: ["Esc"], desc: "Lightbox kapat" },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-outline-variant/10"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <Keyboard className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-on-surface">Klavye Kısayolları</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">
                    {g.label}
                  </p>
                  <div className="space-y-2">
                    {g.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-on-surface flex-1">{it.desc}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {it.keys.map((k, j) => (
                            <kbd key={j} className="text-xs font-bold bg-surface-container px-2 py-1 rounded-md text-on-surface min-w-[28px] text-center">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
