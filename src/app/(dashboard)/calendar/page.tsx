"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MapPin, Loader2, CalendarX, PlusCircle, Calendar, Pencil, Trash2, X, AlertCircle, User, Home } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExcelToolbar } from "@/components/ui/excel-toolbar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { HelpButton } from "@/components/ui/help-button";

interface Appointment {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  location: string | null;
  notes: string | null;
  customer: { id: string; firstName: string; lastName: string } | null;
  property: { id: string; title: string } | null;
  user: { name: string };
}

interface SearchResult {
  id: string;
  label: string;
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

function toLocalDateTimeInput(isoStr: string) {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SearchDropdown({
  label,
  icon: Icon,
  placeholder,
  value,
  selected,
  results,
  loading,
  onSearch,
  onSelect,
  onClear,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  value: string;
  selected: SearchResult | null;
  results: SearchResult[];
  loading: boolean;
  onSearch: (q: string) => void;
  onSelect: (r: SearchResult) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">{label}</label>
      {selected ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-primary-fixed rounded-xl">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-on-surface flex-1">{selected.label}</span>
          <button type="button" onClick={onClear} className="text-on-surface-variant hover:text-error transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => { onSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
          {loading && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-on-surface-variant" />}
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto border border-outline-variant/20">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onSelect(r); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low text-sm text-on-surface transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {open && value.length > 1 && results.length === 0 && !loading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl z-10 border border-outline-variant/20">
              <p className="px-4 py-3 text-sm text-on-surface-variant">Sonuç bulunamadı</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const confirm = useConfirm();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<SearchResult[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SearchResult | null>(null);

  // Property search
  const [propertyQuery, setPropertyQuery] = useState("");
  const [propertyResults, setPropertyResults] = useState<SearchResult[]>([]);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<SearchResult | null>(null);

  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const propertyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAppointments(); }, [currentDate]);

  // URL'den ?newPropertyId=xxx ile geldiyse modal'ı aç ve mülkü preset et
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const preId = sp.get("newPropertyId");
    if (!preId) return;
    (async () => {
      try {
        const res = await fetch(`/api/properties/${preId}`);
        if (!res.ok) return;
        const p = await res.json();
        setSelectedProperty({ id: p.id, label: `${p.title}${p.city ? ` · ${p.city}` : ""}` });
        setShowModal(true);
      } catch {
        /* noop */
      }
    })();
  }, []);

  async function fetchAppointments() {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const res = await fetch(`/api/appointments?start=${start}&end=${end}`);
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function searchCustomers(q: string) {
    setCustomerQuery(q);
    if (customerTimer.current) clearTimeout(customerTimer.current);
    if (q.length < 2) { setCustomerResults([]); return; }
    setCustomerLoading(true);
    customerTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setCustomerResults(
        (Array.isArray(data.customers) ? data.customers : []).map((c: { id: string; firstName: string; lastName: string; phone?: string }) => ({
          id: c.id,
          label: `${c.firstName} ${c.lastName}${c.phone ? ` · ${c.phone}` : ""}`,
        }))
      );
      setCustomerLoading(false);
    }, 300);
  }

  function searchProperties(q: string) {
    setPropertyQuery(q);
    if (propertyTimer.current) clearTimeout(propertyTimer.current);
    if (q.length < 2) { setPropertyResults([]); return; }
    setPropertyLoading(true);
    propertyTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/properties?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setPropertyResults(
        (Array.isArray(data.properties) ? data.properties : []).map((p: { id: string; title: string; city?: string }) => ({
          id: p.id,
          label: `${p.title}${p.city ? ` · ${p.city}` : ""}`,
        }))
      );
      setPropertyLoading(false);
    }, 300);
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

