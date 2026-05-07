"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Phone, Users, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  propertyId: string;
  propertyTitle: string;
  ownerName: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const KIND_OPTIONS = [
  { value: "CALL_LOG", label: "Telefon Görüşmesi", icon: Phone },
  { value: "MEETING", label: "Toplantı", icon: Users },
  { value: "GENERAL", label: "Genel Not", icon: FileText },
  { value: "OPERATIONAL_STATUS", label: "Operasyonel Durum", icon: AlertTriangle },
] as const;

export function PropertyNoteModal({ propertyId, propertyTitle, ownerName, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<typeof KIND_OPTIONS[number]["value"]>("CALL_LOG");
  const [content, setContent] = useState("");
  const [setReminder, setSetReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [reminderPriority, setReminderPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!content.trim()) {
      setError("Not içeriği boş olamaz");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { kind, content };
      if (setReminder) {
        body.reminder = {
          title: reminderTitle.trim() || `${propertyTitle} — takip`,
          dueDate: new Date(`${reminderDate}T09:00:00`).toISOString(),
          priority: reminderPriority,
        };
      }
      const res = await fetch(`/api/properties/${propertyId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Kaydedilemedi");
      }
      toast.success("Görüşme notu kaydedildi");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between p-5 border-b border-outline-variant/20">
            <div>
              <h2 className="text-lg font-black tracking-tight text-on-surface">Görüşme Ekle</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                <span className="font-mono">{propertyTitle}</span>
                {ownerName && <> · {ownerName}</>}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center">
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </header>

          <div className="p-5 space-y-5">
            {/* Tip seçimi */}
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Görüşme Tipi
              </label>
              <div className="grid grid-cols-2 gap-2">
                {KIND_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = kind === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setKind(opt.value)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-xs font-bold border-2 flex items-center gap-2 transition-all",
                        active
                          ? "bg-primary-fixed border-primary text-primary"
                          : "bg-surface-container-low border-transparent text-on-surface-variant hover:bg-surface-container"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* İçerik */}
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Not İçeriği <span className="text-error">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Görüşmenin özeti, tarihi, sonucu..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">
                {content.length}/5000
              </p>
            </div>

            {/* Hatırlatma */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setReminder}
                  onChange={(e) => setSetReminder(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm font-bold text-on-surface">Hatırlatma Kur</span>
              </label>
              {setReminder && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <input
                    type="text"
                    placeholder={`${propertyTitle} — takip`}
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    className="col-span-2 px-3 py-2 bg-surface-container-lowest rounded-lg text-xs outline-none"
                  />
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="px-3 py-2 bg-surface-container-lowest rounded-lg text-xs outline-none"
                  />
                  <select
                    value={reminderPriority}
                    onChange={(e) => setReminderPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                    className="px-3 py-2 bg-surface-container-lowest rounded-lg text-xs outline-none"
                  >
                    <option value="LOW">Düşük</option>
                    <option value="MEDIUM">Orta</option>
                    <option value="HIGH">Yüksek</option>
                  </select>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container rounded-lg p-3 text-xs">{error}</div>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 p-5 border-t border-outline-variant/20 bg-surface-container-low/50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold rounded-xl text-on-surface-variant hover:bg-surface-container"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="primary-gradient text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Kaydet
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
