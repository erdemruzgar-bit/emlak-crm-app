import { z } from "zod/v4";

export const appointmentCreateSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı"),
  type: z.enum(["GOSTERIM", "TOPLANTI", "DIGER"]),
  propertyId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const appointmentUpdateSchema = appointmentCreateSchema.partial();

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;

export const taskCreateSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı"),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  assignedById: z.string().optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
