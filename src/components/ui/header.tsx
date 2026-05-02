"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, Users, Home, Menu, Moon, Sun, Keyboard } from "lucide-react";
import { useTheme } from "@/components/theme-provider";


export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"customers" | "properties">("customers");

  const user = session?.user;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function refresh() {
      try {
        const res = await fetch("/api/reminders?scope=me&done=false&countOnly=1");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && typeof data.count === "number") setPendingCount(data.count);
      } catch {
        /* noop */
      }
    }
    refresh();
    // Her 60 saniyede bir yenile
    const t = setInterval(refresh, 60000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [user]);

  const roleLabels: Record<string, string> = {
    ADMIN: "Yönetici",
    MANAGER: "Şube Müdürü",
    AGENT: "Danışman",
  };

  const userRole =
    roleLabels[
      String((user as unknown as Record<string, unknown>)?.role ?? "")
    ] || "Kullanıcı";

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 w-full sticky top-0 z-40 bg-background/70 backdrop-blur-xl gap-3">
      {/* Mobil hamburger — sadece lg altında görünür */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("toggle-sidebar"))}
        className="lg:hidden p-2 rounded-lg hover:bg-surface-container text-on-surface-variant shrink-0"
        aria-label="Menü"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Left: Search */}
      <div className="flex items-center gap-6 flex-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchQuery.trim();
            if (!q) return;
            const path = searchType === "customers" ? "/customers" : "/properties";
            router.push(`${path}?search=${encodeURIComponent(q)}`);
          }}
          className="relative w-full max-w-md flex items-center"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-32 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-on-surface-variant/50"
            placeholder={searchType === "customers" ? "Müşteri ara (ad, telefon, e-posta)..." : "İlan ara (başlık, şehir, ilçe)..."}
            type="text"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg shadow-sm border border-outline-variant/10">
            {searchType === "customers" ? (
              <Users className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <Home className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "customers" | "properties")}
              className="text-xs font-bold outline-none cursor-pointer bg-transparent"
            >
              <option value="customers">Müşteriler</option>
              <option value="properties">İlanlar</option>
            </select>
          </div>
        </form>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Klavye kısayolları (?) */}
        <button
          type="button"
          onClick={() => {
            // ShortcutsHelp dispatches via "?" key — synthesize a keypress
            const event = new KeyboardEvent("keydown", { key: "?" });
            window.dispatchEvent(event);
          }}
          title="Klavye Kısayolları (?)"
          aria-label="Klavye Kısayolları"
          className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors hidden sm:inline-flex"
        >
          <Keyboard className="w-5 h-5" />
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          title={darkMode ? "Açık moda geç (D)" : "Koyu moda geç (D)"}
          aria-label={darkMode ? "Açık moda geç" : "Koyu moda geç"}
          className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <Link
          href="/reminders"
          title={pendingCount > 0 ? `${pendingCount} bekleyen hatırlatma` : "Hatırlatmalar"}
          className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {pendingCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          ) : (
            <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full border-2 border-background"></span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 pl-4 border-l border-outline-variant/30 hover:bg-surface-container-low rounded-xl px-3 py-2 transition-all"
          >
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary/10 bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold">
              {(() => {
                const photoUrl = (user as unknown as Record<string, unknown>)?.photoUrl as string | undefined;
                return photoUrl ? (
                  <img src={photoUrl} alt={user?.name || "Kullanıcı"} className="w-full h-full object-cover object-top" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || "U"
                );
              })()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-on-surface">
                {user?.name || "Kullanıcı"}
              </p>
              <p className="text-[10px] text-on-surface-variant font-medium">
                {userRole}
              </p>
            </div>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-surface-container-lowest rounded-2xl shadow-[0_12px_32px_rgba(25,28,30,0.12)] z-50 py-1 overflow-hidden">
                <div className="px-4 py-3 text-xs text-on-surface-variant border-b border-outline-variant/20">
                  {(user as unknown as Record<string, unknown>)?.branchName
                    ? String(
                        (user as unknown as Record<string, unknown>).branchName
                      )
                    : ""}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error-container/30 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Çıkış Yap
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
