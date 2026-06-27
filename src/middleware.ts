import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { moduleForPath } from "@/lib/modules";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/forgot-password"];
// PWA / mobil app metadata için public erişimi gereken dosyalar
const publicFiles = ["/manifest.json", "/icon.svg", "/apple-touch-icon.png", "/favicon.ico", "/robots.txt"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // /uploads/* isteklerini /api/uploads/* rotasına yönlendir.
  // Next.js prod modunda public/ dosyaları runtime'da dinamik serve etmiyor;
  // API rotası disk'ten okuyup döner. DB'deki URL'ler değişmez.
  if (pathname.startsWith("/uploads/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/api" + pathname;
    return NextResponse.rewrite(url);
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // PWA / favicon / manifest gibi statik metadata dosyaları auth-free
  if (publicFiles.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.auth;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = token.user as { role?: string; disabledModules?: string[] } | undefined;
  const role = user?.role;

  if (pathname.startsWith("/settings/audit-log")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  } else if (pathname.startsWith("/settings")) {
    if (role === "AGENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Modül-bazlı yetkilendirme — API rotaları için.
  // ADMIN her zaman geçer; diğer rollerde "/api/<modül>" kapalı bir modüle düşüyorsa 403 JSON döner.
  // (Sayfa kontrolü redirect ile; API kontrolü JSON ile yapılır ki frontend fetch doğru hata alsın.)
  // "/api/customers" -> "/customers" eşlemesiyle modules.ts path'lerine bakılır. Eşleşmeyen
  // (or. /api/users, /api/upload, /api/dashboard[required]) yollar bu kontrolden etkilenmez.
  if (role !== "ADMIN" && pathname.startsWith("/api/")) {
    const matched = moduleForPath(pathname.slice(4));
    if (matched && !matched.required) {
      const disabled = user?.disabledModules ?? [];
      if (disabled.includes(matched.key)) {
        return NextResponse.json({ error: "Bu modüle erişim yetkiniz yok" }, { status: 403 });
      }
    }
  }

  // Modül-bazlı yetkilendirme — sayfa rotaları için (API'ler hariç).
  // ADMIN her zaman geçer; diğer roller için pathname'in eşleştiği modül
  // disabledModules'da varsa /dashboard'a yönlendir.
  if (role !== "ADMIN" && !pathname.startsWith("/api/") && !pathname.startsWith("/_next")) {
    const matched = moduleForPath(pathname);
    if (matched && !matched.required) {
      const disabled = user?.disabledModules ?? [];
      if (disabled.includes(matched.key)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  // /uploads/ dahil — rewrite için middleware'in buraya da girmesi gerekiyor
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
