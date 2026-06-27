// RBAC saf fonksiyonları için birim testleri.
// DB'ye dokunan fonksiyonlar (loadPropertyForRbac, loadCustomerForRbac) test edilmez.
// Kapsam: ADMIN/MANAGER/AGENT rolleri × şube (branchIds) × modül (disabledModules).

import { describe, it, expect } from "vitest";
import {
  extractActor,
  hasModuleAccess,
  isAuthorizedForBranch,
  canExportData,
  canImportData,
  isAdmin,
  isManager,
  canEditCustomer,
  canViewProperty,
  canEditProperty,
  propertyListFilter,
  canEditAppointment,
  canEditTask,
  appointmentListFilter,
  taskListFilter,
  type SessionActor,
  type Role,
} from "@/lib/rbac";

// --- Test yardımcıları: rol/şube/modül kombinasyonu üreten actor fabrikası ---
function makeActor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    id: "user-1",
    role: "AGENT",
    branchId: "branch-A",
    branchIds: ["branch-A"],
    canExport: false,
    canImport: false,
    disabledModules: [],
    ...overrides,
  };
}

const ADMIN = makeActor({ id: "admin-1", role: "ADMIN", branchId: null, branchIds: [] });
const MANAGER = makeActor({ id: "mgr-1", role: "MANAGER", branchId: "branch-A", branchIds: ["branch-A", "branch-B"] });
const AGENT = makeActor({ id: "agent-1", role: "AGENT", branchId: "branch-A", branchIds: ["branch-A"] });

// ============================================================
// extractActor
// ============================================================
describe("extractActor", () => {
  it("null/geçersiz session için null döner", () => {
    expect(extractActor(null)).toBeNull();
    expect(extractActor(undefined)).toBeNull();
    expect(extractActor({})).toBeNull();
    expect(extractActor({ user: {} })).toBeNull(); // id yok
    expect(extractActor({ user: { id: "x" } })).toBeNull(); // rol yok/geçersiz
    expect(extractActor({ user: { id: "x", role: "ROOT" } })).toBeNull(); // geçersiz rol
  });

  it.each<Role>(["ADMIN", "MANAGER", "AGENT"])("geçerli %s rolünü çıkarır", (role) => {
    const actor = extractActor({ user: { id: "u1", role } });
    expect(actor).not.toBeNull();
    expect(actor!.role).toBe(role);
    expect(actor!.id).toBe("u1");
  });

  it("ana şubeyi ve ek yetkili şubeleri birleştirir (tekilleştirir)", () => {
    const actor = extractActor({
      user: {
        id: "u1",
        role: "MANAGER",
        branchId: "b1",
        authorizedBranchIds: ["b1", "b2", "b3"],
      },
    });
    expect(actor!.branchId).toBe("b1");
    expect(actor!.branchIds).toEqual(["b1", "b2", "b3"]);
  });

  it("branchId null ve authorizedBranchIds yoksa boş branchIds verir", () => {
    const actor = extractActor({ user: { id: "u1", role: "AGENT" } });
    expect(actor!.branchId).toBeNull();
    expect(actor!.branchIds).toEqual([]);
  });

  it("authorizedBranchIds içindeki string olmayan değerleri eler", () => {
    const actor = extractActor({
      user: { id: "u1", role: "AGENT", authorizedBranchIds: ["b1", 5, null, "b2"] },
    });
    expect(actor!.branchIds).toEqual(["b1", "b2"]);
  });

  it("disabledModules'ü string filtresiyle çıkarır", () => {
    const actor = extractActor({
      user: { id: "u1", role: "AGENT", disabledModules: ["properties", 1, "reports"] },
    });
    expect(actor!.disabledModules).toEqual(["properties", "reports"]);
  });

  it("canExport/canImport sadece true ise true olur", () => {
    const a = extractActor({ user: { id: "u1", role: "AGENT", canExport: true } });
    expect(a!.canExport).toBe(true);
    expect(a!.canImport).toBe(false);
    const b = extractActor({ user: { id: "u1", role: "AGENT", canExport: "yes" } });
    expect(b!.canExport).toBe(false); // "yes" === true değil
  });
});

