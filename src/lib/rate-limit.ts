// Basit in-memory rate limiter — login brute force koruması.
//
// Tek sunucu olduğumuz için Redis gerekmiyor. Servis restart olduğunda
// counter temizlenir; kötü niyetli kullanıcı yine yeniden başlamak zorunda
// (en kötü 5 dakika kaybeder).
//
// Kural: aynı key (IP veya email) için son `windowMs` içinde `max` deneme.
// Sınır aşılırsa `lockoutMs` boyunca tüm istekler reddedilir.

interface Bucket {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Tanımlayıcı (IP, email vb.) */
  key: string;
  /** Pencere içinde maksimum deneme sayısı */
  max: number;
  /** Pencere uzunluğu (ms) */
  windowMs: number;
  /** Sınır aşıldığında lockout süresi (ms) */
  lockoutMs: number;
}

export interface RateLimitResult {
  /** İstek izinli mi */
  ok: boolean;
  /** Kaç saniye sonra tekrar denenebilir */
  retryAfterSec?: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(opts.key);

  // Lockout aktif mi?
  if (b && b.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }

  // Pencereyi kaydır
  if (!b || now - b.windowStart > opts.windowMs) {
    buckets.set(opts.key, { count: 1, windowStart: now, lockedUntil: 0 });
    return { ok: true };
  }

  // Aynı pencerede deneme arttır
  b.count += 1;
  if (b.count > opts.max) {
    b.lockedUntil = now + opts.lockoutMs;
    return { ok: false, retryAfterSec: Math.ceil(opts.lockoutMs / 1000) };
  }

  return { ok: true };
}

/** Başarılı giriş sonrası counter'ı sıfırla */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Periyodik temizlik — eski bucket'lar bellekten silinsin (her 10 dk)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.lockedUntil < now && now - b.windowStart > 60 * 60 * 1000) {
        buckets.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}
