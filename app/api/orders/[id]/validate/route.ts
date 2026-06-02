import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/apiAuth";
import { can } from "@/lib/rbac";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }
  if (!can(user.role, "VALIDATE_ORDER")) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  const { id } = await context.params;

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // L2 — Bloquer la double-confirmation (évite double décrémentation de stock)
  const TERMINAL = ["CONFIRME", "EN_LIVRAISON", "LIVRE", "RETOURNE", "ANNULE"];
  if (TERMINAL.includes(order.status)) {
    return NextResponse.json({ error: "Commande déjà traitée" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status: "CONFIRME",
        validatedById: user.id,
        validatedAt: new Date(),
      },
    });
    // décrémenter le stock
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Commande ${order.code} confirmée`,
          orderId: order.id,
        },
      });
    }
  });

  const referer = _req.headers.get("referer") ?? "/commandes/confirmation";
  return NextResponse.redirect(referer, 303);
}
