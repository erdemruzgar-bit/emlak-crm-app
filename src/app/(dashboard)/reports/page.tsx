"use client";

import { useEffect, useState } from "react";
import { BarChart3, Trophy, Building2, ShieldCheck, CheckCircle, Handshake, Megaphone, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ExcelToolbar } from "@/components/ui/excel-toolbar";
import { HelpButton } from "@/components/ui/help-button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#0051d5", "#316bf3", "#505f76", "#924700", "#b4c5ff"];

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

interface ReportData {
  monthlySales: { month: string; satis: number; kira: number; satisCiro: number; kiraCiro: number }[];
  agentPerformance: { name: string; sales: number; customers: number; revenue: number }[];
  branchComparison: { name: string; value: number; revenue: number }[];
  kvkkStats: { totalConsents: number; acikRiza: number; pazarlama: number; pendingDeletion: number; auditLogsToday: number };
}

const tryFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const formatTry = (n: number) => `${tryFormatter.format(n)} ₺`;
const compactTry = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₺`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}B ₺`;
  return `${n} ₺`;
};

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<"sales" | "performance" | "branch" | "kvkk">("sales");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-on-surface-variant">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Raporlar yükleniyor...
    </div>
  );

  if (!data) return null;

  const { monthlySales, agentPerformance, branchComparison, kvkkStats } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Raporlar</h1>
            <HelpButton page="reports" title="Raporlar" />
          </div>
          <p className="text-on-surface-variant text-sm mt-1 font-medium">Detaylı analiz ve istatistikler</p>
        </div>
        <ExcelToolbar exportUrl="/api/reports/export" label="rapor" />
      </div>

      <div className="flex flex-wrap bg-surface-container-low p-1 rounded-xl w-fit">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <button key={r.key} onClick={() => setActiveReport(r.key)}
              className={cn("px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeReport === r.key ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}>
              <Icon className="w-4 h-4" />{r.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeReport === "sales" && (
          <motion.div key="sales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            {(() => {
              const totalSatisCiro = monthlySales.reduce((s, m) => s + m.satisCiro, 0);
              const totalKiraCiro = monthlySales.reduce((s, m) => s + m.kiraCiro, 0);
              const totalSatisAdet = monthlySales.reduce((s, m) => s + m.satis, 0);
              const totalKiraAdet = monthlySales.reduce((s, m) => s + m.kira, 0);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Toplam Satış Cirosu", value: formatTry(totalSatisCiro), sub: `${totalSatisAdet} işlem` },
                    { label: "Toplam Kira Cirosu", value: formatTry(totalKiraCiro), sub: `${totalKiraAdet} işlem` },
                    { label: "Satış Adedi (6 Ay)", value: String(totalSatisAdet), sub: "satış sözleşmesi" },
                    { label: "Kira Adedi (6 Ay)", value: String(totalKiraAdet), sub: "kira sözleşmesi" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                      <p className="text-2xl font-black text-on-surface mt-2">{stat.value}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{stat.sub}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Aylık Satış ve Kiralama (Adet)</h2>
              {monthlySales.every(m => m.satis === 0 && m.kira === 0) ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p className="text-sm">Henüz satış/kiralama verisi bulunmuyor</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                    <XAxis dataKey="month" tick={{ fill: "#424754", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#424754", fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="satis" fill="#0051d5" name="Satış" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="kira" fill="#316bf3" name="Kiralama" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Aylık Ciro (₺)</h2>
              {monthlySales.every(m => m.satisCiro === 0 && m.kiraCiro === 0) ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p className="text-sm">Bu dönem için ciro verisi bulunmuyor</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                    <XAxis dataKey="month" tick={{ fill: "#424754", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#424754", fontSize: 12 }} tickFormatter={compactTry} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatTry(typeof v === "number" ? v : Number(v) || 0)} />
                    <Bar dataKey="satisCiro" fill="#0051d5" name="Satış Cirosu" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="kiraCiro" fill="#924700" name="Kira Cirosu" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        )}

        {activeReport === "performance" && (
          <motion.div key="performance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Danışman Performansı</h2>
              {agentPerformance.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant text-sm">Danışman verisi bulunamadı</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, agentPerformance.length * 60)}>
                  <BarChart data={agentPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                    <XAxis type="number" tick={{ fill: "#424754", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#424754", fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="sales" fill="#0051d5" name="Satış" radius={[0, 8, 8, 0]} />
                    <Bar dataKey="customers" fill="#b4c5ff" name="Müşteri" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] overflow-hidden border border-outline-variant/10">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Danışman", "Satış", "Müşteri", "Ciro", "Dönüşüm"].map((h) => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((a) => (
                    <tr key={a.name} className="border-t border-outline-variant/10 hover:bg-surface-container-low transition-all">
                      <td className="px-6 py-5 text-sm font-semibold text-on-surface">{a.name}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{a.sales}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{a.customers}</td>
                      <td className="px-6 py-5 text-sm font-bold text-on-surface">{formatTry(a.revenue)}</td>
                      <td className="px-6 py-5 text-sm text-primary font-bold">
                        {a.customers > 0 ? `%${((a.sales / a.customers) * 100).toFixed(0)}` : "-"}
                      </td>
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
              {branchComparison.every(b => b.value === 0) ? (
                <div className="text-center py-12 text-on-surface-variant text-sm">Henüz şube satış verisi yok</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={branchComparison.filter(b => b.value > 0)} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value"
                      label={(props: { name?: string; percent?: number }) => `${props.name ?? ""} %${((props.percent ?? 0) * 100).toFixed(0)}`}>
                      {branchComparison.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 border border-outline-variant/10">
              <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Şube Detayları</h2>
              <div className="space-y-4">
                {branchComparison.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-on-surface">{b.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{b.value} işlem</p>
                    </div>
                    <span className="text-sm font-black text-on-surface">{formatTry(b.revenue)}</span>
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
                { label: "90+ Gün Takipsiz", value: kvkkStats.pendingDeletion, icon: Trash2 },
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
                    kvkkStats.totalConsents > 0 ? `Açık rıza oranı: %${((kvkkStats.acikRiza / kvkkStats.totalConsents) * 100).toFixed(0)}` : "Rıza kaydı bulunmuyor",
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
