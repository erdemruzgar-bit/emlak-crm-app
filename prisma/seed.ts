import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://erdemruzgar@localhost:5432/emlak_crm",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Şubeler
  const kadikoy = await prisma.branch.create({
    data: { name: "Kadıköy Şubesi", address: "Caferağa Mah. Moda Cad. No:15", phone: "0216 345 67 89" },
  });
  const besiktas = await prisma.branch.create({
    data: { name: "Beşiktaş Şubesi", address: "Sinanpaşa Mah. Beşiktaş Cad. No:22", phone: "0212 234 56 78" },
  });

  // Kullanıcılar
  const passwordHash = await hash("123456", 10);

  await prisma.user.create({
    data: { email: "admin@emlakcrm.com", passwordHash, name: "Sistem Yöneticisi", role: "ADMIN", branchId: kadikoy.id },
  });
  await prisma.user.create({
    data: { email: "mudur@emlakcrm.com", passwordHash, name: "Ayşe Yılmaz", role: "MANAGER", branchId: kadikoy.id },
  });
  const agent1 = await prisma.user.create({
    data: { email: "ahmet@emlakcrm.com", passwordHash, name: "Ahmet Kaya", role: "AGENT", branchId: kadikoy.id },
  });
  const agent2 = await prisma.user.create({
    data: { email: "mehmet@emlakcrm.com", passwordHash, name: "Mehmet Demir", role: "AGENT", branchId: besiktas.id },
  });

  // Demo müşteriler (zengin talep profilleri)
  const customer1 = await prisma.customer.create({
    data: {
      firstName: "Ali", lastName: "Veli", email: "ali@email.com", phone: "0532 111 22 33",
      customerType: "BUYER", source: "internet", assignedAgentId: agent1.id, branchId: kadikoy.id,
      stage: "ACTIVE", urgency: "HIGH",
      minBudget: 5000000, maxBudget: 10000000, budgetCurrency: "TRY",
      financingMethod: "KREDI", preApprovalStatus: "APPROVED", downPaymentPercent: 30,
      preferredTypes: ["DAIRE", "VILLA"], preferredCities: ["İstanbul"], preferredDistricts: ["Kadıköy", "Üsküdar"],
      minArea: 120, maxArea: 200, minRooms: "3+1", maxRooms: "4+1",
      preferredFeatures: ["Otopark", "Asansör", "Balkon", "Manzara"],
      tags: ["VIP", "Yatırımcı"],
      notesSummary: "Deniz manzaralı, yeni bina tercih ediyor. Kredisi onaylı.",
      lastContactDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      desiredMoveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      consents: {
        createMany: {
          data: [
            { consentType: "ACIK_RIZA", consentText: "Kişisel verilerimin işlenmesine açık rıza veriyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "AYDINLATMA", consentText: "KVKK aydınlatma metnini okudum. Verilerimin grubumuzun tüm şubelerindeki yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceğini kabul ediyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "PAZARLAMA", consentText: "Pazarlama iletişimine izin veriyorum.", isGranted: true, grantedAt: new Date() },
          ],
        },
      },
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Fatma", lastName: "Demir", email: "fatma@email.com", phone: "0533 444 55 66",
      customerType: "SELLER", source: "referans", assignedAgentId: agent1.id, branchId: kadikoy.id,
      stage: "QUALIFIED", urgency: "MEDIUM",
      minBudget: 8000000, maxBudget: 12000000,
      preferredTypes: ["DAIRE"], preferredCities: ["İstanbul"], preferredDistricts: ["Kadıköy"],
      tags: ["Satıcı"],
      notesSummary: "Moda'daki 3+1 dairesini satmak istiyor. Acele etmiyor.",
      lastContactDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      consents: {
        createMany: {
          data: [
            { consentType: "ACIK_RIZA", consentText: "Kişisel verilerimin işlenmesine açık rıza veriyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "AYDINLATMA", consentText: "KVKK aydınlatma metnini okudum. Verilerimin grubumuzun tüm şubelerindeki yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceğini kabul ediyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "PAZARLAMA", consentText: "Pazarlama iletişimine izin veriyorum.", isGranted: false },
          ],
        },
      },
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Zeynep", lastName: "Aksoy", email: "zeynep@email.com", phone: "0535 777 88 99",
      customerType: "BUYER", source: "sahibinden", assignedAgentId: agent2.id, branchId: besiktas.id,
      stage: "SHOWING", urgency: "URGENT",
      minBudget: 15000000, maxBudget: 25000000, budgetCurrency: "TRY",
      financingMethod: "NAKIT",
      preferredTypes: ["VILLA"], preferredCities: ["İstanbul"], preferredDistricts: ["Beşiktaş", "Sarıyer"],
      minArea: 250, maxArea: 500, minRooms: "4+1",
      preferredFeatures: ["Havuz", "Bahçe", "Güvenlik", "Otopark", "Manzara"],
      tags: ["VIP", "Acil", "Nakit"],
      notesSummary: "Nakit alıcı, havuzlu villa arıyor. 2 hafta içinde karar verecek.",
      lastContactDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      desiredMoveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      consents: {
        createMany: {
          data: [
            { consentType: "ACIK_RIZA", consentText: "Kişisel verilerimin işlenmesine açık rıza veriyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "AYDINLATMA", consentText: "KVKK aydınlatma metnini okudum. Verilerimin grubumuzun tüm şubelerindeki yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceğini kabul ediyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "PAZARLAMA", consentText: "Pazarlama iletişimine izin veriyorum.", isGranted: true, grantedAt: new Date() },
          ],
        },
      },
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Emre", lastName: "Yıldız", email: "emre@email.com", phone: "0537 222 33 44",
      customerType: "TENANT", source: "hepsiemlak", assignedAgentId: agent2.id, branchId: besiktas.id,
      stage: "LEAD", urgency: "LOW",
      minBudget: 15000, maxBudget: 30000,
      preferredTypes: ["DAIRE"], preferredCities: ["İstanbul"], preferredDistricts: ["Kadıköy", "Ataşehir"],
      minArea: 60, maxArea: 100, minRooms: "2+1", maxRooms: "3+1",
      preferredFeatures: ["Asansör", "Metro Yakın"],
      tags: ["İlk Kiracı"],
      notesSummary: "Üniversite mezunu, ilk kez kiralık arıyor.",
      lastContactDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      consents: {
        createMany: {
          data: [
            { consentType: "ACIK_RIZA", consentText: "Kişisel verilerimin işlenmesine açık rıza veriyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "AYDINLATMA", consentText: "KVKK aydınlatma metnini okudum. Verilerimin grubumuzun tüm şubelerindeki yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceğini kabul ediyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "PAZARLAMA", consentText: "Pazarlama iletişimine izin veriyorum.", isGranted: false },
          ],
        },
      },
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Can", lastName: "Türkoğlu", email: "can@sirket.com", phone: "0530 999 00 11",
      customerType: "BUYER", source: "walkin", assignedAgentId: agent1.id, branchId: kadikoy.id,
      stage: "OFFER", urgency: "HIGH",
      minBudget: 20000000, maxBudget: 35000000, budgetCurrency: "TRY",
      financingMethod: "NAKIT", preApprovalStatus: "NONE",
      preferredTypes: ["ISYERI", "DAIRE"], preferredCities: ["İstanbul"], preferredDistricts: ["Ataşehir", "Kadıköy"],
      minArea: 200, maxArea: 400,
      preferredFeatures: ["Otopark", "Güvenlik", "Asansör"],
      tags: ["Kurumsal", "Yatırımcı"],
      notesSummary: "Şirket adına yatırım amaçlı alıyor. 2 mülk için teklif verdi.",
      lastContactDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      consents: {
        createMany: {
          data: [
            { consentType: "ACIK_RIZA", consentText: "Kişisel verilerimin işlenmesine açık rıza veriyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "AYDINLATMA", consentText: "KVKK aydınlatma metnini okudum. Verilerimin grubumuzun tüm şubelerindeki yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceğini kabul ediyorum.", isGranted: true, grantedAt: new Date() },
            { consentType: "PAZARLAMA", consentText: "Pazarlama iletişimine izin veriyorum.", isGranted: true, grantedAt: new Date() },
          ],
        },
      },
    },
  });

  // Demo ilanlar
  await prisma.property.create({
    data: {
      title: "Kadıköy Moda'da Deniz Manzaralı 3+1 Daire",
      listingType: "SATILIK", propertyType: "DAIRE", price: 8500000, currency: "TRY",
      area: 145, rooms: "3+1", bathrooms: 2, floor: 5, totalFloors: 8, age: 3,
      heating: "dogalgaz", city: "İstanbul", district: "Kadıköy", neighborhood: "Moda",
      description: "Denize yürüme mesafesinde, full manzaralı, lüks daire.",
      status: "ACTIVE", ownerId: customer1.id, assignedAgentId: agent1.id, branchId: kadikoy.id,
    },
  });

  await prisma.property.create({
    data: {
      title: "Beşiktaş Merkez'de Kiralık 2+1 Daire",
      listingType: "KIRALIK", propertyType: "DAIRE", price: 25000, currency: "TRY",
      area: 95, rooms: "2+1", bathrooms: 1, floor: 3, totalFloors: 6, age: 10,
      heating: "kombi", city: "İstanbul", district: "Beşiktaş", neighborhood: "Sinanpaşa",
      description: "Merkezi konumda, ulaşıma yakın, bakımlı daire.",
      status: "ACTIVE", assignedAgentId: agent1.id, branchId: besiktas.id,
    },
  });

  await prisma.property.create({
    data: {
      title: "Ataşehir'de Satılık Villa",
      listingType: "SATILIK", propertyType: "VILLA", price: 22000000, currency: "TRY",
      area: 350, rooms: "5+2", bathrooms: 3, floor: 1, totalFloors: 3, age: 1,
      heating: "merkezi", city: "İstanbul", district: "Ataşehir", neighborhood: "Küçükbakkalköy",
      description: "Havuzlu, bahçeli, sıfır villa.",
      status: "ACTIVE", assignedAgentId: agent1.id, branchId: kadikoy.id,
    },
  });

  console.log("Seed tamamlandı! 5 müşteri, 3 ilan, 4 kullanıcı, 2 şube oluşturuldu.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
