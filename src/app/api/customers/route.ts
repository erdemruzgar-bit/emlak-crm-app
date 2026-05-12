import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { customerCreateSchema } from "@/lib/validations/customer";

// GET /api/customers — List customers
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const source = searchParams.get("source") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const stage = searchParams.get("stage") || "";
  const urgency = searchParams.get("urgency") || "";
  const minBudget = searchParams.get("minBudget") || "";
  const maxBudget = searchParams.get("maxBudget") || "";
  const preferredCity = searchParams.get("preferredCity") || "";
  const preferredDistrict = searchParams.get("preferredDistrict") || "";
  const preferredType = searchParams.get("preferredType") || "";
  const minArea = searchParams.get("minArea") || "";
  const maxArea = searchParams.get("maxArea") || "";
  const rooms = searchParams.get("rooms") || ""; // hedef oda sayısı (ör. "2+1")
  const tags = searchParams.get("tags") || "";
  const hasOverdueFollowUp = searchParams.get("hasOverdueFollowUp") || "";
  const lastContactDays = searchParams.get("lastContactDays") || "";
  const assignedAgentId = searchParams.get("assignedAgentId") || "";
  const branchId = searchParams.get("branchId") || "";
  const interestedProjectId = searchParams.get("interestedProjectId") || "";

  const where: Record<string, unknown> = {};

  // Müşteriler tüm şubelerde ortak; ek rol filtresi yok

  // Search
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (type) {
    where.customerType = type;
  }

  if (source) where.source = source;
  if (stage) where.stage = stage;
  if (urgency) where.urgency = urgency;
  if (minBudget || maxBudget) {
    where.maxBudget = {
      ...(minBudget ? { gte: parseFloat(minBudget) } : {}),
      ...(maxBudget ? { lte: parseFloat(maxBudget) } : {}),
    };
  }
  if (preferredCity) where.preferredCities = { has: preferredCity };
  if (preferredDistrict) where.preferredDistricts = { has: preferredDistrict };
  if (preferredType) where.preferredTypes = { has: preferredType };
  // Müşterinin tercih aralığı verilen min/max ile kesişiyor mu?
  // Müşteri minArea-maxArea istiyor; biz "müşteri en az X m² istiyor" diye sorgularsak minArea filtresi
  if (minArea) where.minArea = { gte: parseFloat(minArea) };
  if (maxArea) where.maxArea = { lte: parseFloat(maxArea) };
  // Tercih edilen oda — minRooms eşitliği ile basit eşleşme
  if (rooms) where.minRooms = rooms;
  if (assignedAgentId) where.assignedAgentId = assignedAgentId;
  if (branchId) where.branchId = branchId;
  if (interestedProjectId) {
    where.interestedProjects = { some: { projectId: interestedProjectId } };
  }
  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) where.tags = { hasSome: tagList };
  }
  if (hasOverdueFollowUp === "true") {
    where.nextFollowUpDate = { lt: new Date() };
  }
  if (lastContactDays) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(lastContactDays));
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { lastContactDate: { lt: daysAgo } },
      { lastContactDate: null },
    ];
  }

  where.isAnonymized = false;

  const allowedSortFields = ["createdAt", "firstName", "lastName", "customerType"];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const orderDir = sortOrder === "asc" ? "asc" : "desc";

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        assignedAgent: { select: { name: true } },
        branch: { select: { name: true } },
        _count: { select: { consents: true } },
      },
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/customers — Create customer
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
  const body = await req.json();
  const parsed = customerCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { consents, tcKimlikNo, interestedProjectIds, ...data } = parsed.data;
  const user = session.user as unknown as Record<string, unknown>;

  const customer = await prisma.customer.create({
    data: {
      ...data,
      tcKimlikNo: tcKimlikNo ? encrypt(tcKimlikNo) : null,
      assignedAgentId: data.assignedAgentId || (user.id as string),
      createdById: user.id as string,
      branchId: data.branchId || (user.branchId as string),
      ...(interestedProjectIds && interestedProjectIds.length > 0
        ? {
            interestedProjects: {
              create: Array.from(new Set(interestedProjectIds)).map((projectId) => ({
                projectId,
                addedById: user.id as string,
              })),
            },
          }
        : {}),
      consents: {
        createMany: {
          data: [
            {
              consentType: "ACIK_RIZA",
              consentText: "Kişisel verilerimin işlenmesine açık rıza veriyorum.",
              isGranted: consents.acikRiza,
              grantedAt: consents.acikRiza ? new Date() : null,
              ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            },
            {
              consentType: "AYDINLATMA",
              consentText: "KVKK aydınlatma metnini okudum ve anladım.",
              isGranted: consents.aydinlatma,
              grantedAt: consents.aydinlatma ? new Date() : null,
              ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            },
            {
              consentType: "PAZARLAMA",
              consentText: "Pazarlama amaçlı iletişim kurulmasına izin veriyorum.",
              isGranted: consents.pazarlama,
              grantedAt: consents.pazarlama ? new Date() : null,
              ipAddress: req.headers.get("x-forwarded-for") || "unknown",
            },
          ],
        },
      },
    },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "CREATE",
    entity: "Customer",
    entityId: customer.id,
    newValue: { firstName: customer.firstName, lastName: customer.lastName },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
