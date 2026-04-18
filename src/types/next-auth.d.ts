import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MANAGER" | "AGENT";
      branchId: string | null;
      branchName: string | null;
      photoUrl: string | null;
      canExport: boolean;
      canImport: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "MANAGER" | "AGENT";
    branchId: string | null;
    branchName: string | null;
    photoUrl: string | null;
    canExport: boolean;
    canImport: boolean;
  }
}
