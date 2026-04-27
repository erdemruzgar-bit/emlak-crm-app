// Merkezi RBAC (Role-Based Access Control) helper'ları
// Kural özeti:
//  - Müşteriler: tüm roller tüm şubelerde görür; düzenleme atanmış danışman / herhangi MANAGER / ADMIN
//  - İlanlar: AGENT kendi şubesi; MANAGER tüm şubeleri görür ama düzenleme sadece kendi şubesi; ADMIN hepsi
//  - Randevu/görev: AGENT kendi, MANAGER şubesinin kullanıcıları, ADMIN hepsi
//  - Eşleşmeler: ilgili ilanın edit hakkıyla aynı

import { prisma } from "./prisma";

export type Role = "ADMIN" | "MANAGER" | "AGENT";

export interface SessionActor {
  id: string;
  role: Role;
  branchId: string | null;
  canExport?: boolean;
  canImport?: boolean;
}

export function extractActor(session: unknown): SessionActor | null {
  const user = (session as { user?: unknown })?.user as Record<string, unknown> | undefined;
  if (!user || typeof user.id !== "string") return null;
  const role = user.role as Role | undefined;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "AGENT") return null;
  return {
    id: user.id,
    role,
    branchId: (typeof user.branchId === "string" ? user.branchId : null),
    canExport: user.canExport === true,
    canImport: user.canImport === true,
  };
}

// Excel dışa aktarma yetkisi: ADMIN her zaman, diğerleri sadece canExport=true ise
export function canExportData(actor: SessionActor | null): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  return actor.canExport === true;
}

// Excel içe aktarma yetkisi: ADMIN her zaman, diğerleri sadece canImport=true ise
export function canImportData(actor: SessionActor | null): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  return actor.canImport === true;
}

export function isAdmin(a: SessionActor | null): boolean {
  return a?.role === "ADMIN";
}

export function isManager(a: SessionActor | null): boolean {
  return a?.role === "MANAGER";
}

// -------- Müşteri --------

// Müşteri düzenleyebilir mi? Müşteri ortak veri; atanmış danışman, herhangi MANAGER, ADMIN yapar.
export function canEditCustomer(
  actor: SessionActor | null,
  customer: { assignedAgentId: string | null }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN" || actor.role === "MANAGER") return true;
  return customer.assignedAgentId === actor.id;
}

// -------- İlan --------

// Görüntüleme: ADMIN ve MANAGER tüm şubeleri; AGENT sadece kendi şubesini
export function canViewProperty(
  actor: SessionActor | null,
  property: { branchId: string | null }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN" || actor.role === "MANAGER") return true;
  if (!actor.branchId || !property.branchId) return false;
  return actor.branchId === property.branchId;
}

// Düzenleme: atanmış danışman, aynı şube MANAGER, ADMIN
// (MANAGER görüntülemeyi tüm şubelerde yapar ama düzenleme yalnızca kendi şubesinde)
export function canEditProperty(
  actor: SessionActor | null,
  property: { assignedAgentId: string | null; branchId: string | null }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (actor.role === "MANAGER") {
    return !!actor.branchId && actor.branchId === property.branchId;
  }
  // AGENT
  return property.assignedAgentId === actor.id;
}

// Prisma where filtresi — liste endpointlerinde kullanılır
// MANAGER artık tüm şubelerin ilanlarını listede görür (görsel listede izolasyon yok);
// edit/delete RBAC üzerinden korunuyor.
export function propertyListFilter(actor: SessionActor | null): Record<string, unknown> {
  if (!actor) return { branchId: "__no_branch__" };
  if (actor.role === "ADMIN" || actor.role === "MANAGER") return {};
  return { branchId: actor.branchId ?? "__no_branch__" }; // AGENT — kendi şubesi
}

// -------- Randevu / Görev --------

// Randevu/görev sahibinin branchId'si gerekli — includes user: { branchId: true } ile çekilmeli
export function canEditAppointment(
  actor: SessionActor | null,
  appointment: { userId: string; user?: { branchId: string | null } | null }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (appointment.userId === actor.id) return true;
  if (actor.role === "MANAGER") {
    const ownerBranch = appointment.user?.branchId ?? null;
    return !!actor.branchId && ownerBranch === actor.branchId;
  }
  return false;
}

export const canEditTask = canEditAppointment; // aynı kurgu

// Prisma where filtresi
export function appointmentListFilter(actor: SessionActor | null): Record<string, unknown> {
  if (!actor || actor.role === "ADMIN") return {};
  if (actor.role === "MANAGER") {
    return { user: { branchId: actor.branchId ?? "__no_branch__" } };
  }
  // AGENT
  return { userId: actor.id };
}

export const taskListFilter = appointmentListFilter;

// -------- Yardımcılar --------

// Bir ilanın match'ini düzenlemek için önce ilgili property bilgisi lazım
export async function loadPropertyForRbac(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, assignedAgentId: true, branchId: true },
  });
}

export async function loadCustomerForRbac(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, assignedAgentId: true },
  });
}

// Standart 403 cevabı + isteğe bağlı audit log
export function forbidden(message = "Bu işlem için yetkiniz yok") {
  return { error: message };
}