  function openCreate() {
    setEditAppointment(null);
    setSelectedCustomer(null);
    setSelectedProperty(null);
    setCustomerQuery("");
    setPropertyQuery("");
    setCustomerResults([]);
    setPropertyResults([]);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(a: Appointment) {
    setEditAppointment(a);
    setSelectedCustomer(a.customer ? { id: a.customer.id, label: `${a.customer.firstName} ${a.customer.lastName}` } : null);
    setSelectedProperty(a.property ? { id: a.property.id, label: a.property.title } : null);
    setCustomerQuery("");
    setPropertyQuery("");
    setCustomerResults([]);
    setPropertyResults([]);
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: fd.get("title"),
      type: fd.get("type"),
      startDate: new Date(fd.get("startDate") as string).toISOString(),
      endDate: new Date(fd.get("endDate") as string).toISOString(),
      location: fd.get("location") || undefined,
      notes: fd.get("notes") || undefined,
      customerId: selectedCustomer?.id ?? null,
      propertyId: selectedProperty?.id ?? null,
      ...(editAppointment ? { status: fd.get("status") } : {}),
    };

    const res = await fetch(
      editAppointment ? `/api/appointments/${editAppointment.id}` : "/api/appointments",
      { method: editAppointment ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(typeof data.error === "string" ? data.error : "Bir hata oluştu");
      return;
    }

    toast.success(editAppointment ? "Randevu güncellendi" : "Randevu oluşturuldu");
    setShowModal(false);
    fetchAppointments();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Randevuyu iptal et?",
      message: "Bu işlem geri alınamaz.",
      tone: "danger",
      confirmText: "İptal Et",
    });
    if (!ok) return;
    const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setShowModal(false);
      fetchAppointments();
      toast.success("Randevu iptal edildi");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Randevu silinemedi");
    }
  }

  return (
    <div className="flex gap-8 min-h-[calc(100vh-140px)]">
      {/* Left: Daily Agenda Sidebar */}
      <section className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tighter text-on-surface">Günlük Ajanda</h2>
            <HelpButton page="calendar" title="Takvim & Randevular" />
          </div>
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
                  "bg-surface-container-lowest p-4 rounded-2xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] group cursor-pointer hover:translate-x-1 transition-transform relative",
                  typeBarColors[a.type]
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider", typeBadgeStyles[a.type])}>
                    {typeLabels[a.type]}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-on-surface-variant">
                      {new Date(a.startDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => openEdit(a)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-primary transition-all ml-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">{a.title}</h4>
                {a.customer && (
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    <User className="w-3 h-3" />{a.customer.firstName} {a.customer.lastName}
                  </p>
                )}
                {a.property && (
                  <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <Home className="w-3 h-3" />{a.property.title}
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
          onClick={openCreate}
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
          <div className="flex items-center gap-3">
            <ExcelToolbar exportUrl="/api/appointments/export" label="randevu" />
            <button
              onClick={openCreate}
              className="primary-gradient text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Randevu
            </button>
          </div>
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
                      <div
                        key={a.id}
                        onClick={() => openEdit(a)}
                        className={cn("h-4 px-1.5 text-[8px] text-white flex items-center rounded-sm truncate hover:opacity-80 transition-opacity", typeCalColors[a.type])}
                      >
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

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-lg space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-on-surface tracking-tight">
                  {editAppointment ? "Randevuyu Düzenle" : "Yeni Randevu"}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="bg-error-container text-on-error-container text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Başlık *</label>
                  <input
                    name="title"
                    required
                    defaultValue={editAppointment?.title}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Tip</label>
                    <select name="type" defaultValue={editAppointment?.type || "GOSTERIM"} className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                      <option value="GOSTERIM">Gösterim</option>
                      <option value="TOPLANTI">Toplantı</option>
                      <option value="DIGER">Diğer</option>
                    </select>
                  </div>
                  {editAppointment && (
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Durum</label>
                      <select name="status" defaultValue={editAppointment.status} className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none text-sm">
                        <option value="PLANNED">Planlandı</option>
                        <option value="COMPLETED">Tamamlandı</option>
                        <option value="CANCELLED">İptal</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Başlangıç *</label>
                    <input
                      name="startDate"
                      type="datetime-local"
                      required
                      defaultValue={editAppointment ? toLocalDateTimeInput(editAppointment.startDate) : undefined}
                      className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Bitiş *</label>
                    <input
                      name="endDate"
                      type="datetime-local"
                      required
                      defaultValue={editAppointment ? toLocalDateTimeInput(editAppointment.endDate) : undefined}
                      className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                </div>

                <SearchDropdown
                  label="Müşteri"
                  icon={User}
                  placeholder="Müşteri ara..."
                  value={customerQuery}
                  selected={selectedCustomer}
                  results={customerResults}
                  loading={customerLoading}
                  onSearch={searchCustomers}
                  onSelect={setSelectedCustomer}
                  onClear={() => { setSelectedCustomer(null); setCustomerQuery(""); setCustomerResults([]); }}
                />

                <SearchDropdown
                  label="İlan"
                  icon={Home}
                  placeholder="İlan ara..."
                  value={propertyQuery}
                  selected={selectedProperty}
                  results={propertyResults}
                  loading={propertyLoading}
                  onSearch={searchProperties}
                  onSelect={setSelectedProperty}
                  onClear={() => { setSelectedProperty(null); setPropertyQuery(""); setPropertyResults([]); }}
                />

                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Konum</label>
                  <input
                    name="location"
                    defaultValue={editAppointment?.location || ""}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Notlar</label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={editAppointment?.notes || ""}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {editAppointment && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editAppointment.id)}
                      className="px-4 py-3 text-sm font-bold bg-error-container/30 hover:bg-error-container text-error rounded-xl transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 text-sm font-bold bg-surface-container-low hover:bg-surface-container rounded-xl transition-all"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 text-sm text-white primary-gradient font-bold rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editAppointment ? "Güncelle" : "Kaydet"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={openCreate}
        className="fixed bottom-8 right-8 h-14 w-14 primary-gradient text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 lg:hidden"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
