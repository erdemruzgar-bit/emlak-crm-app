import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { propertyCreateSchema } from "@/lib/validations/property";

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

  const user = session.user as unknown as Record<string, unknown>;
  const where: Record<string, unknown> = {};

  if (user.role === "AGENT") {
    where.assignedAgentId = user.id;
  } else if (user.role === "MANAGER") {
    where.branchId = user.branchId;
  }

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

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        assignedAgent: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
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

  return NextResponse.json(property, { status: 201 });
}
