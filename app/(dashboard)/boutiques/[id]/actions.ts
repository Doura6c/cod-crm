"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Désactiver (soft delete) — pour boutiques avec commandes */
export async function deactivateBoutiqueAction(boutiqueId: string): Promise<void> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN" || !user.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  await prisma.boutique.update({
    where: { id: boutiqueId },
    data: { active: false },
  });

  revalidatePath("/boutiques");
  redirect("/boutiques?deactivated=1");
}

/** Suppression définitive — seulement si 0 commande liée */
export async function deleteBoutiqueAction(boutiqueId: string): Promise<void> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN" || !user.isSuperAdmin) {
    throw new Error("Accès refusé");
  }

  // Vérification sécurité
  const orderCount = await prisma.order.count({ where: { boutiqueId } });
  if (orderCount > 0) {
    throw new Error(`Impossible : ${orderCount} commande(s) liée(s). Désactive la boutique à la place.`);
  }

  // Supprimer les produits d'abord (FK), puis la boutique
  await prisma.product.deleteMany({ where: { boutiqueId } });

  // Détacher les utilisateurs BOUTIQUE_OWNER liés
  await prisma.user.updateMany({
    where: { boutiqueId },
    data: { boutiqueId: null },
  });

  await prisma.boutique.delete({ where: { id: boutiqueId } });

  revalidatePath("/boutiques");
  redirect("/boutiques?deleted=1");
}
