import { prisma } from "./prisma";

interface Property {
  id: string;
  price: number;
  propertyType: string;
  city: string | null;
  district: string | null;
  area: number | null;
  rooms: string | null;
  listingType: string;
}

interface Customer {
  id: string;
  stage: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  preferredTypes: string[];
  preferredCities: string[];
  preferredDistricts: string[];
  minArea: number | null;
  maxArea: number | null;
  minRooms: string | null;
  maxRooms: string | null;
  isAnonymized: boolean;
}

// "3+1" → 3 (yatak odası sayısı). Diğer formatlar (örn. "Stüdyo") için 0.
function parseRooms(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/^(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function computeScore(property: Property, customer: Customer): number {
  // Don't match closed/lost customers or anonymized ones
  if (!customer.stage || ["CLOSED", "LOST"].includes(customer.stage)) return 0;
  if (customer.isAnonymized) return 0;

  let score = 0;

  // Budget match (40 pts)
  if (customer.minBudget || customer.maxBudget) {
    const inRange =
      (!customer.minBudget || property.price >= customer.minBudget * 0.9) &&
      (!customer.maxBudget || property.price <= customer.maxBudget * 1.1);
    if (inRange) score += 40;
    else return 0; // Budget mismatch is a hard blocker
  }

  // Property type match (30 pts)
  if (customer.preferredTypes.length > 0) {
    if (customer.preferredTypes.includes(property.propertyType)) score += 30;
    else score -= 10;
  } else {
    score += 15; // no preference = partial match
  }

  // City match (20 pts)
  if (customer.preferredCities.length > 0 && property.city) {
    if (customer.preferredCities.some((c) => property.city!.toLowerCase().includes(c.toLowerCase()))) {
      score += 20;
    } else {
      return 0; // city mismatch is a hard blocker
    }
  } else {
    score += 10;
  }

  // District match (5 pts bonus)
  if (customer.preferredDistricts.length > 0 && property.district) {
    if (customer.preferredDistricts.some((d) => property.district!.toLowerCase().includes(d.toLowerCase()))) {
      score += 5;
    }
  }

  // Area match (10 pts)
  if (property.area) {
    if (customer.minArea && customer.maxArea) {
      if (property.area >= customer.minArea && property.area <= customer.maxArea) score += 10;
    } else if (customer.minArea && property.area >= customer.minArea) {
      score += 5;
    } else if (customer.maxArea && property.area <= customer.maxArea) {
      score += 5;
    } else {
      score += 5; // no area pref = partial
    }
  }

  // Rooms match (10 pts) — "X+1" formatından X (yatak odası) çıkarılır.
  // Hard blocker değil, eşleşmezse penalty (uzun vadede daire kalmasın diye).
  const propRooms = parseRooms(property.rooms);
  const minR = parseRooms(customer.minRooms);
  const maxR = parseRooms(customer.maxRooms);
  if (propRooms !== null && (minR !== null || maxR !== null)) {
    const aboveMin = minR === null || propRooms >= minR;
    const belowMax = maxR === null || propRooms <= maxR;
    if (aboveMin && belowMax) {
      score += 10;
    } else {
      score -= 10; // istenen aralıkta değil, soft penalty
    }
  }

  return Math.max(0, Math.min(110, score));
}

export async function runPropertyMatching(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, price: true, propertyType: true, city: true, district: true, area: true, rooms: true, listingType: true, status: true },
  });

  if (!property || property.status !== "ACTIVE") return;

  const customers = await prisma.customer.findMany({
    where: {
      isAnonymized: false,
      stage: { notIn: ["CLOSED", "LOST"] },
    },
    select: {
      id: true,
      stage: true,
      minBudget: true,
      maxBudget: true,
      preferredTypes: true,
      preferredCities: true,
      preferredDistricts: true,
      minArea: true,
      maxArea: true,
      minRooms: true,
      maxRooms: true,
      isAnonymized: true,
    },
  });

  const MIN_SCORE = 30;

  for (const customer of customers) {
    const score = computeScore(property as Property, customer as Customer);
    if (score >= MIN_SCORE) {
      await prisma.propertyMatch.upsert({
        where: { propertyId_customerId: { propertyId, customerId: customer.id } },
        create: { propertyId, customerId: customer.id, matchScore: score },
        update: { matchScore: score }, // status intentionally not touched — preserve manual INTERESTED / REJECTED
      });
    }
  }
}

export async function runCustomerMatching(customerId: string): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      stage: true,
      minBudget: true,
      maxBudget: true,
      preferredTypes: true,
      preferredCities: true,
      preferredDistricts: true,
      minArea: true,
      maxArea: true,
      minRooms: true,
      maxRooms: true,
      isAnonymized: true,
    },
  });

  if (!customer) return;

  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, price: true, propertyType: true, city: true, district: true, area: true, rooms: true, listingType: true, status: true },
  });

  const MIN_SCORE = 30;

  for (const property of properties) {
    const score = computeScore(property as Property, customer as Customer);
    if (score >= MIN_SCORE) {
      await prisma.propertyMatch.upsert({
        where: { propertyId_customerId: { propertyId: property.id, customerId } },
        create: { propertyId: property.id, customerId, matchScore: score },
        update: { matchScore: score },
      });
    }
  }
}
