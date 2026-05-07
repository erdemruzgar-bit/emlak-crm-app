import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";

interface TemplateRow {
  Blok: string;
  Daire: string;
  M2: string;
  KAT: string;
  MANZARA: string;
  MUTFAK: string;
  "ODA SAYISI": string;
  "Malik / Kiracı": string;
  "Adı Soyadı": string;
  "E-Posta": string;
  Telefon: string;
  DURUM: string;
  "GÖRÜŞME NOTU": string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const columns: ColumnDef<TemplateRow>[] = [
    { key: "Blok", header: "Blok", width: 14 },
    { key: "Daire", header: "Daire", width: 8 },
    { key: "M2", header: "M2", width: 8 },
    { key: "KAT", header: "KAT", width: 8 },
    { key: "MANZARA", header: "MANZARA", width: 14 },
    { key: "MUTFAK", header: "MUTFAK", width: 10 },
    { key: "ODA SAYISI", header: "ODA SAYISI", width: 18 },
    { key: "Malik / Kiracı", header: "Malik / Kiracı", width: 16 },
    { key: "Adı Soyadı", header: "Adı Soyadı", width: 24 },
    { key: "E-Posta", header: "E-Posta", width: 28 },
    { key: "Telefon", header: "Telefon", width: 32 },
    { key: "DURUM", header: "DURUM", width: 32 },
    { key: "GÖRÜŞME NOTU", header: "GÖRÜŞME NOTU", width: 60 },
  ];

  const examples: TemplateRow[] = [
    {
      Blok: "A1 BLOK",
      Daire: "1",
      M2: "85",
      KAT: "1",
      MANZARA: "PEYZAJ",
      MUTFAK: "KAPALI",
      "ODA SAYISI": "2+1 ( TERASLI )",
      "Malik / Kiracı": "Kat Maliki",
      "Adı Soyadı": "AYŞE DEMİR",
      "E-Posta": "ornek@mail.com",
      Telefon: "Cep: 0532 000 00 00",
      DURUM: "KENDİSİ OTURUYOR",
      "GÖRÜŞME NOTU": "Tarih · Görüşme özeti...",
    },
    {
      Blok: "A1 BLOK",
      Daire: "2",
      M2: "",
      KAT: "0",
      MANZARA: "ARMONI",
      MUTFAK: "AÇIK",
      "ODA SAYISI": "1+1",
      "Malik / Kiracı": "Kiracı",
      "Adı Soyadı": "MEHMET KAYA",
      "E-Posta": "",
      Telefon: "Cep: 0533 000 00 00 / Diğer: 0212 555 00 00",
      DURUM: "KİRALIYOR / 40.000 TL",
      "GÖRÜŞME NOTU": "",
    },
  ];

  const buf = buildExcel(examples, columns, "Daireler");
  return excelResponse(buf, "proje-import-sablonu.xlsx") as unknown as Response;
}
