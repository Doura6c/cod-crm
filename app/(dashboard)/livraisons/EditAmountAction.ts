"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function editDeliveryAmountAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.name ?? role;

  // Seuls ADMIN et MANAGER peuvent modifier un montant après livraison
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/livraisons");

  const deliveryId = String(formData.get("deliveryId") ?? "");
  const newAmount = parseFloat(String(formData.get("newAmount") ?? "0"));
  const editNote = String(formData.get("editNote") ?? "").trim() || "Correction du montant";

  if (!deliveryId || isNaN(newAmount) || newAmount <= 0) return;

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: { select: { id: true, code: true, totalAmount: true, boutiqueId: true } } },
  });
  if (!delivery || delivery.status !== "LIVRE") return;

  const oldAmount = delivery.amountCollected ?? delivery.order.totalAmount;

  await prisma.$transaction(async (tx) => {
    // Mise à jour livraison
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        amountCollected:  newAmount,
        originalAmount:   delivery.originalAmount ?? oldAmount, // garde le tout 1er montant
        amountEditNote:   editNote,
        amountEditedById: userId,
        amountEditedAt:   new Date(),
      },
    });

    // Mise à jour facture liée
    const invoice = await tx.invoice.findUnique({ where: { orderId: delivery.order.id } });
    if (invoice) {
      const deliveryFee = invoice.deliveryFee;
      const subtotal = Math.max(0, newAmount - deliveryFee);
      await tx.invoice.update({
        where: { orderId: delivery.order.id },
        data: { total: newAmount, subtotal },
      });
    }

    // Créer une notification pour l'admin
    if (role === "MANAGER") {
      const diff = newAmount - oldAmount;
      await tx.notification.create({
        data: {
          type: "AMOUNT_EDITED",
          title: `Montant modifié — ${delivery.order.code}`,
          message: `${userName} a modifié le montant encaissé : ${Math.round(oldAmount).toLocaleString("fr-FR")} → ${Math.round(newAmount).toLocaleString("fr-FR")} GNF (${diff >= 0 ? "+" : ""}${Math.round(diff).toLocaleString("fr-FR")} GNF). Raison : ${editNote}`,
          data: JSON.stringify({ deliveryId, orderId: delivery.order.id, oldAmount, newAmount, editedBy: userId }),
        },
      });
    }
  });

  revalidatePath("/livraisons");
  revalidatePath(`/commandes/${delivery.order.id}`);
}
