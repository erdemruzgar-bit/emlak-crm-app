import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hash } from "bcryptjs";
import { z } from "zod/v4";

const ROLE_RANK: Record<string, number> = { ADMIN: 3, MANAGER: 2, AGENT: 1 };

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.email().optional(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").optional(),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).optional(),
  branchId: z.string().optional(),
  authorizedBranchIds: z.array(z.string()).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
  canExport: z.boolean().optional(),
  canImport: z.boolean().optional(),
  disabledModules: z.array(z.string()).optional(),  // src/lib/modules.ts ModuleKey listesi
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  const sessionRole = sessionUser.role as string;
  const sessionId = sessionUser.id as string;

  if (sessionRole === "AGENT") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Get the target user to check their current role
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, branchId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // MANAGER can only edit users with lower rank (AGENT only)
    if (sessionRole === "MANAGER") {
      if (ROLE_RANK[targetUser.role] >= ROLE_RANK[sessionRole]) {
        return NextResponse.json(
          { error: "Bu kullanıcıyı düzenleme yetkiniz yok" },
          { status: 403 }
        );
      }
      // MANAGER can only edit users in their own branch
      if (targetUser.branchId !== (sessionUser.branchId as string)) {
        return NextResponse.json(
          { error: "Yalnızca kendi şubenizdeki kullanıcıları düzenleyebilirsiniz" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Prevent role escalation: cannot assign a role >= your own rank (except ADMIN editing others)
    if (parsed.data.role) {
      const newRoleRank = ROLE_RANK[parsed.data.role];

      // MANAGER cannot assign MANAGER or ADMIN role
      if (sessionRole === "MANAGER" && newRoleRank >= ROLE_RANK[sessionRole]) {
        return NextResponse.json(
          { error: "Bu rolü atama yetkiniz yok" },
          { status: 403 }
        );
      }

      // No one can change their own role
      if (id === sessionId) {
        return NextResponse.json(
          { error: "Kendi rolünüzü değiştiremezsiniz" },
          { status: 403 }
        );
      }
    }

    const { password, canExport, canImport, disabledModules, authorizedBranchIds, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (password) updateData.passwordHash = await hash(password, 10);

    // Excel izinleri ve modül yetkileri sadece ADMIN tarafından değiştirilebilir
    if (sessionRole === "ADMIN") {
      if (canExport !== undefined) updateData.canExport = canExport;
      if (canImport !== undefined) updateData.canImport = canImport;
      if (disabledModules !== undefined) updateData.disabledModules = disabledModules;
    }

    // Yetkili olduğu ek şubeler (M:M)
    if (authorizedBranchIds !== undefined) {
      let allowedIds = authorizedBranchIds;
      // MANAGER yalnızca kendi şubesini ek yetki olarak verebilir
      if (sessionRole === "MANAGER") {
        const managerBranchId = sessionUser.branchId as string | undefined;
        allowedIds = managerBranchId ? allowedIds.filter((id) => id === managerBranchId) : [];
      }
      updateData.authorizedBranches = {
        set: allowedIds.map((bId) => ({ id: bId })),
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true, isActive: true, photoUrl: true, canExport: true, canImport: true, disabledModules: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        authorizedBranches: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    const { passwordHash, ...auditChanges } = updateData;
    await createAuditLog({
      userId: sessionId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      newValue: { ...auditChanges, passwordChanged: !!passwordHash },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  const sessionRole = sessionUser.role as string;
  const sessionId = sessionUser.id as string;

  if (sessionRole !== "ADMIN") {
    return NextResponse.json({ error: "Sadece sistem yöneticisi kullanıcı silebilir" }, { status: 403 });
  }

  const { id } = await params;

  if (id === sessionId) {
    return NextResponse.json({ error: "Kendi hesabınızı pasife alamazsınız" }, { status: 403 });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: sessionId,
      action: "DELETE",
      entity: "User",
      entityId: id,
      newValue: { isActive: false },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ message: "Kullanıcı pasife alındı" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
