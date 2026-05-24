"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Home, CreditCard, Calendar, UserPlus, FileEdit, CalendarCheck, Banknote, Loader2, Phone, AlertTriangle, Clock, ChevronRight, Download, Presentation } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { HelpButton } from "@/components/ui/help-button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface OverdueFollowUp {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  nextFollowUpDate: string | null;
  stage: string | null;
  urgency: string | null;
}

interface TodayAppointment {
  id: string;
  title: string;
  startDate: string;
  customer: { id: string; firstName: string; lastName: string } | null;
  property: { id: string; title: string } | null;
}

interface DashboardStats {
  totalCustomers: number;
  activeProperties: number;
  monthSales: number;
  pendingAppointments: number;
  recentActivities: Activity[];
  monthlySales: MonthlySale[];
  propertyTypeDistribution: TypeDist[];
  overdueFollowUps: OverdueFollowUp[];
  todayAppointments: TodayAppointment[];
}

interface Activity {
  id: string;
  type: string;
  description: string;
  date: string;
}

interface MonthlySale {
  month: string;
  count: number;
}

interface TypeDist {
  name: string;
  value: number;
}

const COLORS = ["#0051d5", "#316bf3", "#505f76", "#924700", "#b4c5ff"];
const tooltipStyle = { background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "none", borderRadius: "12px", boxShadow: "0 12px 32px rgba(25,28,30,0.12)" };

const statCards = [
  { key: "totalCustomers", title: "Toplam Müşteri", icon: Users, href: "/customers" },
  { key: "activeProperties", title: "Aktif İlan", icon: Home, href: "/properties" },
  { key: "monthSales", title: "Bu Ay Satış", icon: CreditCard, href: "/reports" },
  { key: "pendingAppointments", title: "Bekleyen Randevu", icon: Calendar, href: "/calendar" },
] as const;

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  customer: UserPlus, property: FileEdit, appointment: CalendarCheck, sale: Banknote,
};
const activityColors: Record<string, string> = {
  customer: "bg-secondary-container text-primary",
  property: "bg-primary-fixed text-primary",
  appointment: "bg-tertiary-fixed text-tertiary",
  sale: "bg-primary-container text-on-primary-container",
};
const urgencyColors: Record<string, string> = {
  URGENT: "text-error",
  HIGH: "text-tertiary",
  MEDIUM: "text-on-surface-variant",
  LOW: "text-on-surface-variant",
};

function daysSinceISO(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as unknown as { role?: string } | undefined)?.role === "ADMIN";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [downloadingPres, setDownloadingPres] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setStats).catch(() => setStats(null));
  }, []);

  async function downloadPresentation() {
    setDownloadingPres(true);
    try {
      const res = await fetch("/api/presentation/export");
      if (!res.ok) {
        let msg = `Sunum üretilemedi (HTTP ${res.status})`;
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
          if (data.detail) msg += `\n\nDetay: ${data.detail}`;
        } catch {}
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/);
      const filename = m?.[1] || `Emlak-CRM-Sunum-${new Date().toISOString().slice(0, 10)}.pptx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Bağlantı hatası");
    } finally {
      setDownloadingPres(false);
    }
  }

  if (!stats) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />Yükleniyor...
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Panel Özeti</h1>
            <HelpButton page="dashboard" title="Panel Özeti" />
          </div>
          <p className="text-on-surface-variant text-sm mt-1 font-medium">Tekrar hoş geldin. İşte bugün olanlar.</p>
        </div>
        {isAdmin && (
          <button onClick={downloadPresentation} disabled={downloadingPres}
            title="Sistemin güncel verilerini içeren PowerPoint sunumu oluşturur"
            className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60">
            {downloadingPres ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
            {downloadingPres ? "Hazırlanıyor..." : "Sunumu İndir"}
            <Download className="w-3.5 h-3.5 opacity-70" />
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link href={card.href}
                className="block bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10 hover:shadow-xl hover:-translate-y-0.5 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{card.title}</p>
                    <p className="text-3xl font-black text-on-surface">{stats[card.key]}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Alert Row: Follow-ups + Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Overdue Follow-ups */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error" />
              Takip Bekleyenler
              {stats.overdueFollowUps.length > 0 && (
                <span className="bg-error text-on-error text-[10px] font-black px-2 py-0.5 rounded-full">{stats.overdueFollowUps.length}</span>
              )}
            </h2>
            <Link href="/customers?hasOverdueFollowUp=true" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Tümü <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.overdueFollowUps.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant text-sm">
              <span className="text-2xl block mb-2">✅</span>Bekleyen takip yok
            </div>
          ) : (
            <div className="space-y-2">
              {stats.overdueFollowUps.map((c) => {
                const daysAgo = daysSinceISO(c.nextFollowUpDate);
                return (
                  <Link key={c.id} href={`/customers/${c.id}`}
                    className="flex items-center justify-between p-3 bg-surface-container-low hover:bg-surface-container rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-error-container rounded-xl flex items-center justify-center text-error font-bold text-sm">
                        {c.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{c.firstName} {c.lastName}</p>
                        <p className={cn("text-xs font-medium", urgencyColors[c.urgency || "LOW"])}>
                          {daysAgo === 0 ? "Bugün" : daysAgo === 1 ? "Dün" : `${daysAgo} gün önce`} · {c.stage || "-"}
                        </p>
                      </div>
                    </div>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-primary-fixed text-primary rounded-xl hover:bg-primary hover:text-white transition-all">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Appointments */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Bugünkü Randevular
              {stats.todayAppointments.length > 0 && (
                <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">{stats.todayAppointments.length}</span>
              )}
            </h2>
            <Link href="/calendar" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Takvim <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.todayAppointments.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant text-sm">
              <span className="text-2xl block mb-2">📅</span>Bugün randevu yok
            </div>
          ) : (
            <div className="space-y-2">
              {stats.todayAppointments.map((a) => (
                <Link key={a.id} href="/calendar"
                  className="flex items-center gap-3 p-3 bg-surface-container-low hover:bg-surface-container rounded-2xl transition-all">
                  <div className="w-8 h-8 bg-primary-container rounded-xl flex items-center justify-center text-on-primary-container font-bold text-xs shrink-0">
                    {new Date(a.startDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{a.title}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : ""}
                      {a.customer && a.property ? " · " : ""}
                      {a.property?.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Aylık Satışlar</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
              <XAxis dataKey="month" tick={{ fill: "#424754", fontSize: 12 }} />
              <YAxis tick={{ fill: "#424754", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#0051d5" name="Satış/Kiralama" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Portföy Dağılımı</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.propertyTypeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                label={(props: { name?: string; percent?: number }) => `${props.name ?? ""} %${((props.percent ?? 0) * 100).toFixed(0)}`}>
                {stats.propertyTypeDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Son Aktiviteler</h2>
        <div className="space-y-3">
          {stats.recentActivities.map((activity) => {
            const Icon = activityIcons[activity.type] || UserPlus;
            return (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activityColors[activity.type] || "bg-surface-container"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm text-on-surface flex-1 font-medium">{activity.description}</p>
                <span className="text-xs text-on-surface-variant font-medium">{activity.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
