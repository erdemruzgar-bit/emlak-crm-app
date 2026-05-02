import { cn } from "@/lib/utils";

/**
 * Genel amaçlı skeleton — yükleme sırasında shimmer efekti veren placeholder.
 *
 * Kullanım:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="h-12 w-full rounded-2xl" />
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-container-low rounded-md",
        className
      )}
    />
  );
}

/**
 * Tablo satırı için hazır skeleton — N adet satır, M adet sütun.
 */
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-outline-variant/10">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Liste/grid kart için hazır skeleton.
 */
export function CardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-16 rounded-xl" />
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Liste/grid için kart kümesi.
 */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Özet kartı (rakam + label) için skeleton.
 */
export function StatSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/10 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-12" />
      </div>
    </div>
  );
}
