import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, type SessionUser } from "@/lib/apiAuth";
import { writeAuditLog } from "@/lib/auditLog";

/**
 * Détermine si `user` a le droit d'accéder à la commande `order`.
 * - ADMIN / MANAGER : accès complet
 * - AGENT : uniquement les commandes qui lui sont affectées
 * - LIVREUR : uniquement les commandes de ses livraisons
 * - BOUTIQUE_OWNER : uniquement les commandes de sa boutique
 */
function canAccessOrder(
  user: SessionUser,
  order: { assignedAgentId: string | null; boutiqueId: string; delivery: { livreurId: string | null } | null }
): boolean {
  if (user.role === "ADMIN" || user.role === "MANAGER") return true;
  if (user.role === "AGENT") return order.assignedAgentId === user.id;
  if (user.role === "LIVREUR") return order.delivery?.livreurId === user.id;
  if (user.role === "BOUTIQUE_OWNER") return !!user.boutiqueId && order.boutiqueId === user.boutiqueId;
  return false;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      boutique: true,
      customer: { include: { city: true } },
      items: { include: { product: true } },
      assignedAgent: true,
      validatedBy: true,
      delivery: { include: { livreur: true } },
      invoice: true,
      callLogs: { include: { agent: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessOrder(user, order)) return forbidden();
  return NextResponse.json(order);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await context.params;

  // Vérifier l'accès AVANT toute modification
  const existing = await prisma.order.findUnique({
    where: { id },
    select: { assignedAgentId: true, boutiqueId: true, delivery: { select: { livreurId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Les BOUTIQUE_OWNER et LIVREUR ne modifient pas les commandes via cette route
  if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "AGENT") {
    return forbidden();
  }
  if (!canAccessOrder(user, existing)) return forbidden();

  const body = await req.json();

  // L1 — Validation des champs modifiables
  const VALID_STATUSES = [
    "NOUVEAU", "PDR", "REPORTE", "CONFIRME", "EN_LIVRAISON",
    "LIVRE", "RETOURNE", "ANNULE", "INJOIGNABLE",
  ];
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  if (body.callCount !== undefined && (typeof body.callCount !== "number" || body.callCount < 0 || !Number.isInteger(body.callCount))) {
    return NextResponse.json({ error: "callCount invalide" }, { status: 400 });
  }

  // Un AGENT ne peut pas se réaffecter / réaffecter les commandes
  const assignedAgentId =
    user.role === "ADMIN" || user.role === "MANAGER" ? body.assignedAgentId : undefined;

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      subStatus: body.subStatus,
      notes: body.notes,
      reportDate: body.reportDate ? new Date(body.reportDate) : undefined,
      assignedAgentId,
      callCount: body.callCount,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  // Suppression définitive réservée aux ADMIN
  if (user.role !== "ADMIN") return forbidden();
  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { code: true, boutiqueId: true },
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.order.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: "ORDER_DELETED",
    entity: "Order",
    entityId: id,
    details: { code: order?.code, boutiqueId: order?.boutiqueId },
  });
  return NextResponse.json({ ok: true });
}
