// Otomatik hatırlatma üretimi — sistem cron'u tarafından çağrılır.
//
// Kurulum (her saat başı):
//   crontab -e
//   0 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
//     http://localhost:3000/api/cron/reminders >> /var/log/emlak-crm-cron.log 2>&1
//
// Üretilen hatırlatmalar:
//   1) Müşteri takip tarihi (nextFollowUpDate) ≤ bugün → atanmış danışmana
//   2) Aktif sözleşme bitimi (endDate) ≤ +7 gün → sözleşmeyi oluşturan kullanıcıya
//
// Duplicate önleme: aynı targetType + targetId + userId kombinasyonu için aktif
// (isDone=false) bir reminder varsa yeniden oluşturulmaz.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  let customerCreated = 0;
  let contractCreated = 0;
  let skipped = 0;

  // ─── 1. Müşteri takip tarihi geçti / bugün ───
  const overdueCustomers = await prisma.customer.findMany({
    where: {
      isAnonymized: false,
      nextFollowUpDate: { lte: now },
      assignedAgentId: { not: null },
      stage: { notIn: ["CLOSED", "LOST"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignedAgentId: true,
      nextFollowUpDate: true,
    },
  });

  for (const c of overdueCustomers) {
    if (!c.assignedAgentId) continue;
    const existing = await prisma.reminder.findFirst({
      where: {
        userId: c.assignedAgentId,
        targetType: "CUSTOMER",
        targetId: c.id,
        isDone: false,
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.reminder.create({
      data: {
        userId: c.assignedAgentId,
        title: `Müşteri takip: ${c.firstName} ${c.lastName}`,
        description: `Bu müşterinin son takip tarihi geçti. İletişime geçmeniz gerekiyor.`,
        dueDate: c.nextFollowUpDate ?? now,
        priority: "HIGH",
        targetType: "CUSTOMER",
        targetId: c.id,
      },
    });
    customerCreated++;
  }

  // ─── 2. Aktif sözleşme bitimi 7 gün içinde ───
  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: now, lte: sevenDaysLater },
    },
    select: {
      id: true,
      title: true,
      endDate: true,
      contractType: true,
      createdById: true,
    },
  });

  for (const ct of expiringContracts) {
    if (!ct.createdById || !ct.endDate) continue;
    const existing = await prisma.reminder.findFirst({
      where: {
        userId: ct.createdById,
        targetType: "CONTRACT",
        targetId: ct.id,
        isDone: false,
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.reminder.create({
      data: {
        userId: ct.createdById,
        title: `Sözleşme bitiyor: ${ct.title}`,
        description: `${ct.contractType} sözleşmesi ${ct.endDate.toLocaleDateString("tr-TR")} tarihinde sona eriyor. Yenileme veya fesih kararı verilmeli.`,
        dueDate: ct.endDate,
        priority: "HIGH",
        targetType: "CONTRACT",
        targetId: ct.id,
      },
    });
    contractCreated++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    created: {
      customer: customerCreated,
      contract: contractCreated,
    },
    skipped,
  });
}

// GET — health check (auth gerektirmez, ama veri döndürmez)
export async function GET() {
  return NextResponse.json({ ok: true, message: "Cron endpoint sadece POST kabul eder" });
}
