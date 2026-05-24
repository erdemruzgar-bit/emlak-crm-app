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
  branchId: string | null;        // Ana şubesi (geriye dönük uyum)
  branchIds: string[];            // Yetkili olduğu tüm şubeler (ana + ek). RBAC kontrollerinde bu kullanılır.
  canExport?: boolean;
  canImport?: boolean;
}

export function extractActor(session: unknown): SessionActor | null {
  const user = (session as { user?: unknown })?.user as Record<string, unknown> | undefined;
  if (!user || typeof user.id !== "string") return null;
  const role = user.role as Role | undefined;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "AGENT") return null;

  const branchId = typeof user.branchId === "string" ? user.branchId : null;
  // session.user.authorizedBranchIds — auth callback'inde set edilir (string[])
  const additional = Array.isArray(user.authorizedBranchIds)
    ? (user.authorizedBranchIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const branchIds = Array.from(new Set([...(branchId ? [branchId] : []), ...additional]));

  return {
    id: user.id,
    role,
    branchId,
    branchIds,
    canExport: user.canExport === true,
    canImport: user.canImport === true,
  };
}

// Kullanıcının verilen şubeye yetkili olup olmadığını kontrol eder.
// ADMIN her zaman; MANAGER/AGENT ise branchIds.includes()
export function isAuthorizedForBranch(actor: SessionActor | null, branchId: string | null): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (!branchId) return false;
  return actor.branchIds.includes(branchId);
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

// Görüntüleme: ADMIN ve MANAGER tüm şubeleri; AGENT yetkili olduğu şubeleri.
// AGENT için ek erişim: kendi şubesine bağlı projedeki tüm ilanlar görünür
// (property.branchId farklı olsa bile), çünkü şube projenin sorumlusudur.
export function canViewProperty(
  actor: SessionActor | null,
  property: { branchId: string | null; project?: { branchId: string | null } | null }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN" || actor.role === "MANAGER") return true;
  if (!actor.branchIds.length) return false;
  const propBranchOK = property.branchId !== null && actor.branchIds.includes(property.branchId);
  const projBranchOK = property.project?.branchId != null && actor.branchIds.includes(property.project.branchId);
  return propBranchOK || projBranchOK;
}

// Düzenleme: atanmış danışman, yetkili olduğu şubedeki MANAGER, ADMIN.
// Ek: AGENT kendi şubesine bağlı projedeki ilana atanmamışsa düzenleyemez —
// view ile edit farklı; view geniş, edit dar.
export function canEditProperty(
  actor: SessionActor | null,
  property: { assignedAgentId: string | null; branchId: string | null; project?: { branchId: string | null } | null }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (actor.role === "MANAGER") {
    if (!actor.branchIds.length) return false;
    const propBranchOK = property.branchId !== null && actor.branchIds.includes(property.branchId);
    const projBranchOK = property.project?.branchId != null && actor.branchIds.includes(property.project.branchId);
    return propBranchOK || projBranchOK;
  }
  // AGENT
  return property.assignedAgentId === actor.id;
}

// Prisma where filtresi — liste endpointlerinde kullanılır
// MANAGER artık tüm şubelerin ilanlarını listede görür (görsel listede izolasyon yok);
// edit/delete RBAC üzerinden korunuyor. AGENT yetkili olduğu şubeler VEYA bağlı projeler.
export function propertyListFilter(actor: SessionActor | null): Record<string, unknown> {
  if (!actor) return { branchId: "__no_branch__" };
  if (actor.role === "ADMIN" || actor.role === "MANAGER") return {};
  // AGENT — yetkili olduğu şubeler (ana + ek) VEYA o şubelere bağlı projeler
  if (actor.branchIds.length === 0) return { branchId: "__no_branch__" };
  return {
    OR: [
      { branchId: { in: actor.branchIds } },
      { project: { branchId: { in: actor.branchIds } } },
    ],
  };
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
    if (!ownerBranch) return false;
    return actor.branchIds.includes(ownerBranch);
  }
  return false;
}

export const canEditTask = canEditAppointment; // aynı kurgu

// Prisma where filtresi
export function appointmentListFilter(actor: SessionActor | null): Record<string, unknown> {
  if (!actor || actor.role === "ADMIN") return {};
  if (actor.role === "MANAGER") {
    if (actor.branchIds.length === 0) return { user: { branchId: "__no_branch__" } };
    return { user: { branchId: { in: actor.branchIds } } };
  }
  // AGENT — kendi randevuları/görevleri
  return { userId: actor.id };
}

export const taskListFilter = appointmentListFilter;

// -------- Yardımcılar --------

// Bir ilanın match'ini düzenlemek için önce ilgili property bilgisi lazım
export async function loadPropertyForRbac(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      assignedAgentId: true,
      branchId: true,
      project: { select: { branchId: true } },
    },
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
