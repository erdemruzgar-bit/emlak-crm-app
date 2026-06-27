"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Building2, ShieldCheck, ClipboardList, Palette, Blocks, DoorOpen, UserCog, Tags, Calculator, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/users", label: "Kullanıcılar", icon: Users },
  { href: "/settings/branches", label: "Şubeler", icon: Building2 },
  { href: "/settings/projects", label: "Projeler", icon: Blocks },
  { href: "/settings/room-types", label: "Oda Tipleri", icon: DoorOpen },
  { href: "/settings/customer-types", label: "Müşteri Tipleri", icon: UserCog },
  { href: "/settings/listing-types", label: "İlan Tipleri", icon: Tags },
  { href: "/settings/occupancy-types", label: "Sakin Durumları", icon: Home },
  { href: "/settings/commission", label: "Komisyon Politikası", icon: Calculator },
  { href: "/settings/appearance", label: "Görünüm", icon: Palette },
  { href: "/settings/kvkk", label: "KVKK", icon: ShieldCheck },
  { href: "/settings/audit-log", label: "Denetim Kayıtları", icon: ClipboardList },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link key={tab.href} href={tab.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                active ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
