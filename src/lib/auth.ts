import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { branch: true },
        });

        if (!user || !user.isActive) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
          branchName: user.branch?.name,
          photoUrl: user.photoUrl,
          canExport: user.canExport,
          canImport: user.canImport,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          role: "ADMIN" | "MANAGER" | "AGENT";
          branchId: string | null;
          branchName: string | null;
          photoUrl: string | null;
          canExport: boolean;
          canImport: boolean;
        };
        token.role = u.role;
        token.branchId = u.branchId;
        token.branchName = u.branchName;
        token.photoUrl = u.photoUrl;
        token.canExport = u.canExport ?? false;
        token.canImport = u.canImport ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any;
        u.role = token.role;
        u.branchId = token.branchId;
        u.branchName = token.branchName;
        u.photoUrl = token.photoUrl;
        u.canExport = token.canExport;
        u.canImport = token.canImport;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
