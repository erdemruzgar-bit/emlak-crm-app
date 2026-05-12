"use client";

import NextImage from "next/image";

/**
 * `<img>` yerine kullanılacak ince wrapper. next/image avantajlarını sağlar
 * (lazy load, optimal format) ama mevcut layout pattern'lerine (w-full h-full
 * + parent container) uyum sağlar.
 *
 * - `width`/`height` verilirse → sabit boyut (avatar, thumbnail vb.)
 * - verilmezse → `fill` mode (parent'ın `position: relative` olması gerekir)
 *
 * `unoptimized`: Next.js image optimizer'ı atlar. Yerel /uploads/ dosyaları
 * için bu pratik; loader pipeline'ı kurmadan çalışır. Performance penalty
 * minör; ileride remote pattern'ler tanımlanırsa kaldırılır.
 */

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  referrerPolicy?: "no-referrer" | "origin" | "unsafe-url";
  loading?: "eager" | "lazy";
  sizes?: string;
}

export function SafeImage({
  src,
  alt,
  className,
  width,
  height,
  referrerPolicy,
  loading,
  sizes,
}: SafeImageProps) {
  if (!src) return null;

  if (width && height) {
    return (
      <NextImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        referrerPolicy={referrerPolicy}
        loading={loading}
        unoptimized
      />
    );
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      className={className}
      referrerPolicy={referrerPolicy}
      loading={loading}
      sizes={sizes || "(max-width: 768px) 100vw, 50vw"}
      unoptimized
    />
  );
}
