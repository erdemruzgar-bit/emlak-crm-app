import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

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

  const role = (token.user as { role?: string } | undefined)?.role;

  if (pathname.startsWith("/settings/audit-log")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  } else if (pathname.startsWith("/settings")) {
    if (role === "AGENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  // /uploads/ dahil — rewrite için middleware'in buraya da girmesi gerekiyor
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
