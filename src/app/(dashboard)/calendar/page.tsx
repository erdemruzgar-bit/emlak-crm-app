"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MapPin, Loader2, CalendarX, PlusCircle, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  location: string | null;
  customer: { firstName: string; lastName: string } | null;
  property: { title: string } | null;
  user: { name: string };
}

const typeLabels: Record<string, string> = { GOSTERIM: "Gösterim", TOPLANTI: "Toplantı", DIGER: "Diğer" };
const typeBadgeStyles: Record<string, string> = {
  GOSTERIM: "bg-secondary-container text-on-secondary-container",
  TOPLANTI: "bg-primary-fixed text-on-primary-fixed",
  DIGER: "bg-surface-container text-on-surface-variant",
};
const typeBarColors: Record<string, string> = {
  GOSTERIM: "",
  TOPLANTI: "border-l-4 border-primary",
  DIGER: "border-l-4 border-tertiary",
};
const typeCalColors: Record<string, string> = {
  GOSTERIM: "bg-primary",
  TOPLANTI: "bg-secondary",
  DIGER: "bg-tertiary",
};
const statusLabels: Record<string, string> = { PLANNED: "Planlandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal" };

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [currentDate]);

  async function fetchAppointments() {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const res = await fetch(`/api/appointments?start=${start}&end=${end}`);
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const monthName = currentDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  function getAppointmentsForDay(day: number) {
    return appointments.filter((a) => {
      const d = new Date(a.startDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth();
    });
  }

  const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  const todayDate = isCurrentMonth ? today.getDate() : 1;
  const todaysAppointments = getAppointmentsForDay(todayDate);
  const todayFormatted = today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const totalCells = startOffset + daysInMonth;
  const totalRows = Math.ceil(totalCells / 7);
  const remainingCells = totalRows * 7 - totalCells;

  async function handleAddAppointment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      type: fd.get("type"),
      startDate: new Date(fd.get("startDate") as string).toISOString(),
      endDate: new Date(fd.get("endDate") as string).toISOString(),
      location: fd.get("location") || undefined,
      notes: fd.get("notes") || undefined,
    };
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowModal(false);
    fetchAppointments();
  }

  return (
    <div className="flex gap-8 min-h-[calc(100vh-140px)]">
      {/* Left: Daily Agenda Sidebar */}
      <section className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tighter text-on-surface">Günlük Ajanda</h2>
          <p className="text-sm text-on-surface-variant capitalize font-medium">{todayFormatted}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          </div>
        ) : todaysAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <CalendarX className="w-10 h-10 opacity-30 mb-2" />
            <p className="text-sm">Bugün randevu yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysAppointments.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "bg-surface-container-lowest p-4 rounded-2xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] group cursor-pointer hover:translate-x-1 transition-transform",
                  typeBarColors[a.type]
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider", typeBadgeStyles[a.type])}>
                    {typeLabels[a.type]}
                  </span>
                  <span className="text-xs font-medium text-on-surface-variant">
                    {new Date(a.startDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <h4 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">
                  {a.title}
                </h4>
                {a.customer && (
                  <p className="text-xs text-on-surface-variant">
                    Müşteri: {a.customer.firstName} {a.customer.lastName}
                  </p>
                )}
                {a.location && (
                  <div className="mt-2 flex items-center gap-1 text-primary">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[11px] font-semibold">{a.location}</span>
                  </div>
                )}
                <div className="mt-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium",
                    a.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                    a.status === "CANCELLED" ? "bg-error-container text-on-error-container" :
                    "bg-surface-container text-on-surface-variant"
                  )}>
                    {statusLabels[a.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="mt-auto w-full py-3 border-2 border-dashed border-outline-variant text-outline hover:border-primary hover:text-primary rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Hızlı Randevu
        </button>
      </section>

      {/* Right: Calendar Grid */}
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 bg-surface-container-lowest rounded-3xl p-8 flex flex-col shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface capitalize">{monthName}</h1>
            <div className="flex items-center bg-surface-container-low rounded-xl p-1 shadow-inner">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all text-on-surface-variant">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-primary">
                Bugün
              </button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all text-on-surface-variant">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Randevu
          </button>
        </div>

        <div className="flex-1 grid grid-cols-7 gap-px bg-surface-container/50 overflow-hidden rounded-2xl">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <div key={day} className="bg-surface-container-low p-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {day}
            </div>
          ))}

          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`prev-${i}`} className="bg-surface-container-low/30 p-4 text-outline/30 text-sm font-bold min-h-[80px]">
              {prevMonthDays - startOffset + 1 + i}
            </div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = isCurrentMonth && today.getDate() === day;

            return (
              <div
                key={day}
                className={cn(
                  "p-3 min-h-[80px] text-sm font-bold transition-colors cursor-pointer",
                  isToday
                    ? "bg-primary-container/10 text-primary ring-2 ring-inset ring-primary relative overflow-hidden"
                    : "bg-white text-on-surface hover:bg-surface-container-low"
                )}
              >
                <span>{day}</span>
                {dayAppointments.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 2).map((a) => (
                      <div key={a.id} className={cn("h-4 px-1.5 text-[8px] text-white flex items-center rounded-sm truncate", typeCalColors[a.type])}>
                        {a.title}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <span className="text-[10px] text-on-surface-variant">+{dayAppointments.length - 2}</span>
                    )}
                  </div>
                )}
                {isToday && (
                  <div className="absolute -right-2 -bottom-2 opacity-10">
                    <Calendar className="w-12 h-12" />
                  </div>
                )}
              </div>
            );
          })}

          {Array.from({ length: remainingCells }).map((_, i) => (
            <div key={`next-${i}`} className="bg-surface-container-low/30 p-4 text-outline/30 text-sm font-bold min-h-[80px]">
              {i + 1}
            </div>
          ))}
        </div>
      </motion.section>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl p-8 w-full max-w-md"
            >
              <h2 className="text-xl font-black text-on-surface mb-6 tracking-tight">Yeni Randevu</h2>
              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Başlık *</label>
                  <input name="title" required className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Tip</label>
                  <select name="type" className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                    <option value="GOSTERIM">Gösterim</option>
                    <option value="TOPLANTI">Toplantı</option>
                    <option value="DIGER">Diğer</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Başlangıç *</label>
                    <input name="startDate" type="datetime-local" required className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Bitiş *</label>
                    <input name="endDate" type="datetime-local" required className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Konum</label>
                  <input name="location" className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Notlar</label>
                  <textarea name="notes" rows={2} className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all">
                    İptal
                  </button>
                  <button type="submit" className="px-5 py-3 text-sm text-white primary-gradient font-bold rounded-xl shadow-lg shadow-primary/10">
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 h-14 w-14 primary-gradient text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 lg:hidden"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
