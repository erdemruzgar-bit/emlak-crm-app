import { z } from "zod/v4";

export const propertyCreateSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  listingType: z.string().min(1, "İlan tipi gerekli"),
  propertyType: z.enum(["DAIRE", "VILLA", "ARSA", "ISYERI", "MUSTAKILEV"]),
  status: z.enum(["ACTIVE", "SOLD", "RENTED", "INACTIVE"]).optional(),
  price: z.number().positive("Fiyat pozitif olmalı"),
  currency: z.string().default("TRY"),
  area: z.number().positive().optional(),
  rooms: z.string().optional(),
  bathrooms: z.number().int().optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
  age: z.number().int().min(0).optional(),
  heating: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  ownerId: z.string().nullable().optional(),
  assignedAgentId: z.string().nullable().optional(),
  branchId: z.string().optional(),

  // Proje/Blok hiyerarşisi
  projectId: z.string().nullable().optional(),
  blockId: z.string().nullable().optional(),
  unitNumber: z.string().optional(),

  // Tapu bilgileri
  ada: z.string().optional(),
  pafta: z.string().optional(),
  parsel: z.string().optional(),
  bagimsizBolumNo: z.string().optional(),
  katMulkiyetiTipi: z
    .enum(["KAT_MULKIYETI", "KAT_IRTIFAKI", "ARSA_PAYLI", "HISSELI", "BAGIMSIZ_BOLUMSUZ"])
    .nullable()
    .optional(),

  // Sakin / vatandaşlık / kullanım
  occupancyStatus: z
    .enum(["SAHIBI_OTURUYOR", "KIRACILI", "BOS", "ARSIV"])
    .nullable()
    .optional(),
  // VATANDASLIGA_UYGUN deprecated; mevcut payload'larda hâlâ gelirse geriye dönük kabul edilir,
  // POST/PUT route'ları bunu yeni alana (isCitizenshipEligible) çevirir.
  ownerCitizenship: z.enum(["TC", "YABANCI", "SIRKET", "VATANDASLIGA_UYGUN"]).nullable().optional(),
  isCitizenshipEligible: z.boolean().nullable().optional(),
  usageType: z
    .enum(["KONUT", "ISYERI", "KARMA", "ARSA_IMARLI", "ARSA_IMARSIZ"])
    .nullable()
    .optional(),

  // Ek özellikler
  hasElevator: z.boolean().nullable().optional(),
  hasParking: z.boolean().nullable().optional(),
  parkingType: z.enum(["ACIK", "KAPALI"]).nullable().optional(),
  parkingSpotCount: z.number().int().nonnegative().nullable().optional(),
  hasBalcony: z.boolean().nullable().optional(),
  facingDirection: z
    .enum(["KUZEY", "GUNEY", "DOGU", "BATI", "KUZEY_DOGU", "KUZEY_BATI", "GUNEY_DOGU", "GUNEY_BATI"])
    .nullable()
    .optional(),

  // İnşaat durumu + tapu kaydı
  constructionStatus: z
    .enum(["INSAAT_HALINDE", "OTURUMA_HAZIR"])
    .nullable()
    .optional(),
  hasTitleDeed: z.boolean().nullable().optional(),

  // Mutfak tipi
  kitchenType: z.enum(["ACIK", "KAPALI"]).nullable().optional(),
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
