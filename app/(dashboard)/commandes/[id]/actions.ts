"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const ALLOWED_OUTCOMES = ["ANSWERED", "NO_ANSWER", "BUSY", "REPORTED", "CONFIRMED", "CANCELLED", "INJOIGNABLE"];

/**
 * Logger un appel sur une commande, et selon le résultat changer le statut
 */
export async function logCallAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  if (!can(role, "CALL_LOG")) redirect("/");
  if (!userId) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const reportDate = String(formData.get("reportDate") ?? "");
  const deliveryScheduledAt = String(formData.get("deliveryScheduledAt") ?? "");

  if (!orderId || !ALLOWED_OUTCOMES.includes(outcome)) {
    redirect(`/commandes/${orderId}?error=invalid`);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/commandes/liste");

  await prisma.$transaction(async (tx) => {
    await tx.callLog.create({
      data: { orderId, agentId: userId, outcome, note },
    });

    const updates: any = { callCount: { increment: 1 } };
    if (outcome === "REPORTED") {
      updates.status = "REPORTE";
      if (reportDate) updates.reportDate = new Date(reportDate);
    } else if (outcome === "NO_ANSWER" || outcome === "BUSY") {
      updates.status = "PDR";
    } else if (outcome === "CONFIRMED") {
      updates.status = "CONFIRME";
      updates.validatedById = userId;
      updates.validatedAt = new Date();
      if (deliveryScheduledAt) updates.deliveryScheduledAt = new Date(deliveryScheduledAt);
    } else if (outcome === "CANCELLED") {
      updates.status = "ANNULE";
    } else if (outcome === "INJOIGNABLE") {
      updates.status = "INJOIGNABLE";
    }
    await tx.order.update({ where: { id: orderId }, data: updates });

    // Si confirmé, décrémenter le stock
    if (outcome === "CONFIRMED") {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
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
    }
  });

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath("/commandes/confirmation");

  // Feedback visuel : si confirmé, rediriger vers la liste avec un message de succès
  if (outcome === "CONFIRMED") {
    redirect(`/commandes/confirmation?confirmed=${encodeURIComponent(order.code)}`);
  }
  redirect(`/commandes/${orderId}`);
}

export async function assignDeliveryAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "ASSIGN_DELIVERY")) redirect("/");

  const orderId = String(formData.get("orderId") ?? "");
  const livreurId = String(formData.get("livreurId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!orderId || !livreurId) redirect(`/commandes/${orderId}?error=missing`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });
  if (!order) redirect("/commandes/liste");

  await prisma.$transaction(async (tx) => {
    // Créer ou mettre à jour la livraison
    await tx.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        livreurId,
        cityId: order.cityId,
        notes,
        status: "ASSIGNED",
      },
      update: {
        livreurId,
        notes,
        status: "ASSIGNED",
      },
    });
    // Passer la commande en EN_LIVRAISON
    await tx.order.update({
      where: { id: orderId },
      data: { status: "EN_LIVRAISON" },
    });
  });

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath("/livraisons");
  redirect(`/commandes/${orderId}`);
}

/**
 * Réaffecter ou désaffecter une commande à un agent — ADMIN/MANAGER uniquement
 */
export async function reassignAgentAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const orderId = String(formData.get("orderId") ?? "");
  const agentId = String(formData.get("agentId") ?? "").trim();

  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: { assignedAgentId: agentId || null },
  });

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath("/commandes/confirmation");
  redirect(`/commandes/${orderId}`);
}

/**
 * Basculer frais livraison : gratuit ↔ payant par le client
 */
export async function toggleDeliveryFeeAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const orderId = String(formData.get("orderId") ?? "");
  const paidByClient = formData.get("deliveryPaidByClient") === "true";
  const cityDeliveryFee = parseFloat(String(formData.get("cityDeliveryFee") ?? "0")) || 0;

  const newDeliveryFee = paidByClient ? cityDeliveryFee : 0;

  // Récupérer le totalAmount actuel sans frais de livraison
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { totalAmount: true, deliveryFee: true } });
  if (!order) return;

  const baseAmount = order.totalAmount - order.deliveryFee; // montant produits seuls
  const newTotal = baseAmount + newDeliveryFee;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryPaidByClient: paidByClient,
      deliveryFee: newDeliveryFee,
      totalAmount: newTotal,
    },
  });

  revalidatePath(`/commandes/${orderId}`);
  redirect(`/commandes/${orderId}`);
}

/**
 * Re-traiter une commande retournée : remettre en NOUVEAU pour re-livraison
 * ADMIN / MANAGER uniquement
 */
export async function reprocessReturnAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  await prisma.$transaction(async (tx) => {
    // Remettre la commande en NOUVEAU
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "NOUVEAU",
        validatedById: null,
        validatedAt: null,
      },
    });
    // Annuler la livraison existante
    await tx.delivery.updateMany({
      where: { orderId, status: { in: ["ASSIGNED", "EN_ROUTE"] } },
      data: { status: "RETOURNE" },
    });
  });

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath("/commandes/confirmation");
  redirect(`/commandes/${orderId}`);
}

/**
 * Version "Express" du logCallAction — pas de redirect, retourne un résultat
 * Utilisé par le Mode Express Appel pour avancer automatiquement entre commandes
 */
export async function expressCallAction(
  formData: FormData
): Promise<{ ok: boolean; orderCode?: string; error?: string }> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  if (!can(role, "CALL_LOG") || !userId) return { ok: false, error: "Non autorisé" };

  const orderId = String(formData.get("orderId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const reportDate = String(formData.get("reportDate") ?? "");
  const deliveryScheduledAt = String(formData.get("deliveryScheduledAt") ?? "");

  if (!orderId || !ALLOWED_OUTCOMES.includes(outcome)) {
    return { ok: false, error: "Données invalides" };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Commande introuvable" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.callLog.create({
        data: { orderId, agentId: userId, outcome, note },
      });

      const updates: any = { callCount: { increment: 1 } };
      if (outcome === "REPORTED") {
        updates.status = "REPORTE";
        if (reportDate) updates.reportDate = new Date(reportDate);
      } else if (outcome === "NO_ANSWER" || outcome === "BUSY") {
        updates.status = "PDR";
      } else if (outcome === "CONFIRMED") {
        updates.status = "CONFIRME";
        updates.validatedById = userId;
        updates.validatedAt = new Date();
        if (deliveryScheduledAt) updates.deliveryScheduledAt = new Date(deliveryScheduledAt);
      } else if (outcome === "CANCELLED") {
        updates.status = "ANNULE";
      } else if (outcome === "INJOIGNABLE") {
        updates.status = "INJOIGNABLE";
      }
      await tx.order.update({ where: { id: orderId }, data: updates });

      if (outcome === "CONFIRMED") {
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              reason: `Commande ${order.code} confirmée (Express)`,
              orderId: order.id,
            },
          });
        }
      }
    });

    revalidatePath("/commandes/confirmation");
    revalidatePath("/commandes/express");
    return { ok: true, orderCode: order.code };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erreur serveur" };
  }
}

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "VALIDATE_ORDER")) redirect("/");

  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: { status, notes },
  });

  revalidatePath(`/commandes/${orderId}`);
  redirect(`/commandes/${orderId}`);
}
