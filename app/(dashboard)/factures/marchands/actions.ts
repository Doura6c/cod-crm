"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const HMP_FEE = 70_000;
const PERIOD_DAYS = 2; // facture générée toutes les N jours

function makeRef(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const s = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `FACM-${d}-${s}`;
}

/**
 * Génère les factures marchandes pour toutes les boutiques.
 * Regroupe les commandes LIVRE non encore facturées en tranches de PERIOD_DAYS jours.
 */
export async function generateMerchantInvoicesAction(): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "VIEW_BOUTIQUES")) redirect("/");

  const boutiques = await prisma.boutique.findMany({ select: { id: true } });

  for (const boutique of boutiques) {
    // Récupère toutes les commandes LIVRE de cette boutique sans facture marchand
    // On se base sur les deliveries LIVRE dont l'orderId n'est pas encore couvert
    const alreadyInvoicedOrders = await prisma.merchantInvoice.findMany({
      where: { boutiqueId: boutique.id },
      select: { periodStart: true, periodEnd: true },
    });

    // Récupère toutes les livraisons LIVRE pour la boutique
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: "LIVRE",
        order: { boutiqueId: boutique.id },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { deliveredAt: "asc" },
    });

    if (deliveries.length === 0) continue;

    // Filtre : exclure les livraisons déjà couvertes par une facture marchande existante
    const uncovered = deliveries.filter((d) => {
      if (!d.deliveredAt) return false;
      const dt = new Date(d.deliveredAt);
      return !alreadyInvoicedOrders.some(
        (inv) =>
          dt >= new Date(inv.periodStart) && dt <= new Date(inv.periodEnd)
      );
    });

    if (uncovered.length === 0) continue;

    // Groupe par tranches de PERIOD_DAYS jours
    const groups: Map<string, typeof uncovered> = new Map();
    for (const d of uncovered) {
      if (!d.deliveredAt) continue;
      const dt = new Date(d.deliveredAt);
      // Calcule le début de la tranche : floor(daysSinceEpoch / PERIOD_DAYS) * PERIOD_DAYS
      const epochDays = Math.floor(dt.getTime() / (1000 * 60 * 60 * 24 * PERIOD_DAYS));
      const key = String(epochDays);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }

    for (const [key, group] of groups) {
      if (group.length === 0) continue;

      const epochDays = parseInt(key);
      const periodStart = new Date(epochDays * PERIOD_DAYS * 24 * 60 * 60 * 1000);
      const periodEnd = new Date((epochDays + 1) * PERIOD_DAYS * 24 * 60 * 60 * 1000 - 1);

      const orderCount = group.length;
      const productCount = group.reduce(
        (s, d) => s + d.order.items.reduce((a, it) => a + it.quantity, 0),
        0
      );
      const totalGross = group.reduce(
        (s, d) => s + (d.amountCollected ?? d.order.totalAmount),
        0
      );
      const totalProducts = group.reduce(
        (s, d) => s + ((d.amountCollected ?? d.order.totalAmount) - d.order.deliveryFee),
        0
      );
      const fraisHMP = orderCount * HMP_FEE;
      const netMarchand = Math.max(0, totalProducts - fraisHMP);

      await prisma.merchantInvoice.create({
        data: {
          reference: makeRef(),
          boutiqueId: boutique.id,
          periodStart,
          periodEnd,
          orderCount,
          productCount,
          totalGross,
          totalProducts,
          fraisHMP,
          netMarchand,
          status: "EN_ATTENTE",
        },
      });
    }
  }

  revalidatePath("/factures/marchands");
}

/**
 * Met à jour le statut d'une facture marchande (Payée / En attente / Annulée)
 */
export async function updateMerchantInvoiceStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const newStatus = String(formData.get("status") ?? "");
  if (!["EN_ATTENTE", "PAYEE", "ANNULEE"].includes(newStatus)) return;

  await prisma.merchantInvoice.update({
    where: { id: invoiceId },
    data: {
      status: newStatus,
      paidAt: newStatus === "PAYEE" ? new Date() : null,
    },
  });

  revalidatePath("/factures/marchands");
}
