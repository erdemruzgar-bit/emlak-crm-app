"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Müşteriler", href: "/customers", icon: Users },
  { name: "Portföy", href: "/properties", icon: Home },
  { name: "İletişim", href: "/messages", icon: MessageSquare, badge: "Yeni" },
  { name: "Sözleşmeler", href: "/contracts", icon: FileSignature, badge: "Yeni" },
  { name: "Finans", href: "/finance", icon: Wallet, badge: "Yeni" },
  { name: "Görevler", href: "/tasks", icon: CheckSquare },
  { name: "Takvim", href: "/calendar", icon: CalendarIcon },
  { name: "Otomasyon", href: "/automation", icon: Zap, badge: "Yeni" },
  { name: "Raporlar", href: "/reports", icon: BarChart3 },
  { name: "Ayarlar", href: "/settings/users", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-low flex flex-col p-6 z-50 rounded-r-3xl transition-all duration-300">
      {/* Logo */}
      <div className="mb-10 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-on-surface">
              Emlak CRM
            </h1>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">
              Premium Yönetim
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
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
              {"badge" in item && item.badge && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-tertiary-fixed text-tertiary">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
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

        <a
          href="/Emlak-CRM-Kullanim-Kilavuzu.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 rounded-xl transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Yardım / Kullanım Kılavuzu</span>
        </a>

        <div className="flex items-center gap-2 px-4 py-2 text-xs text-on-surface-variant">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          KVKK Uyumlu
        </div>
      </div>
    </aside>
  );
}
