import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Üstte gösterilecek lucide ikonu (opsiyonel) */
  icon?: LucideIcon;
  /** Ana başlık — zorunlu */
  title: string;
  /** Açıklayıcı alt metin (opsiyonel) */
  description?: string;
  /** Alt kısımda gösterilecek aksiyon (örn. buton) */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Genel amaçlı boş durum (empty-state) bileşeni.
 *
 * Liste/tablo/grid boş kaldığında ortalı, yuvarlak bir bilgi bloğu gösterir.
 *
 * Kullanım:
 *   <EmptyState icon={Users} title="Kullanıcı bulunamadı" />
 *   <EmptyState icon={Inbox} title="Kayıt yok" description="..." action={<button>Ekle</button>} />
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-on-surface-variant" />
        </div>
      )}
      <p className="text-sm font-bold text-on-surface">{title}</p>
      {description && (
        <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
