import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { canImportData, extractActor } from "@/lib/rbac";

// Örnek satır tipi — tüm alanlar opsiyonel (boş bırakılabilir)
interface TemplateRow {
  "Ad": string;
  "Soyad": string;
  "Tip": string;
  "Aşama": string;
  "Aciliyet": string;
  "Telefon": string;
  "E-posta": string;
  "Adres": string;
  "Kaynak": string;
  "Min Bütçe": string | number;
  "Max Bütçe": string | number;
  "Tercih Tipler": string;
  "Tercih Şehirler": string;
  "Tercih İlçeler": string;
  "Min m²": string | number;
  "Max m²": string | number;
  "Min Oda": string;
  "Max Oda": string;
  "Etiketler": string;
  "Özet Not": string;
  "Son İletişim": string;
  "Sonraki Takip": string;
}

const columns: ColumnDef<TemplateRow>[] = [
  { key: "Ad", header: "Ad", width: 16 },
  { key: "Soyad", header: "Soyad", width: 16 },
  { key: "Tip", header: "Tip", width: 14 },
  { key: "Aşama", header: "Aşama", width: 14 },
  { key: "Aciliyet", header: "Aciliyet", width: 12 },
  { key: "Telefon", header: "Telefon", width: 18 },
  { key: "E-posta", header: "E-posta", width: 24 },
  { key: "Adres", header: "Adres", width: 30 },
  { key: "Kaynak", header: "Kaynak", width: 14 },
  { key: "Min Bütçe", header: "Min Bütçe", width: 14 },
  { key: "Max Bütçe", header: "Max Bütçe", width: 14 },
  { key: "Tercih Tipler", header: "Tercih Tipler", width: 20 },
  { key: "Tercih Şehirler", header: "Tercih Şehirler", width: 20 },
  { key: "Tercih İlçeler", header: "Tercih İlçeler", width: 20 },
  { key: "Min m²", header: "Min m²", width: 10 },
  { key: "Max m²", header: "Max m²", width: 10 },
  { key: "Min Oda", header: "Min Oda", width: 10 },
  { key: "Max Oda", header: "Max Oda", width: 10 },
  { key: "Etiketler", header: "Etiketler", width: 20 },
  { key: "Özet Not", header: "Özet Not", width: 30 },
  { key: "Son İletişim", header: "Son İletişim", width: 14 },
  { key: "Sonraki Takip", header: "Sonraki Takip", width: 14 },
];

export async function GET() {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canImportData(actor)) {
    return NextResponse.json({ error: "Excel içe aktarma yetkiniz yok" }, { status: 403 });
  }

  // Catalog'dan Türkçe tip etiketlerini al (Alıcı, Satıcı, ...)
  const catalog = await prisma.customerTypeCatalog.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const tipOrnekleri = catalog.map((c) => c.label).slice(0, 3).join(" / ") || "Alıcı / Satıcı / Kiracı";

  const examples: TemplateRow[] = [
    {
      "Ad": "Ayşe",
      "Soyad": "Yılmaz",
      "Tip": catalog[0]?.label || "Alıcı",
      "Aşama": "Aday",
      "Aciliyet": "Orta",
      "Telefon": "0532 123 45 67",
      "E-posta": "ayse@ornek.com",
      "Adres": "Kadıköy / İstanbul",
      "Kaynak": "Referans",
      "Min Bütçe": 2000000,
      "Max Bütçe": 3500000,
      "Tercih Tipler": "Daire, Villa",
      "Tercih Şehirler": "İstanbul",
      "Tercih İlçeler": "Kadıköy, Üsküdar",
      "Min m²": 90,
      "Max m²": 150,
      "Min Oda": "2+1",
      "Max Oda": "3+1",
      "Etiketler": "vip, sıcak",
      "Özet Not": "Deniz manzaralı arıyor",
      "Son İletişim": "20.04.2026",
      "Sonraki Takip": "30.04.2026",
    },
    {
      "Ad": "Mehmet",
      "Soyad": "Demir",
      "Tip": catalog[1]?.label || "Satıcı",
      "Aşama": "Nitelikli",
      "Aciliyet": "Yüksek",
      "Telefon": "0533 987 65 43",
      "E-posta": "",
      "Adres": "",
      "Kaynak": "İnternet",
      "Min Bütçe": "",
      "Max Bütçe": "",
      "Tercih Tipler": "",
      "Tercih Şehirler": "",
      "Tercih İlçeler": "",
      "Min m²": "",
      "Max m²": "",
      "Min Oda": "",
      "Max Oda": "",
      "Etiketler": "",
      "Özet Not": "Acil satış, kapıcı ile iletişim",
      "Son İletişim": "",
      "Sonraki Takip": "",
    },
  ];

  // Örnek satırların altına "(Kılavuz satırlarını silip kendi verinizi yazın)" notu ekleyemeyiz
  // (tek shell sayfa zor), ama ikinci sheet'e açıklama eklenebilir. Şimdilik sadece örnek.
  const buffer = await buildExcel<TemplateRow>(examples, columns, "Müşteri Şablonu");

  const resp = excelResponse(buffer, "musteri-sablonu.xlsx");
  resp.headers.set("X-Accepted-Types", tipOrnekleri);
  return resp;
}
