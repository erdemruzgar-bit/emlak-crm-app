import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const createSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Code sadece BÜYÜK harf/rakam/alt çizgi"),
  label: z.string().min(1, "Etiket gerekli").max(40),
  isTenantSide: z.boolean().optional(),
  isOwnerSide: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const items = await prisma.customerTypeCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetki gerekli (ADMIN/MANAGER)" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const item = await prisma.customerTypeCatalog.create({
      data: {
        code: parsed.data.code.trim(),
        label: parsed.data.label.trim(),
        isTenantSide: parsed.data.isTenantSide ?? false,
        isOwnerSide: parsed.data.isOwnerSide ?? false,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      entity: "CustomerTypeCatalog",
      entityId: item.id,
      newValue: { code: item.code, label: item.label },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Bu kod zaten kullanılıyor" }, { status: 409 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
