import { prisma } from "./prisma";

interface AuditLogParams {
  userId?: string;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE";
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress,
    },
  });
}
