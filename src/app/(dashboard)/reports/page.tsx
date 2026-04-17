"use client";

import { useState } from "react";
import { BarChart3, Trophy, Building2, ShieldCheck, CheckCircle, Handshake, Megaphone, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#0051d5", "#316bf3", "#505f76", "#924700", "#b4c5ff"];

const monthlySales = [
  { month: "Oca", satis: 5, kira: 8 },
  { month: "Şub", satis: 7, kira: 12 },
  { month: "Mar", satis: 10, kira: 9 },
  { month: "Nis", satis: 8, kira: 15 },
  { month: "May", satis: 12, kira: 11 },
  { month: "Haz", satis: 9, kira: 14 },
];

const agentPerformance = [
  { name: "Ahmet K.", sales: 15, customers: 28 },
  { name: "Mehmet D.", sales: 12, customers: 22 },
  { name: "Ayşe Y.", sales: 18, customers: 35 },
  { name: "Fatma S.", sales: 9, customers: 15 },
  { name: "Ali R.", sales: 11, customers: 20 },
];

const branchComparison = [
  { name: "Kadıköy", value: 45 },
  { name: "Beşiktaş", value: 30 },
  { name: "Ataşehir", value: 25 },
  { name: "Üsküdar", value: 20 },
];

const kvkkStats = {
  totalConsents: 248,
  acikRiza: 240,
  pazarlama: 180,
  pendingDeletion: 3,
  auditLogsToday: 156,
};

const tooltipStyle = {
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(12px)",
  border: "none",
  borderRadius: "12px",
  boxShadow: "0 12px 32px rgba(25,28,30,0.12)",
};

const reports = [
  { key: "sales", label: "Satış/Kira Raporu", icon: BarChart3 },
  { key: "performance", label: "Danışman Performansı", icon: Trophy },
  { key: "branch", label: "Şube Karşılaştırma", icon: Building2 },
  { key: "kvkk", label: "KVKK Uyumluluk", icon: ShieldCheck },
] as const;

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<"sales" | "performance" | "branch" | "kvkk">("sales");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-on-surface">Raporlar</h1>
        <p className="text-on-surface-variant text-sm mt-1 font-medium">Detaylı analiz ve istatistikler</p>
      </div>

      <div className="flex bg-surface-container-low p-1 rounded-xl w-fit">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => setActiveReport(r.key)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeReport === r.key ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Icon className="w-4 h-4" />
              {r.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeReport === "sales" && (
          <motion.div key="sales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10"
          >
            <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Aylık Satış ve Kiralama</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                <XAxis dataKey="month" tick={{ fill: "#424754", fontSize: 12 }} />
                <YAxis tick={{ fill: "#424754", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="satis" fill="#0051d5" name="Satış" radius={[8, 8, 0, 0]} />
                <Bar dataKey="kira" fill="#316bf3" name="Kiralama" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {activeReport === "performance" && (
          <motion.div key="performance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Danışman Performansı</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={agentPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                  <XAxis type="number" tick={{ fill: "#424754", fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#424754", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sales" fill="#0051d5" name="Satış" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="customers" fill="#b4c5ff" name="Müşteri" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden border border-outline-variant/10">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Danışman</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Satış</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Müşteri</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Dönüşüm</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((a) => (
                    <tr key={a.name} className="hover:bg-surface-container-low transition-all">
                      <td className="px-6 py-5 text-sm font-semibold text-on-surface">{a.name}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{a.sales}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{a.customers}</td>
                      <td className="px-6 py-5 text-sm text-primary font-bold">%{((a.sales / a.customers) * 100).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeReport === "branch" && (
          <motion.div key="branch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Şubelere Göre Satış</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={branchComparison} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={(props: { name?: string; percent?: number }) => `${props.name ?? ""} %${((props.percent ?? 0) * 100).toFixed(0)}`}>
                    {branchComparison.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Şube Detayları</h2>
              <div className="space-y-4">
                {branchComparison.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    <span className="flex-1 text-sm font-semibold text-on-surface">{b.name}</span>
                    <span className="text-sm font-black text-on-surface">{b.value} satış</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeReport === "kvkk" && (
          <motion.div key="kvkk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Toplam Rıza", value: kvkkStats.totalConsents, icon: Handshake },
                { label: "Açık Rıza Alınan", value: kvkkStats.acikRiza, icon: CheckCircle },
                { label: "Pazarlama İzni", value: kvkkStats.pazarlama, icon: Megaphone },
                { label: "Silme Talepleri", value: kvkkStats.pendingDeletion, icon: Trash2 },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                      <div className="w-10 h-10 bg-primary-fixed rounded-2xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-on-surface">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-4 tracking-tight">KVKK Uyumluluk Durumu</h2>
              <div className="bg-surface-container-low p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-bold text-on-surface">Sistem KVKK uyumlu çalışmaktadır</span>
                </div>
                <div className="space-y-2">
                  {[
                    "Tüm kişisel veriler AES-256 ile şifreleniyor",
                    `Erişim logları kayıt altına alınıyor (${kvkkStats.auditLogsToday} kayıt bugün)`,
                    `Açık rıza oranı: %${((kvkkStats.acikRiza / kvkkStats.totalConsents) * 100).toFixed(0)}`,
                    "Veri anonimleştirme mekanizması aktif",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