// ============================================================
// hasModuleAccess — rol × disabledModules
// ============================================================
describe("hasModuleAccess", () => {
  it("null actor erişemez", () => {
    expect(hasModuleAccess(null, "properties")).toBe(false);
  });

  it("ADMIN modül kapalı olsa bile her zaman geçer", () => {
    const admin = makeActor({ role: "ADMIN", disabledModules: ["properties", "reports"] });
    expect(hasModuleAccess(admin, "properties")).toBe(true);
    expect(hasModuleAccess(admin, "reports")).toBe(true);
  });

  it("AGENT kapalı modüle erişemez, açık modüle erişir", () => {
    const agent = makeActor({ role: "AGENT", disabledModules: ["reports"] });
    expect(hasModuleAccess(agent, "reports")).toBe(false);
    expect(hasModuleAccess(agent, "properties")).toBe(true);
  });

  it("MANAGER kapalı modüle erişemez", () => {
    const mgr = makeActor({ role: "MANAGER", disabledModules: ["analytics"] });
    expect(hasModuleAccess(mgr, "analytics")).toBe(false);
    expect(hasModuleAccess(mgr, "customers")).toBe(true);
  });

  it("disabledModules undefined ise tüm modüller açık", () => {
    const agent = makeActor({ role: "AGENT", disabledModules: undefined });
    expect(hasModuleAccess(agent, "anything")).toBe(true);
  });
});

// ============================================================
// isAuthorizedForBranch — rol × şube
// ============================================================
describe("isAuthorizedForBranch", () => {
  it("null actor yetkisiz", () => {
    expect(isAuthorizedForBranch(null, "branch-A")).toBe(false);
  });

  it("ADMIN her şubeye yetkili (null şube dahil)", () => {
    expect(isAuthorizedForBranch(ADMIN, "branch-Z")).toBe(true);
    expect(isAuthorizedForBranch(ADMIN, null)).toBe(true);
  });

  it("MANAGER yalnızca yetkili şubelerine erişir", () => {
    expect(isAuthorizedForBranch(MANAGER, "branch-A")).toBe(true);
    expect(isAuthorizedForBranch(MANAGER, "branch-B")).toBe(true);
    expect(isAuthorizedForBranch(MANAGER, "branch-C")).toBe(false);
  });

  it("AGENT yalnızca kendi şubesine erişir", () => {
    expect(isAuthorizedForBranch(AGENT, "branch-A")).toBe(true);
    expect(isAuthorizedForBranch(AGENT, "branch-B")).toBe(false);
  });

  it("ADMIN olmayan + null şube => yetkisiz", () => {
    expect(isAuthorizedForBranch(MANAGER, null)).toBe(false);
    expect(isAuthorizedForBranch(AGENT, null)).toBe(false);
  });
});

// ============================================================
// canExportData / canImportData
// ============================================================
describe("canExportData / canImportData", () => {
  it("null actor yetkisiz", () => {
    expect(canExportData(null)).toBe(false);
    expect(canImportData(null)).toBe(false);
  });

  it("ADMIN flag olmadan da yetkili", () => {
    expect(canExportData(ADMIN)).toBe(true);
    expect(canImportData(ADMIN)).toBe(true);
  });

  it("AGENT/MANAGER yalnızca flag true ise yetkili", () => {
    expect(canExportData(AGENT)).toBe(false);
    expect(canExportData(makeActor({ role: "AGENT", canExport: true }))).toBe(true);
    expect(canImportData(MANAGER)).toBe(false);
    expect(canImportData(makeActor({ role: "MANAGER", canImport: true }))).toBe(true);
  });
});

// ============================================================
// isAdmin / isManager
// ============================================================
describe("isAdmin / isManager", () => {
  it("rolleri doğru tanır", () => {
    expect(isAdmin(ADMIN)).toBe(true);
    expect(isAdmin(MANAGER)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isManager(MANAGER)).toBe(true);
    expect(isManager(AGENT)).toBe(false);
    expect(isManager(null)).toBe(false);
  });
});

