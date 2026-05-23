"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateDeliveryStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  if (!can(role, "UPDATE_DELIVERY_STATUS")) redirect("/");

  const deliveryId = String(formData.get("deliveryId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const newStatus = String(formData.get("status") ?? ""); // LIVRE | RETOURNE
  const failureReason = String(formData.get("failureReason") ?? "").trim() || null;

  if (!["LIVRE", "RETOURNE"].includes(newStatus)) redirect(`/livraisons`);

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: { include: { items: true, invoice: true } } },
  });
  if (!delivery) redirect("/livraisons");

  // Livreur ne peut mettre à jour que ses propres livraisons
  if (role === "LIVREUR" && delivery.livreurId !== userId) redirect("/livraisons");

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        deliveredAt: newStatus === "LIVRE" ? new Date() : null,
        amountCollected: newStatus === "LIVRE" ? delivery.order.totalAmount : null,
        failureReason: newStatus === "RETOURNE" ? failureReason : null,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus === "LIVRE" ? "LIVRE" : "RETOURNE" },
    });

    // Si livré : générer la facture automatiquement (COD = payée à la livraison)
    if (newStatus === "LIVRE" && !delivery.order.invoice) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const reference = `FACT-${dateStr}-${suffix}`;
      const subtotal = delivery.order.totalAmount - delivery.order.deliveryFee;
      await tx.invoice.create({
        data: {
          reference,
          orderId,
          subtotal,
          deliveryFee: delivery.order.deliveryFee,
          total: delivery.order.totalAmount,
          status: "PAYEE",
          paidAt: new Date(),
        },
      });
    }

    // Si retourné : remettre le stock
    if (newStatus === "RETOURNE") {
      for (const item of delivery.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            reason: `Retour livraison commande ${delivery.order.code}`,
            orderId,
          },
        });
      }
    }
  });

  revalidatePath("/livraisons");
  revalidatePath(`/commandes/${orderId}`);
  redirect("/livraisons");
}
