import { z } from "zod/v4";

export const propertyCreateSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  listingType: z.enum(["SATILIK", "KIRALIK"]),
  propertyType: z.enum(["DAIRE", "VILLA", "ARSA", "ISYERI", "MUSTAKILEV"]),
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
  ownerId: z.string().optional(),
  assignedAgentId: z.string().optional(),
  branchId: z.string().optional(),
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
