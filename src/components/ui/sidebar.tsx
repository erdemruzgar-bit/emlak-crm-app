"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Home,
  Users,
  Calendar as CalendarIcon,
  BarChart3,
  Settings,
  Plus,
  HelpCircle,
  ShieldCheck,
  CheckSquare,
  MessageSquare,
  FileSignature,
  Wallet,
  Zap,
  Bell,
  Calculator,
  Globe,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: readonly string[];
  moduleKey?: string;  // src/lib/modules.ts ModuleKey — User.disabledModules listesindeyse gizlenir
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Temel",
    items: [
      { name: "Panel", href: "/dashboard", icon: LayoutDashboard, moduleKey: "DASHBOARD" },
      { name: "Müşteriler", href: "/customers", icon: Users, moduleKey: "CUSTOMERS" },
      { name: "Portföy", href: "/properties", icon: Home, moduleKey: "PROPERTIES" },
      { name: "Projeler", href: "/projects", icon: Building2, moduleKey: "PROJECTS" },
    ],
  },
  {
    label: "İşletme",
    items: [
      { name: "İletişim", href: "/messages", icon: MessageSquare, badge: "Yeni", moduleKey: "MESSAGES" },
      { name: "Sözleşmeler", href: "/contracts", icon: FileSignature, moduleKey: "CONTRACTS" },
      { name: "Finans", href: "/finance", icon: Wallet, moduleKey: "FINANCE" },
      { name: "Takvim", href: "/calendar", icon: CalendarIcon, moduleKey: "CALENDAR" },
      { name: "Görevler", href: "/tasks", icon: CheckSquare, moduleKey: "TASKS" },
    ],
  },
  {
    label: "İzleme",
    items: [
      { name: "Hatırlatmalar", href: "/reminders", icon: Bell, moduleKey: "REMINDERS" },
      { name: "Otomasyon", href: "/automation", icon: Zap, badge: "Yeni", moduleKey: "AUTOMATION" },
      { name: "Raporlar", href: "/reports", icon: BarChart3, moduleKey: "REPORTS" },
      { name: "Komisyon Hesapla", href: "/tools/commission-calculator", icon: Calculator, moduleKey: "TOOLS" },
      { name: "Vatandaşlık Hesapla", href: "/tools/citizenship-calculator", icon: Globe, moduleKey: "TOOLS" },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { name: "Erişim Logları", href: "/access-logs", icon: ShieldCheck, roles: ["ADMIN", "MANAGER"], moduleKey: "ACCESS_LOGS" },
      { name: "Ayarlar", href: "/settings/users", icon: Settings, moduleKey: "SETTINGS" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const sessionUser = session?.user as unknown as { role?: string; disabledModules?: string[] } | undefined;
  const role = sessionUser?.role;
  const disabledModules = sessionUser?.disabledModules ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);

  // Header'daki hamburger butonu → "toggle-sidebar" event emit eder
  useEffect(() => {
    const handler = () => setMobileOpen((v) => !v);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  // Route değişince mobil drawer'ı kapat
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);
  const visibleGroups = navigationGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        // Rol kısıtlaması
        if (item.roles && !(role ? item.roles.includes(role) : false)) return false;
        // Modül-bazlı yetki (ADMIN her zaman görür)
        if (role !== "ADMIN" && item.moduleKey && disabledModules.includes(item.moduleKey)) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobil backdrop */}
      {mobileOpen && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}
    <aside
      style={{
        paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
      className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-surface-container-low/90 backdrop-blur-xl flex flex-col pr-6 z-50 rounded-r-3xl transition-transform duration-300 border-r border-outline-variant/10",
        // lg ekranda her zaman görünür; mobilde drawer (state ile toggle)
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="mb-10 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-on-surface">
              ART CRM
            </h1>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">
              Premium Yönetim
            </p>
          </div>
        </div>
      </div>

      {/* Navigation — gruplandırılmış */}
      <nav className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1.5">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-surface-container-lowest text-primary shadow-sm font-semibold translate-x-1"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 hover:translate-x-1"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive
                        ? "fill-primary/10"
                        : "group-hover:scale-110 transition-transform"
                    )}
                  />
                  <span className="text-sm flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-tertiary-fixed text-tertiary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-6 border-t border-outline-variant/20 space-y-4">
        <Link
          href="/properties/new"
          className="w-full primary-gradient text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/10 active:scale-95 transition-all text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni İlan</span>
        </Link>

        <Link
          href="/yardim"
          className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 rounded-xl transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Yardım / Kullanım Kılavuzu</span>
        </Link>

        <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-on-surface-variant">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            KVKK Uyumlu
          </span>
          {/* Mobilde drawer kapatma butonu */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2.5 rounded-lg hover:bg-surface-container/50"
            aria-label="Menüyü kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
