import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canEditAppointment, extractActor } from "@/lib/rbac";
import { z } from "zod/v4";

const appointmentUpdateSchema = z.object({
  title: z.string().optional(),
  type: z.enum(["GOSTERIM", "TOPLANTI", "DIGER"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(),
  customerId: z.string().nullable().optional(),
  propertyId: z.string().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { user: { select: { branchId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }
    const actor = extractActor(session);
    if (!canEditAppointment(actor, existing)) {
      await createAuditLog({
        userId: actor?.id,
        action: "DENIED_EDIT",
        entity: "Appointment",
        entityId: id,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });
      return NextResponse.json({ error: "Bu randevuyu düzenleme yetkiniz yok" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = appointmentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Geçersiz randevu bilgisi";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { startDate, endDate, ...rest } = parsed.data;
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    const user = session.user as unknown as Record<string, unknown>;
    await createAuditLog({
      userId: user.id as string,
      action: "UPDATE",
      entity: "Appointment",
      entityId: id,
      newValue: { status: appointment.status },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(appointment);
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

  const { id } = await params;

  try {
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { user: { select: { branchId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }
    const actor = extractActor(session);
    if (!canEditAppointment(actor, existing)) {
      await createAuditLog({
        userId: actor?.id,
        action: "DENIED_EDIT",
        entity: "Appointment",
        entityId: id,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });
      return NextResponse.json({ error: "Bu randevuyu iptal etme yetkiniz yok" }, { status: 403 });
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    const user = session.user as unknown as Record<string, unknown>;
    await createAuditLog({
      userId: user.id as string,
      action: "DELETE",
      entity: "Appointment",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ message: "Randevu iptal edildi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
