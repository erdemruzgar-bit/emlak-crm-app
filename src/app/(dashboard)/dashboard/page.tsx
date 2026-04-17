"use client";

import { useEffect, useState } from "react";
import { Users, Home, CreditCard, Calendar, UserPlus, FileEdit, CalendarCheck, Banknote, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalCustomers: number;
  activeProperties: number;
  monthSales: number;
  pendingAppointments: number;
  recentActivities: Activity[];
  monthlySales: MonthlySale[];
  propertyTypeDistribution: TypeDist[];
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

const statCards = [
  { key: "totalCustomers", title: "Toplam Müşteri", icon: Users },
  { key: "activeProperties", title: "Aktif İlan", icon: Home },
  { key: "monthSales", title: "Bu Ay Satış", icon: CreditCard },
  { key: "pendingAppointments", title: "Bekleyen Randevu", icon: Calendar },
] as const;

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  customer: UserPlus,
  property: FileEdit,
  appointment: CalendarCheck,
  sale: Banknote,
};

const activityColors: Record<string, string> = {
  customer: "bg-secondary-container text-primary",
  property: "bg-primary-fixed text-primary",
  appointment: "bg-tertiary-fixed text-tertiary",
  sale: "bg-primary-container text-on-primary-container",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">
          Panel Özeti
        </h1>
        <p className="text-on-surface-variant text-sm mt-1 font-medium">
          Tekrar hoş geldin. İşte bugün olanlar.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    {card.title}
                  </p>
                  <p className="text-3xl font-black text-on-surface">
                    {stats[card.key]}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">
            Aylık Satışlar
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
              <XAxis dataKey="month" tick={{ fill: "#424754", fontSize: 12 }} />
              <YAxis tick={{ fill: "#424754", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(12px)",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 12px 32px rgba(25,28,30,0.12)",
                }}
              />
              <Bar dataKey="count" fill="#0051d5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">
            Portföy Dağılımı
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.propertyTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ""} %${((props.percent ?? 0) * 100).toFixed(0)}`
                }
              >
                {stats.propertyTypeDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(12px)",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 12px 32px rgba(25,28,30,0.12)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">
          Son Aktiviteler
        </h2>
        <div className="space-y-3">
          {stats.recentActivities.map((activity) => {
            const Icon = activityIcons[activity.type] || UserPlus;
            return (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${activityColors[activity.type] || "bg-surface-container"}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm text-on-surface flex-1 font-medium">
                  {activity.description}
                </p>
                <span className="text-xs text-on-surface-variant font-medium">
                  {activity.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
