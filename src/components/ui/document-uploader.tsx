"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, FileText, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentItem {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  category?: string;
}

interface DocumentUploaderProps {
  value: DocumentItem[];
  onChange: (items: DocumentItem[]) => void;
  folder?: string; // uploads altında alt klasör (örn: "contracts")
  maxItems?: number;
  accept?: string;
  categoryOptions?: { value: string; label: string }[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({
  value,
  onChange,
  folder = "",
  maxItems = 20,
  accept = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png",
  categoryOptions,
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setUploadError("");
    const remaining = maxItems - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const results: DocumentItem[] = [];

    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      if (folder) fd.append("folder", folder);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          results.push({
            url: data.url,
            name: data.name,
            size: data.size,
            mimeType: data.mimeType,
            category: categoryOptions?.[0]?.value,
          });
        } else {
          setUploadError(data.error || "Yükleme hatası");
        }
      } catch {
        setUploadError("Bağlantı hatası");
      }
    }

    if (results.length > 0) onChange([...value, ...results]);
    setUploading(false);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateCategory(index: number, category: string) {
    const next = [...value];
    next[index] = { ...next[index], category };
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-outline-variant hover:border-primary hover:bg-surface-container-low/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm font-medium text-on-surface-variant">Yükleniyor...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-bold text-on-surface">Doküman yükleyin</p>
            <p className="text-[11px] text-on-surface-variant">
              PDF, Word, JPG, PNG · Max 100MB · Sürükle-bırak veya tıkla
            </p>
          </>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-error bg-error-container px-3 py-2 rounded-lg">{uploadError}</p>
      )}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl"
            >
              <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {formatBytes(item.size)} · {item.mimeType}
                </p>
              </div>
              {categoryOptions && categoryOptions.length > 0 && (
                <select
                  value={item.category || categoryOptions[0].value}
                  onChange={(e) => updateCategory(i, e.target.value)}
                  className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium border-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {categoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container"
                title="İndir"
              >
                <Download className="w-4 h-4 text-on-surface-variant" />
              </a>
              <button
                type="button"
                onClick={() => remove(i)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error-container"
                title="Kaldır"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
