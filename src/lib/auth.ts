import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { rateLimit, resetRateLimit } from "./rate-limit";
import { createAuditLog } from "./audit";

// Brute force koruması: aynı e-posta için 5 dk içinde max 5 başarısız deneme,
// ardından 15 dk lockout. Doğru girişlerde counter sıfırlanır.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const rlKey = `login:${email}`;

        // Rate limit kontrolü
        const rl = rateLimit({
          key: rlKey,
          max: LOGIN_MAX_ATTEMPTS,
          windowMs: LOGIN_WINDOW_MS,
          lockoutMs: LOGIN_LOCKOUT_MS,
        });
        if (!rl.ok) {
          // NextAuth credentials provider authorize sadece null döndürebilir;
          // hatayı audit'e yaz ve null dön
          await createAuditLog({
            action: "DENIED_EDIT",
            entity: "Login",
            newValue: { email, reason: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec },
          }).catch(() => {});
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            branch: true,
            authorizedBranches: { select: { id: true } },
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // Başarılı girişte counter sıfırla
        resetRateLimit(rlKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
          branchName: user.branch?.name,
          authorizedBranchIds: user.authorizedBranches.map((b) => b.id),
          photoUrl: user.photoUrl,
          canExport: user.canExport,
          canImport: user.canImport,
        };
      },
    }),
  ],
});
