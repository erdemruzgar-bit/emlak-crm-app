import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { z } from "zod/v4";

const ROLE_RANK: Record<string, number> = { ADMIN: 3, MANAGER: 2, AGENT: 1 };

const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).default("AGENT"),
  branchId: z.string().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  if (sessionUser.role === "AGENT") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const where: Record<string, unknown> = {};
  if (sessionUser.role === "MANAGER") {
    where.branchId = sessionUser.branchId;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      photoUrl: true,
      canExport: true,
      canImport: true,
      branch: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  const sessionRole = sessionUser.role as string;

  if (sessionRole === "AGENT") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const targetRole = parsed.data.role;

    // MANAGER can only create AGENT users
    if (sessionRole === "MANAGER" && ROLE_RANK[targetRole] >= ROLE_RANK[sessionRole]) {
      return NextResponse.json(
        { error: "Şube Müdürü yalnızca Danışman oluşturabilir" },
        { status: 403 }
      );
    }

    // MANAGER can only assign users to their own branch
    if (sessionRole === "MANAGER") {
      const managerBranchId = sessionUser.branchId as string | undefined;
      if (parsed.data.branchId && parsed.data.branchId !== managerBranchId) {
        return NextResponse.json(
          { error: "Yalnızca kendi şubenize kullanıcı ekleyebilirsiniz" },
          { status: 403 }
        );
      }
      // Auto-assign to manager's branch if not specified
      if (!parsed.data.branchId && managerBranchId) {
        parsed.data.branchId = managerBranchId;
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 409 });
    }

    const { password, ...rest } = parsed.data;
    const passwordHash = await hash(password, 10);

    const newUser = await prisma.user.create({
      data: { ...rest, passwordHash },
      select: { id: true, name: true, email: true, role: true, isActive: true, photoUrl: true, branch: { select: { name: true } }, createdAt: true },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
