import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "@/lib/apiAuth";

/**
 * POST /api/orders/bulk-assign
 * Body: { orderIds: string[], agentId: string | null }
 * Auth: ADMIN ou MANAGER
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!["ADMIN", "MANAGER"].includes(user.role)) return forbidden();

  const { orderIds, agentId } = await req.json();
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: "orderIds requis" }, { status: 400 });
  }

  const updated = await prisma.order.updateMany({
    where: {
      id: { in: orderIds },
      // On ne réaffecte que les commandes non livrées/annulées
      status: { notIn: ["LIVRE", "ANNULE", "RETOURNE"] },
    },
    data: {
      assignedAgentId: agentId || null,
    },
  });

  return NextResponse.json({ ok: true, updated: updated.count });
}
