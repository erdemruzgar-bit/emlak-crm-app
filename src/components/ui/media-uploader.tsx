"use client";

import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Video, Link2, Plus, Loader2, Star, ArrowLeft, ArrowRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";

export interface MediaItem {
  url: string;
  mediaType: "image" | "video";
  name?: string;
}

interface MediaUploaderProps {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  maxItems?: number;
}

export function MediaUploader({ value, onChange, maxItems = 20 }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function moveItem(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  async function uploadFiles(files: FileList | File[]) {
    setUploadError("");
    const remaining = maxItems - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const results: MediaItem[] = [];

    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          results.push({ url: data.url, mediaType: data.mediaType, name: data.name });
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

  // useCallback'i kaldırdık: uploadFiles inline fonksiyon ve her render'da yeniden
  // yaratılıyor, useCallback faydasız + dep uyuşmazlığı veriyordu.
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const isVideo = /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
    onChange([...value, { url, mediaType: isVideo ? "video" : "image" }]);
    setUrlInput("");
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function setPrimary(index: number) {
    if (index === 0) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Tab Switch */}
      <div className="flex bg-surface-container-low p-1 rounded-xl w-fit">
        <button type="button" onClick={() => setTab("upload")}
          className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            tab === "upload" ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant"
          )}>
          <Upload className="w-4 h-4" />Bilgisayardan Yükle
        </button>
        <button type="button" onClick={() => setTab("url")}
          className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            tab === "url" ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant"
          )}>
          <Link2 className="w-4 h-4" />URL ile Ekle
        </button>
      </div>

      {tab === "upload" ? (
        <div
          key="tab-upload"
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            dragOver ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary hover:bg-surface-container-low/50"
          )}
        >
          <input
            key="upload-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-on-surface-variant">Yükleniyor...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-primary-fixed rounded-2xl flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-on-surface">Fotoğraf veya video yükleyin</p>
                <p className="text-xs text-on-surface-variant mt-1">Sürükleyip bırakın ya da tıklayın</p>
                <p className="text-[10px] text-on-surface-variant/60 mt-1">JPG, PNG, WEBP, GIF, MP4, MOV · Max 100MB</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div key="tab-url" className="flex gap-3">
          <input
            key="url-text-input"
            type="url"
            placeholder="https://... (fotoğraf veya video URL'si)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
            className="flex-1 px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          />
          <button type="button" onClick={addUrl} disabled={!urlInput.trim()}
            className="primary-gradient text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" />Ekle
          </button>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-error bg-error-container px-3 py-2 rounded-lg">{uploadError}</p>
      )}

      {/* Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {value.map((item, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                setDraggingIndex(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverIndex !== i) setDragOverIndex(i);
              }}
              onDragLeave={() => setDragOverIndex((curr) => (curr === i ? null : curr))}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingIndex !== null && draggingIndex !== i) moveItem(draggingIndex, i);
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              className={cn(
                "relative group rounded-2xl overflow-hidden aspect-video bg-surface-container-low cursor-move transition-all",
                draggingIndex === i && "opacity-40 scale-95",
                dragOverIndex === i && draggingIndex !== i && "ring-2 ring-primary scale-105"
              )}
            >
              {item.mediaType === "video" ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container gap-2">
                  <Video className="w-8 h-8 text-primary" />
                  <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-full px-2">
                    {item.name || "Video"}
                  </span>
                  <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                </div>
              ) : (
                <SafeImage src={item.url} alt="" className="object-cover pointer-events-none" />
              )}

              {/* Sıra numarası */}
              <span className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="bg-black/60 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {i + 1}
                </span>
                {i === 0 && (
                  <span className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <Star className="w-2 h-2 fill-current" />Ana
                  </span>
                )}
              </span>

              {/* Drag handle göstergesi */}
              <span className="absolute top-2 right-2 opacity-30 group-hover:opacity-100 transition-opacity bg-black/40 text-white rounded p-0.5 pointer-events-none">
                <GripVertical className="w-3 h-3" />
              </span>

              {/* Type badge */}
              <span className={cn("absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded",
                item.mediaType === "video" ? "bg-tertiary text-white" : "bg-black/50 text-white"
              )}>
                {item.mediaType === "video" ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
              </span>

              {/* Sol / Sağ kaydırma + Ana yap + Sil */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveItem(i, i - 1); }}
                    title="Sola kaydır"
                    className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center shadow">
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                )}
                {i < value.length - 1 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveItem(i, i + 1); }}
                    title="Sağa kaydır"
                    className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center shadow">
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {i > 0 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setPrimary(i); }}
                    title="Ana fotoğraf yap"
                    className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow">
                    <Star className="w-3 h-3" />
                  </button>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); remove(i); }}
                  title="Sil"
                  className="w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {value.length < maxItems && (
            <button type="button"
              onClick={() => tab === "upload" ? fileInputRef.current?.click() : setTab("url")}
              className="aspect-video rounded-2xl border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all">
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-on-surface-variant">
          {value.length} medya · Sıralamak için <strong>sürükle-bırak</strong> ya da{" "}
          <ArrowLeft className="inline w-3 h-3" /> /{" "}
          <ArrowRight className="inline w-3 h-3" /> butonlarını kullanın · Ana fotoğraf için{" "}
          <Star className="inline w-3 h-3" />
        </p>
      )}
    </div>
  );
}
