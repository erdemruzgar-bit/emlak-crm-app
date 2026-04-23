import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { canImportData, extractActor } from "@/lib/rbac";

interface TemplateRow {
  "Başlık": string;
  "Tip": string;
  "Emlak Tipi": string;
  "Durum": string;
  "Fiyat": string | number;
  "Para Birimi": string;
  "m²": string | number;
  "Oda": string;
  "Banyo": string | number;
  "Kat": string | number;
  "Toplam Kat": string | number;
  "Bina Yaşı": string | number;
  "Isıtma": string;
  "Şehir": string;
  "İlçe": string;
  "Mahalle": string;
  "Adres": string;
  "Açıklama": string;
}

const columns: ColumnDef<TemplateRow>[] = [
  { key: "Başlık", header: "Başlık", width: 30 },
  { key: "Tip", header: "Tip", width: 12 },
  { key: "Emlak Tipi", header: "Emlak Tipi", width: 14 },
  { key: "Durum", header: "Durum", width: 12 },
  { key: "Fiyat", header: "Fiyat", width: 14 },
  { key: "Para Birimi", header: "Para Birimi", width: 12 },
  { key: "m²", header: "m²", width: 10 },
  { key: "Oda", header: "Oda", width: 10 },
  { key: "Banyo", header: "Banyo", width: 10 },
  { key: "Kat", header: "Kat", width: 10 },
  { key: "Toplam Kat", header: "Toplam Kat", width: 12 },
  { key: "Bina Yaşı", header: "Bina Yaşı", width: 12 },
  { key: "Isıtma", header: "Isıtma", width: 14 },
  { key: "Şehir", header: "Şehir", width: 14 },
  { key: "İlçe", header: "İlçe", width: 14 },
  { key: "Mahalle", header: "Mahalle", width: 16 },
  { key: "Adres", header: "Adres", width: 30 },
  { key: "Açıklama", header: "Açıklama", width: 30 },
];

export async function GET() {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canImportData(actor)) {
    return NextResponse.json({ error: "Excel içe aktarma yetkiniz yok" }, { status: 403 });
  }

  const examples: TemplateRow[] = [
    {
      "Başlık": "Kadıköy Deniz Manzaralı 3+1 Daire",
      "Tip": "Satılık",
      "Emlak Tipi": "Daire",
      "Durum": "Aktif",
      "Fiyat": 8500000,
      "Para Birimi": "TRY",
      "m²": 135,
      "Oda": "3+1",
      "Banyo": 2,
      "Kat": 7,
      "Toplam Kat": 12,
      "Bina Yaşı": 5,
      "Isıtma": "DOGALGAZ",
      "Şehir": "İstanbul",
      "İlçe": "Kadıköy",
      "Mahalle": "Fenerbahçe",
      "Adres": "Fenerbahçe Mah. Örnek Sk. No:12",
      "Açıklama": "Deniz manzaralı, asansörlü, kapalı otoparklı.",
    },
    {
      "Başlık": "Beşiktaş 2+1 Kiralık",
      "Tip": "Kiralık",
      "Emlak Tipi": "Daire",
      "Durum": "Aktif",
      "Fiyat": 45000,
      "Para Birimi": "TRY",
      "m²": 95,
      "Oda": "2+1",
      "Banyo": 1,
      "Kat": 3,
      "Toplam Kat": 6,
      "Bina Yaşı": 10,
      "Isıtma": "DOGALGAZ",
      "Şehir": "İstanbul",
      "İlçe": "Beşiktaş",
      "Mahalle": "Etiler",
      "Adres": "",
      "Açıklama": "Merkezi konumda, eşyasız.",
    },
  ];

  const buffer = buildExcel<TemplateRow>(examples, columns, "İlan Şablonu");
  return excelResponse(buffer, "ilan-sablonu.xlsx");
}
