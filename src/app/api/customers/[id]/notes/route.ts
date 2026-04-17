import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Not içeriği gerekli" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  const user = session.user as unknown as Record<string, unknown>;

  const note = await prisma.customerNote.create({
    data: {
      content,
      customerId: id,
      userId: user.id as string,
    },
    include: { user: { select: { name: true } } },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "CREATE",
    entity: "CustomerNote",
    entityId: note.id,
    newValue: { customerId: id, content },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(note, { status: 201 });
}
