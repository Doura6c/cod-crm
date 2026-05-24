"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

function checkAccess(role: string | undefined) {
  if (!can(role, "VIEW_DELIVERY_SETTINGS")) redirect("/");
}

export async function updateCityAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  checkAccess((session?.user as any)?.role);

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const deliveryFee = parseFloat(String(formData.get("deliveryFee") ?? "0").replace(/\s/g, ""));
  const estimatedDays = parseInt(String(formData.get("estimatedDays") ?? "1"), 10);

  if (!id || !name) return { error: "Champs obligatoires manquants." };
  if (isNaN(deliveryFee) || deliveryFee < 0) return { error: "Frais invalides." };
  if (isNaN(estimatedDays) || estimatedDays < 1) return { error: "Délai invalide." };

  await prisma.city.update({
    where: { id },
    data: { name, deliveryFee, estimatedDays },
  });

  revalidatePath("/livraison");
  return {};
}

export async function createCityAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  checkAccess((session?.user as any)?.role);

  const name = String(formData.get("name") ?? "").trim();
  const deliveryFee = parseFloat(String(formData.get("deliveryFee") ?? "0").replace(/\s/g, ""));
  const estimatedDays = parseInt(String(formData.get("estimatedDays") ?? "1"), 10);

  if (!name) return { error: "Le nom de la ville est obligatoire." };
  if (isNaN(deliveryFee) || deliveryFee < 0) return { error: "Frais invalides." };

  const exists = await prisma.city.findUnique({ where: { name } });
  if (exists) return { error: "Cette ville existe déjà." };

  await prisma.city.create({
    data: { name, deliveryFee, estimatedDays: isNaN(estimatedDays) ? 1 : estimatedDays },
  });

  revalidatePath("/livraison");
  return {};
}

export async function deleteCityAction(id: string): Promise<{ error?: string }> {
  const session = await auth();
  checkAccess((session?.user as any)?.role);

  // Vérifier si la ville est utilisée
  const used = await prisma.order.count({ where: { cityId: id } });
  if (used > 0) return { error: `Cette ville est liée à ${used} commande(s). Impossible de la supprimer.` };

  await prisma.city.delete({ where: { id } });
  revalidatePath("/livraison");
  return {};
}
