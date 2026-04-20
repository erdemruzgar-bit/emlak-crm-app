import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const attachmentCreateSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  category: z
    .enum([
      "KONTRAT_PDF",
      "KOMISYON_SOZLESMESI",
      "TAPU",
      "KIMLIK",
      "DEPOZITO_DEKONTU",
      "EK_DOKUMAN",
    ])
    .default("EK_DOKUMAN"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = extractActor(session);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, branchId: true, createdById: true },
    });

    if (!contract) {
      return NextResponse.json({ error: "Sözleşme bulunamadı" }, { status: 404 });
    }

    // Erişim kontrolü: ADMIN/MANAGER şube veya oluşturan
    const canAccess =
      actor.role === "ADMIN" ||
      (actor.role === "MANAGER" && actor.branchId === contract.branchId) ||
      contract.createdById === actor.id;

    if (!canAccess) {
      return NextResponse.json({ error: "Bu sözleşmeye eklenti yükleme yetkiniz yok" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = attachmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const attachment = await prisma.contractAttachment.create({
      data: {
        contractId: id,
        ...parsed.data,
        uploadedById: actor.id,
      },
      include: { uploadedBy: { select: { name: true } } },
    });

    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      entity: "ContractAttachment",
      entityId: attachment.id,
      newValue: { contractId: id, fileName: attachment.fileName, category: attachment.category },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
