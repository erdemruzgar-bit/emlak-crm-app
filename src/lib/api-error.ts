/**
 * API hata cevabını kullanıcıya gösterilebilir tek bir metne çevirir.
 *
 * Route'lar zod hatasını ham issue dizisi olarak döndürüyor
 * (örn. src/app/api/customers/route.ts:146 -> `{ error: parsed.error.issues }`).
 * Formlar bunu `JSON.stringify` ile bastığında kullanıcı ekranda
 * `[{"code":"custom","path":["phone"],"message":"..."}]` görüyordu.
 *
 * Kalıp, settings/users/page.tsx'te zaten kanıtlanmıştı; burada tek yere
 * toplandı ki yeni formlar aynı hatayı tekrar üretmesin.
 */
export function formatApiError(error: unknown, fallback = "Bir hata oluştu"): string {
  if (typeof error === "string" && error.trim()) return error;

  // zod issue dizisi — mesajları " • " ile birleştir
  if (Array.isArray(error)) {
    const joined = error
      .map((i) => (i && typeof i === "object" ? String((i as { message?: unknown }).message ?? "") : String(i ?? "")))
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" • ");
    if (joined) return joined;
  }

  if (error && typeof error === "object") {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  return fallback;
}

/**
 * `res.json()` başarısız olabilir (HTML hata sayfası, boş gövde, proxy timeout).
 * O durumda kullanıcı hiçbir şey görmeden formda kalıyordu — HTTP durumunu göster.
 */
export async function readApiError(res: Response, fallback = "Bir hata oluştu"): Promise<string> {
  try {
    const data = await res.json();
    return formatApiError(data?.error, fallback);
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}
