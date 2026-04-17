import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { appointmentCreateSchema } from "@/lib/validations/appointment";

// GET /api/appointments
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const user = session.user as unknown as Record<string, unknown>;
  const where: Record<string, unknown> = {};

  if (user.role === "AGENT") {
    where.userId = user.id;
  }

  if (start && end) {
    where.startDate = { gte: new Date(start) };
    where.endDate = { lte: new Date(end) };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      property: { select: { id: true, title: true } },
      customer: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(appointments);
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = appointmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const user = session.user as unknown as Record<string, unknown>;

  const appointment = await prisma.appointment.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      userId: user.id as string,
    },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "CREATE",
    entity: "Appointment",
    entityId: appointment.id,
    newValue: { title: appointment.title, type: appointment.type },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(appointment, { status: 201 });
}
