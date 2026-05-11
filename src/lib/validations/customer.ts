import { z } from "zod/v4";

// TR telefon format kontrolü — boşluk/tire/parantez toleranslı, 10-11 hane (5XX XXX XX XX veya 0XXX XXX XX XX)
const trPhoneRegex = /^(?:\+?90)?[\s\-()]*0?5\d{2}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}$/;
const trPhoneSchema = z
  .string()
  .refine(
    (val) => val === "" || trPhoneRegex.test(val),
    { message: "Geçersiz telefon formatı. Örn: 5XX XXX XX XX" },
  )
  .optional()
  .or(z.literal(""));

// Talep profili alanları
const demandProfileFields = {
  stage: z.enum(["LEAD", "QUALIFIED", "ACTIVE", "SHOWING", "OFFER", "CONTRACT", "CLOSED", "LOST"]).optional(),
  minBudget: z.number().min(0).optional(),
  maxBudget: z.number().min(0).optional(),
  budgetCurrency: z.string().optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  desiredMoveDate: z.string().optional(), // ISO date string
  preferredTypes: z.array(z.string()).optional(),
  preferredCities: z.array(z.string()).optional(),
  preferredDistricts: z.array(z.string()).optional(),
  minArea: z.number().min(0).optional(),
  maxArea: z.number().min(0).optional(),
  minRooms: z.string().optional(),
  maxRooms: z.string().optional(),
  preferredFeatures: z.array(z.string()).optional(),
  financingMethod: z.enum(["NAKIT", "KREDI", "TAKAS"]).optional(),
  preApprovalStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).optional(),
  downPaymentPercent: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  notesSummary: z.string().optional(),
  lastContactDate: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  // Müşterinin ilgilendiği projeler/siteler (Project.id'ler)
  interestedProjectIds: z.array(z.string()).optional(),
};

// Min > Max ilişkilerini doğrulayan ortak superRefine
const refineBudgetAndArea = (
  data: { minBudget?: number; maxBudget?: number; minArea?: number; maxArea?: number },
  ctx: z.RefinementCtx,
) => {
  if (data.minBudget != null && data.maxBudget != null && data.minBudget > data.maxBudget) {
    ctx.addIssue({
      code: "custom",
      path: ["maxBudget"],
      message: "Max bütçe min bütçeden büyük olmalı",
    });
  }
  if (data.minArea != null && data.maxArea != null && data.minArea > data.maxArea) {
    ctx.addIssue({
      code: "custom",
      path: ["maxArea"],
      message: "Max m² min m²'den büyük olmalı",
    });
  }
};

export const customerCreateSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalı"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalı"),
  email: z.email("Geçerli bir e-posta adresi girin").optional().or(z.literal("")),
  phone: trPhoneSchema,
  tcKimlikNo: z.string().length(11, "TC Kimlik No 11 haneli olmalı").optional().or(z.literal("")),
  address: z.string().optional(),
  customerType: z.string().min(1, "Müşteri tipi gerekli"),
  source: z.string().optional(),
  assignedAgentId: z.string().nullable().optional(),
  branchId: z.string().optional(),
  consents: z.object({
    acikRiza: z.boolean(),
    aydinlatma: z.boolean(),
    pazarlama: z.boolean(),
  }),
  ...demandProfileFields,
}).superRefine(refineBudgetAndArea);

export const customerUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.email().optional().or(z.literal("")),
  phone: trPhoneSchema,
  address: z.string().optional(),
  customerType: z.string().min(1).optional(),
  source: z.string().optional(),
  assignedAgentId: z.string().nullable().optional(),
  branchId: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
  ...demandProfileFields,
}).superRefine(refineBudgetAndArea);

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