// ============================================================
// canEditCustomer — müşteri ortak veri
// ============================================================
describe("canEditCustomer", () => {
  it("null actor düzenleyemez", () => {
    expect(canEditCustomer(null, { assignedAgentId: "agent-1" })).toBe(false);
  });

  it("ADMIN ve MANAGER her müşteriyi düzenler", () => {
    expect(canEditCustomer(ADMIN, { assignedAgentId: "x" })).toBe(true);
    expect(canEditCustomer(ADMIN, { assignedAgentId: null })).toBe(true);
    expect(canEditCustomer(MANAGER, { assignedAgentId: "x" })).toBe(true);
  });

  it("AGENT yalnızca kendine atanmış müşteriyi düzenler", () => {
    expect(canEditCustomer(AGENT, { assignedAgentId: "agent-1" })).toBe(true);
    expect(canEditCustomer(AGENT, { assignedAgentId: "agent-2" })).toBe(false);
    expect(canEditCustomer(AGENT, { assignedAgentId: null })).toBe(false);
  });
});

// ============================================================
// canViewProperty — görüntüleme (geniş)
// ============================================================
describe("canViewProperty", () => {
  it("null actor göremez", () => {
    expect(canViewProperty(null, { branchId: "branch-A" })).toBe(false);
  });

  it("ADMIN ve MANAGER tüm ilanları görür", () => {
    expect(canViewProperty(ADMIN, { branchId: "branch-Z" })).toBe(true);
    expect(canViewProperty(MANAGER, { branchId: "branch-Z" })).toBe(true);
    expect(canViewProperty(MANAGER, { branchId: null })).toBe(true);
  });

  it("AGENT yalnızca yetkili şubesindeki ilanı görür", () => {
    expect(canViewProperty(AGENT, { branchId: "branch-A" })).toBe(true);
    expect(canViewProperty(AGENT, { branchId: "branch-B" })).toBe(false);
    expect(canViewProperty(AGENT, { branchId: null })).toBe(false);
  });

  it("AGENT kendi şubesine bağlı projedeki ilanı görür (property.branchId farklı olsa bile)", () => {
    expect(
      canViewProperty(AGENT, { branchId: "branch-X", project: { branchId: "branch-A" } })
    ).toBe(true);
    expect(
      canViewProperty(AGENT, { branchId: "branch-X", project: { branchId: "branch-Y" } })
    ).toBe(false);
  });

  it("şubesiz AGENT hiçbir ilanı göremez", () => {
    const noBranch = makeActor({ role: "AGENT", branchIds: [] });
    expect(canViewProperty(noBranch, { branchId: "branch-A" })).toBe(false);
  });
});

// ============================================================
// canEditProperty — düzenleme (dar)
// ============================================================
describe("canEditProperty", () => {
  it("null actor düzenleyemez", () => {
    expect(canEditProperty(null, { assignedAgentId: "agent-1", branchId: "branch-A" })).toBe(false);
  });

  it("ADMIN her ilanı düzenler", () => {
    expect(
      canEditProperty(ADMIN, { assignedAgentId: null, branchId: "branch-Z" })
    ).toBe(true);
  });

  it("MANAGER yalnızca yetkili şubesindeki/projesindeki ilanı düzenler", () => {
    expect(canEditProperty(MANAGER, { assignedAgentId: null, branchId: "branch-A" })).toBe(true);
    expect(canEditProperty(MANAGER, { assignedAgentId: null, branchId: "branch-B" })).toBe(true);
    expect(canEditProperty(MANAGER, { assignedAgentId: null, branchId: "branch-C" })).toBe(false);
    // proje şubesi yetkili ise
    expect(
      canEditProperty(MANAGER, { assignedAgentId: null, branchId: "branch-X", project: { branchId: "branch-B" } })
    ).toBe(true);
  });

  it("şubesiz MANAGER hiçbir ilanı düzenleyemez", () => {
    const noBranch = makeActor({ role: "MANAGER", branchIds: [] });
    expect(canEditProperty(noBranch, { assignedAgentId: null, branchId: "branch-A" })).toBe(false);
  });

  it("AGENT yalnızca kendine atanmış ilanı düzenler (şube/proje view geniş olsa bile)", () => {
    expect(canEditProperty(AGENT, { assignedAgentId: "agent-1", branchId: "branch-A" })).toBe(true);
    // kendi şubesindeki ama atanmamış ilan -> düzenleyemez (view != edit)
    expect(canEditProperty(AGENT, { assignedAgentId: "agent-2", branchId: "branch-A" })).toBe(false);
    expect(canEditProperty(AGENT, { assignedAgentId: null, branchId: "branch-A" })).toBe(false);
  });
});

