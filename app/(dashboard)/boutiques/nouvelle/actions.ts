"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomKey } from "@/lib/utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createBoutiqueAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name        = String(formData.get("name") ?? "").trim();
  const sellerName  = String(formData.get("sellerName") ?? "").trim();
  const sellerPhone = String(formData.get("sellerPhone") ?? "").trim() || null;
  const sellerEmail = String(formData.get("sellerEmail") ?? "").trim() || null;
  const website     = String(formData.get("website") ?? "").trim() || null;

  // Nouveaux champs onboarding — stockés en note structurée
  const productType       = String(formData.get("productType") ?? "").trim();
  const volumeEstimate    = String(formData.get("volumeEstimate") ?? "").trim();
  const deliveryZone      = String(formData.get("deliveryZone") ?? "").trim();
  const deliveryPaidBy    = String(formData.get("deliveryPaidBy") ?? "").trim();
  const processingTime    = String(formData.get("processingTime") ?? "").trim();
  const returnPolicy      = String(formData.get("returnPolicy") ?? "").trim();
  const productCount      = String(formData.get("productCount") ?? "").trim();
  const integrationMethod = String(formData.get("integrationMethod") ?? "").trim();
  const sellerWhatsapp    = String(formData.get("sellerWhatsapp") ?? "").trim();
  const notes             = String(formData.get("notes") ?? "").trim();

  if (!name || !sellerName) {
    redirect("/boutiques/nouvelle?error=missing");
  }

  let slug = slugify(name);
  const existing = await prisma.boutique.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;

  // Construire une note structurée avec toutes les infos onboarding
  const onboardingNote = [
    productType       && `Type produits: ${productType}`,
    volumeEstimate    && `Volume estimé: ${volumeEstimate}`,
    deliveryZone      && `Zones livraison: ${deliveryZone}`,
    deliveryPaidBy    && `Livraison payée par: ${deliveryPaidBy}`,
    processingTime    && `Délai traitement: ${processingTime}`,
    returnPolicy      && `Politique retour: ${returnPolicy}`,
    productCount      && `Nb références: ${productCount}`,
    integrationMethod && `Intégration: ${integrationMethod}`,
    sellerWhatsapp    && `WhatsApp vendeur: ${sellerWhatsapp}`,
    notes             && `Notes: ${notes}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const boutique = await prisma.boutique.create({
    data: {
      name,
      slug,
      sellerName,
      sellerPhone,
      sellerEmail,
      website,
      webhookKey: randomKey(40),
    },
  });

  // Sauvegarder les infos onboarding dans un setting dédié
  if (onboardingNote) {
    await prisma.setting.upsert({
      where: { key: `boutique_onboarding_${boutique.id}` },
      create: { key: `boutique_onboarding_${boutique.id}`, value: onboardingNote },
      update: { value: onboardingNote },
    });
  }

  revalidatePath("/boutiques");
  redirect(`/boutiques/${boutique.id}/integration`);
}
