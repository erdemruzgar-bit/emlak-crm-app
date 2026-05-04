import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { propertyCreateSchema } from "@/lib/validations/property";
import { runPropertyMatching } from "@/lib/matching";
import { extractActor, propertyListFilter } from "@/lib/rbac";

// GET /api/properties
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const listingType = searchParams.get("listingType") || "";
  const propertyType = searchParams.get("propertyType") || "";
  const city = searchParams.get("city") || "";
  const status = searchParams.get("status") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const rooms = searchParams.get("rooms") || "";
  const minArea = searchParams.get("minArea") || "";
  const maxArea = searchParams.get("maxArea") || "";
  // Track B: yeni filtreler
  const projectId = searchParams.get("projectId") || "";
  const blockId = searchParams.get("blockId") || "";
  const usageType = searchParams.get("usageType") || "";
  const occupancyStatus = searchParams.get("occupancyStatus") || "";
  const ownerCitizenship = searchParams.get("ownerCitizenship") || "";
  const isCitizenshipEligible = searchParams.get("isCitizenshipEligible") || "";
  const assignedAgentId = searchParams.get("assignedAgentId") || "";
  const branchId = searchParams.get("branchId") || "";

  const actor = extractActor(session);
  const where: Record<string, unknown> = { ...propertyListFilter(actor) };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }

  if (listingType) where.listingType = listingType;
  if (propertyType) where.propertyType = propertyType;
  if (city) where.city = city;
  if (status) where.status = status;
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }
  if (rooms) where.rooms = rooms;
  if (minArea || maxArea) {
    where.area = {
      ...(minArea ? { gte: parseFloat(minArea) } : {}),
      ...(maxArea ? { lte: parseFloat(maxArea) } : {}),
    };
  }
  if (projectId) where.projectId = projectId;
  if (blockId) where.blockId = blockId;
  if (usageType) where.usageType = usageType;
  if (occupancyStatus) where.occupancyStatus = occupancyStatus;
  if (ownerCitizenship) where.ownerCitizenship = ownerCitizenship;
  if (isCitizenshipEligible === "true") where.isCitizenshipEligible = true;
  else if (isCitizenshipEligible === "false") where.isCitizenshipEligible = false;
  if (assignedAgentId) where.assignedAgentId = assignedAgentId;
  // GÜVENLIK: branchId query param ile AGENT'ın şube izolasyonu bypass edilemez.
  // ADMIN ve MANAGER tüm şubeleri filtreleyebilir; AGENT sadece yetkili olduğu şubeler.
  if (branchId) {
    if (actor && (actor.role === "ADMIN" || actor.role === "MANAGER" || actor.branchIds.includes(branchId))) {
      where.branchId = branchId;
    }
    // Aksi halde branchId filtresi sessizce yoksayılır — propertyListFilter()
    // ile gelen { branchId: { in: actor.branchIds } } izolasyonu korunur.
  }

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
  const allowedSort = ["createdAt", "price", "area"];
  const orderField = allowedSort.includes(sortBy) ? sortBy : "createdAt";

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        assignedAgent: { select: { id: true, name: true } },
        branch: { select: { name: true } },
        project: { select: { id: true, name: true } },
        block: { select: { id: true, name: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({
    properties,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/properties
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = propertyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const user = session.user as unknown as Record<string, unknown>;

  const property = await prisma.property.create({
    data: {
      ...parsed.data,
      assignedAgentId: parsed.data.assignedAgentId || (user.id as string),
      branchId: parsed.data.branchId || (user.branchId as string),
    },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "CREATE",
    entity: "Property",
    entityId: property.id,
    newValue: { title: property.title, price: property.price },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  // Run matching in background (don't await)
  runPropertyMatching(property.id).catch(() => {});

  return NextResponse.json(property, { status: 201 });
}
