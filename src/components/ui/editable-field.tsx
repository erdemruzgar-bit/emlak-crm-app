"use client";

import { cn } from "@/lib/utils";

// Bir alanı görünüm + düzenleme modunda aynı yükseklik/genişlikte tutan sarmalayıcı.
// Layout hiç değişmez; sadece içerideki input aktif/pasif hale gelir.

interface BaseProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  editing: boolean;
  className?: string;
}

type TextFieldProps = BaseProps & {
  type?: "text" | "email" | "tel" | "number" | "date" | "url";
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  displayFormatter?: (value: string | number | null | undefined) => string;
};

export function EditableText({
  icon: Icon,
  label,
  editing,
  type = "text",
  value,
  onChange,
  placeholder,
  displayFormatter,
  className,
}: TextFieldProps) {
  const display = displayFormatter
    ? displayFormatter(value)
    : value == null || value === "" ? "—" : String(value);

  return (
    <div className={cn(
      "p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 flex items-center gap-3 min-h-[76px] transition-colors",
      editing && "bg-surface-container-lowest ring-2 ring-primary/15",
      className
    )}>
      {Icon && (
        <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-0.5">{label}</p>
        {editing ? (
          <input
            type={type}
            value={value == null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent border-0 p-0 text-sm font-bold text-on-surface outline-none focus:ring-0"
          />
        ) : (
          <p className="text-sm font-bold text-on-surface truncate">{display}</p>
        )}
      </div>
    </div>
  );
}

type SelectOption = { value: string; label: string };

interface SelectFieldProps extends BaseProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function EditableSelect({
  icon: Icon,
  label,
  editing,
  value,
  onChange,
  options,
  placeholder = "Seçiniz",
  className,
}: SelectFieldProps) {
  const current = options.find((o) => o.value === value);
  const display = current?.label ?? "—";

  return (
    <div className={cn(
      "p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 flex items-center gap-3 min-h-[76px] transition-colors",
      editing && "bg-surface-container-lowest ring-2 ring-primary/15",
      className
    )}>
      {Icon && (
        <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-0.5">{label}</p>
        {editing ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-0 p-0 text-sm font-bold text-on-surface outline-none focus:ring-0 cursor-pointer"
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-bold text-on-surface truncate">{display}</p>
        )}
      </div>
    </div>
  );
}

interface TextareaFieldProps extends BaseProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function EditableTextarea({
  icon: Icon,
  label,
  editing,
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
}: TextareaFieldProps) {
  const display = value == null || value === "" ? "—" : value;

  return (
    <div className={cn(
      "p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 flex items-start gap-3 transition-colors",
      editing && "bg-surface-container-lowest ring-2 ring-primary/15",
      className
    )}>
      {Icon && (
        <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0 mt-0.5">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">{label}</p>
        {editing ? (
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full bg-transparent border-0 p-0 text-sm font-bold text-on-surface outline-none focus:ring-0 resize-none"
          />
        ) : (
          <p className="text-sm font-bold text-on-surface whitespace-pre-wrap">{display}</p>
        )}
      </div>
    </div>
  );
}
