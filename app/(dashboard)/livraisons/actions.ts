"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification, notifyRole } from "@/lib/notifications";

export async function updateDeliveryStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  if (!can(role, "UPDATE_DELIVERY_STATUS")) redirect("/");

  const deliveryId = String(formData.get("deliveryId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const newStatus = String(formData.get("status") ?? ""); // LIVRE | RETOURNE
  const failureReason = String(formData.get("failureReason") ?? "").trim() || null;
  const actualAmountRaw = formData.get("actualAmount");
  const actualAmount = actualAmountRaw ? parseFloat(String(actualAmountRaw)) : null;

  if (!["LIVRE", "RETOURNE"].includes(newStatus)) redirect(`/livraisons`);

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: { include: { items: true, invoice: true } } },
  });
  if (!delivery) redirect("/livraisons");

  // Livreur ne peut mettre à jour que ses propres livraisons
  if (role === "LIVREUR" && delivery.livreurId !== userId) redirect("/livraisons");

  // Montant collecté : utiliser le tarif saisi ou le montant de la commande
  const amountCollected =
    newStatus === "LIVRE"
      ? (actualAmount !== null && actualAmount >= 0 ? actualAmount : delivery.order.totalAmount)
      : null;

  const orderCode = delivery.order.code;
  const agentWhoConfirmed = (delivery.order as any).validatedById as string | null;

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        deliveredAt: newStatus === "LIVRE" ? new Date() : null,
        amountCollected,
        failureReason: newStatus === "RETOURNE" ? failureReason : null,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus === "LIVRE" ? "LIVRE" : "RETOURNE" },
    });

    // Si livré : générer la facture COD automatiquement (payée à la livraison)
    if (newStatus === "LIVRE" && !delivery.order.invoice) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const reference = `FACT-${dateStr}-${suffix}`;
      // Utiliser le montant validé pour la facture
      const total = amountCollected ?? delivery.order.totalAmount;
      const deliveryFee = delivery.order.deliveryFee;
      const subtotal = total - deliveryFee;
      await tx.invoice.create({
        data: {
          reference,
          orderId,
          subtotal: Math.max(0, subtotal),
          deliveryFee,
          total,
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

  // Notifications livraison confirmée
  if (newStatus === "LIVRE") {
    const notifData = { orderId, orderCode };
    await notifyRole(["ADMIN", "MANAGER"], {
      type: "ORDER_DELIVERED",
      title: `🚚 Commande ${orderCode} livrée`,
      message: `Montant encaissé : ${Math.round(amountCollected ?? 0).toLocaleString("fr-FR")} GNF`,
      data: notifData,
    });
    if (agentWhoConfirmed) {
      await createNotification({
        userId: agentWhoConfirmed,
        type: "ORDER_DELIVERED",
        title: `🎉 Commande ${orderCode} livrée`,
        message: `La commande que vous avez confirmée a bien été livrée`,
        data: notifData,
      });
    }
  }

  redirect("/livraisons");
}

// ── Version sans redirect pour le mode mobile ──────────────────────────────
export async function updateDeliveryMobileAction(
  deliveryId: string,
  orderId: string,
  status: "LIVRE" | "RETOURNE",
  actualAmount?: number,
  failureReason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    if (!can(role, "UPDATE_DELIVERY_STATUS")) return { ok: false, error: "Non autorisé" };

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: { include: { items: true, invoice: true } } },
    });
    if (!delivery) return { ok: false, error: "Livraison introuvable" };
    if (role === "LIVREUR" && delivery.livreurId !== userId)
      return { ok: false, error: "Non autorisé" };

    const amountCollected =
      status === "LIVRE"
        ? (actualAmount !== undefined && actualAmount >= 0 ? actualAmount : delivery.order.totalAmount)
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status,
          deliveredAt: status === "LIVRE" ? new Date() : null,
          amountCollected,
          failureReason: status === "RETOURNE" ? (failureReason ?? null) : null,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: status === "LIVRE" ? "LIVRE" : "RETOURNE" },
      });

      if (status === "LIVRE" && !delivery.order.invoice) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const reference = `FACT-${dateStr}-${suffix}`;
        const total = amountCollected ?? delivery.order.totalAmount;
        const deliveryFee = delivery.order.deliveryFee;
        const subtotal = total - deliveryFee;
        await tx.invoice.create({
          data: {
            reference, orderId,
            subtotal: Math.max(0, subtotal),
            deliveryFee, total,
            status: "PAYEE", paidAt: new Date(),
          },
        });
      }

      if (status === "RETOURNE") {
        for (const item of delivery.order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId, type: "IN", quantity: item.quantity,
              reason: `Retour livraison commande ${delivery.order.code}`, orderId,
            },
          });
        }
      }
    });

    revalidatePath("/livraisons");
    revalidatePath(`/commandes/${orderId}`);

    // Notifications livraison mobile
    if (status === "LIVRE") {
      const code = delivery.order.code;
      const agentId = (delivery.order as any).validatedById as string | null;
      const notifData = { orderId, orderCode: code };
      await notifyRole(["ADMIN", "MANAGER"], {
        type: "ORDER_DELIVERED",
        title: `🚚 Commande ${code} livrée`,
        message: `Montant encaissé : ${Math.round(amountCollected ?? 0).toLocaleString("fr-FR")} GNF`,
        data: notifData,
      });
      if (agentId) {
        await createNotification({
          userId: agentId,
          type: "ORDER_DELIVERED",
          title: `🎉 Commande ${code} livrée`,
          message: `La commande que vous avez confirmée a bien été livrée`,
          data: notifData,
        });
      }
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erreur serveur" };
  }
}
