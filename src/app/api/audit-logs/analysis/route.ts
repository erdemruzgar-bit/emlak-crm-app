import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Kullanıcı Adli İnceleme — bir kullanıcının denetim izinin özet analizi.
// SADECE ADMIN. Salt-okunur. Hassas alan (telefon/TC) DÖNDÜRMEZ; silme özetinde
// yalnızca tanımlayıcı etiket (ad/başlık/kod) gösterilir.

// oldValue JSON'undan güvenli (PII'siz) bir etiket çıkar.
function safeLabel(v: string | null): string {
  if (!v) return "";
  try {
    const o = JSON.parse(v) as Record<string, unknown>;
    if (o.title) return String(o.title);
    if (o.firstName || o.lastName) return `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim();
    if (o.name) return String(o.name);
    if (o.code) return String(o.code);
    if (o.isActive !== undefined) return `isActive=${o.isActive}`;
    return "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionUser = session.user as unknown as Record<string, unknown>;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const [total, byActionRaw, byEntActRaw, deletesRaw, allTs, deactRaw] = await Promise.all([
    prisma.auditLog.count({ where: { userId } }),
    prisma.auditLog.groupBy({ by: ["action"], where: { userId }, _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["entity", "action"], where: { userId }, _count: { _all: true } }),
    prisma.auditLog.findMany({
      where: { userId, action: "DELETE" },
      orderBy: { timestamp: "desc" },
      take: 200,
      select: { entity: true, entityId: true, timestamp: true, ipAddress: true, oldValue: true },
    }),
    prisma.auditLog.findMany({ where: { userId }, select: { timestamp: true }, orderBy: { timestamp: "asc" } }),
    // Hesabın pasife alınması (User entity'de DELETE, entityId = bu kullanıcı)
    prisma.auditLog.findMany({
      where: { entity: "User", entityId: userId, action: "DELETE" },
      orderBy: { timestamp: "desc" },
      take: 1,
      select: { timestamp: true },
    }),
  ]);

  const byAction = byActionRaw
    .map((r) => ({ action: r.action, count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const byEntityAction = byEntActRaw
    .map((r) => ({ entity: r.entity, action: r.action, count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const deletes = deletesRaw.map((d) => ({
    entity: d.entity,
    entityId: d.entityId,
    timestamp: d.timestamp,
    ipAddress: d.ipAddress,
    label: safeLabel(d.oldValue),
  }));

  // Günlük etkinlik (tarih -> adet)
  const dayMap: Record<string, number> = {};
  for (const a of allTs) {
    const day = a.timestamp.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }
  const dailyCounts = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const deleteCount = byAction.find((a) => a.action === "DELETE")?.count ?? 0;

  return NextResponse.json({
    user,
    total,
    deleteCount,
    byAction,
    byEntityAction,
    deletes,
    firstActivity: allTs.length ? allTs[0].timestamp : null,
    lastActivity: allTs.length ? allTs[allTs.length - 1].timestamp : null,
    dailyCounts,
    deactivatedAt: deactRaw.length ? deactRaw[0].timestamp : null,
  });
}