// ============================================================
// propertyListFilter — Prisma where filtresi
// ============================================================
describe("propertyListFilter", () => {
  it("null actor erişilemez filtre döner", () => {
    expect(propertyListFilter(null)).toEqual({ branchId: "__no_branch__" });
  });

  it("ADMIN ve MANAGER boş filtre (tümünü görür) döner", () => {
    expect(propertyListFilter(ADMIN)).toEqual({});
    expect(propertyListFilter(MANAGER)).toEqual({});
  });

  it("AGENT için yetkili şube VEYA bağlı proje filtresi (assignedAgentId kısıtı değil, şube kısıtı)", () => {
    expect(propertyListFilter(AGENT)).toEqual({
      OR: [
        { branchId: { in: ["branch-A"] } },
        { project: { branchId: { in: ["branch-A"] } } },
      ],
    });
  });

  it("şubesiz AGENT hiçbir ilan göremez", () => {
    const noBranch = makeActor({ role: "AGENT", branchIds: [] });
    expect(propertyListFilter(noBranch)).toEqual({ branchId: "__no_branch__" });
  });
});

// ============================================================
// canEditAppointment / canEditTask — randevu & görev (aynı kurgu)
// ============================================================
describe("canEditAppointment / canEditTask", () => {
  it("canEditTask, canEditAppointment ile aynı referanstır", () => {
    expect(canEditTask).toBe(canEditAppointment);
  });

  it("null actor düzenleyemez", () => {
    expect(canEditAppointment(null, { userId: "agent-1" })).toBe(false);
  });

  it("ADMIN her randevuyu düzenler", () => {
    expect(canEditAppointment(ADMIN, { userId: "someone" })).toBe(true);
  });

  it("sahibi kendisi ise her rol düzenler", () => {
    expect(canEditAppointment(AGENT, { userId: "agent-1" })).toBe(true);
    expect(canEditAppointment(MANAGER, { userId: "mgr-1" })).toBe(true);
  });

  it("MANAGER kendi şubesindeki kullanıcının randevusunu düzenler", () => {
    expect(
      canEditAppointment(MANAGER, { userId: "other", user: { branchId: "branch-A" } })
    ).toBe(true);
    expect(
      canEditAppointment(MANAGER, { userId: "other", user: { branchId: "branch-C" } })
    ).toBe(false);
    // sahibinin şubesi yoksa düzenleyemez
    expect(
      canEditAppointment(MANAGER, { userId: "other", user: { branchId: null } })
    ).toBe(false);
  });

  it("AGENT başkasının randevusunu düzenleyemez", () => {
    expect(
      canEditAppointment(AGENT, { userId: "other", user: { branchId: "branch-A" } })
    ).toBe(false);
  });
});

// ============================================================
// appointmentListFilter / taskListFilter — Prisma where filtresi
// ============================================================
describe("appointmentListFilter / taskListFilter", () => {
  it("taskListFilter, appointmentListFilter ile aynı referanstır", () => {
    expect(taskListFilter).toBe(appointmentListFilter);
  });

  it("null veya ADMIN boş filtre döner", () => {
    expect(appointmentListFilter(null)).toEqual({});
    expect(appointmentListFilter(ADMIN)).toEqual({});
  });

  it("MANAGER yetkili şubelerinin kullanıcılarını filtreler", () => {
    expect(appointmentListFilter(MANAGER)).toEqual({
      user: { branchId: { in: ["branch-A", "branch-B"] } },
    });
  });

  it("şubesiz MANAGER hiçbir kaydı göremez", () => {
    const noBranch = makeActor({ role: "MANAGER", branchIds: [] });
    expect(appointmentListFilter(noBranch)).toEqual({
      user: { branchId: "__no_branch__" },
    });
  });

  it("AGENT yalnızca kendi randevularını/görevlerini görür", () => {
    expect(appointmentListFilter(AGENT)).toEqual({ userId: "agent-1" });
  });
});
