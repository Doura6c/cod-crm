import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }
  const { id } = await context.params;

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status: "CONFIRME",
        validatedById: (session.user as any).id,
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
