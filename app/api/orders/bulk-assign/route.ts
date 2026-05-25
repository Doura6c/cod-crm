import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/orders/bulk-assign
 * Body: { orderIds: string[], agentId: string | null }
 * Auth: ADMIN ou MANAGER
 */
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

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
