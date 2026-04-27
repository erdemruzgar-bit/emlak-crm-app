// Sözleşme yaşam döngüsünün ilişkili kayıtlar üzerindeki etkileri.
//
// KIRA + ACTIVE  → Property.status = RENTED, Customer.customerType = TENANT
// SATIS + ACTIVE → Property.status = SOLD,   Customer.customerType = LANDLORD (yeni mülk sahibi)
// KOMISYON       → herhangi bir otomatik değişiklik yok
//
// Sözleşme TERMINATED/EXPIRED olduğunda geri çevirme için: yalnızca KIRA'da
// Property.status RENTED ise ACTIVE'e döndürülür; satışta otomatik geri alma yapılmaz
// (mülk sahibi değişmiş olduğu için manuel karar gerekir).

import { prisma } from "./prisma";
import type { ContractStatus, ContractType, PropertyStatus } from "@prisma/client";

interface ContractRef {
  id: string;
  contractType: ContractType;
  status: ContractStatus;
  propertyId: string | null;
  customerId: string | null;
}

export async function applyContractEffects(
  contractId: string,
  previousStatus: ContractStatus | null,
): Promise<void> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      contractType: true,
      status: true,
      propertyId: true,
      customerId: true,
    },
  });
  if (!contract) return;

  const becameActive =
    contract.status === "ACTIVE" && previousStatus !== "ACTIVE";
  const leftActive =
    previousStatus === "ACTIVE" && contract.status !== "ACTIVE";

  if (becameActive) {
    await onActivated(contract);
  } else if (leftActive) {
    await onDeactivated(contract);
  }
}

async function onActivated(c: ContractRef): Promise<void> {
  if (c.contractType === "KIRA") {
    if (c.propertyId) {
      await prisma.property.update({
        where: { id: c.propertyId },
        data: { status: "RENTED" satisfies PropertyStatus },
      });
    }
    if (c.customerId) {
      await prisma.customer.update({
        where: { id: c.customerId },
        data: { customerType: "TENANT" },
      });
    }
  } else if (c.contractType === "SATIS") {
    if (c.propertyId) {
      await prisma.property.update({
        where: { id: c.propertyId },
        data: { status: "SOLD" satisfies PropertyStatus },
      });
    }
    if (c.customerId) {
      // Alıcı, mülkün yeni sahibi haline gelir
      await prisma.customer.update({
        where: { id: c.customerId },
        data: { customerType: "LANDLORD" },
      });
    }
  }
}

async function onDeactivated(c: ContractRef): Promise<void> {
  // Yalnızca kira sözleşmesi feshedilirse / süresi dolarsa mülkü tekrar
  // ACTIVE'e döndür. Satışta otomatik geri alma riskli (yeni sahip değişmiş).
  if (c.contractType !== "KIRA" || !c.propertyId) return;

  const property = await prisma.property.findUnique({
    where: { id: c.propertyId },
    select: { status: true },
  });
  if (property?.status === "RENTED") {
    await prisma.property.update({
      where: { id: c.propertyId },
      data: { status: "ACTIVE" satisfies PropertyStatus },
    });
  }
}
