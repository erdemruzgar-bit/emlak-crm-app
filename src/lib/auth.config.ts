import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          role: "ADMIN" | "MANAGER" | "AGENT";
          branchId: string | null;
          branchName: string | null;
          authorizedBranchIds?: string[];
          photoUrl: string | null;
          canExport: boolean;
          canImport: boolean;
        };
        token.role = u.role;
        token.branchId = u.branchId;
        token.branchName = u.branchName;
        token.authorizedBranchIds = u.authorizedBranchIds ?? [];
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
        u.authorizedBranchIds = (token.authorizedBranchIds as string[]) ?? [];
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
} satisfies NextAuthConfig;
