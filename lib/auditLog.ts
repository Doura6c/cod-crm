import { prisma } from "./prisma";

export type AuditAction = "ORDER_DELETED" | "AMOUNT_EDITED" | "RESET_EXECUTED";

export async function writeAuditLog({
  userId,
  userEmail,
  action,
  entity,
  entityId,
  details,
}: {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  } catch {
    // Ne jamais bloquer l'action métier si l'écriture du log échoue
  }
}
