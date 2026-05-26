"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomKey } from "@/lib/utils";
import { clean } from "@/lib/validate";
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

  // Identité
  const name           = clean(formData.get("name"), 100);
  const sellerName     = clean(formData.get("sellerName"), 100);
  const sellerPhone    = clean(formData.get("sellerPhone"), 20) || null;
  const sellerEmail    = clean(formData.get("sellerEmail"), 100) || null;
  const website        = clean(formData.get("website"), 200) || null;

  if (!name || !sellerName) redirect("/boutiques/nouvelle?error=missing");

  // Stratégie COD
  const avgOrderValue       = clean(formData.get("avgOrderValue"), 20);
  const volumeEstimate      = clean(formData.get("volumeEstimate"), 50);
  const confirmationTarget  = clean(formData.get("confirmationTarget"), 10);
  const processingTime      = clean(formData.get("processingTime"), 20);
  const deliveryZone        = clean(formData.get("deliveryZone"), 50);
  const deliveryPaidBy      = clean(formData.get("deliveryPaidBy"), 20);
  const returnPolicy        = clean(formData.get("returnPolicy"), 50);
  const maxCallAttempts     = clean(formData.get("maxCallAttempts"), 5);

  // Marketing
  const trafficSource   = clean(formData.get("trafficSource"), 50);
  const adBudget        = clean(formData.get("adBudget"), 20);
  const fbPixelId       = clean(formData.get("fbPixelId"), 50);
  const currentPromo    = clean(formData.get("currentPromo"), 200);
  const targetAudience  = clean(formData.get("targetAudience"), 200);
  const sellerWhatsapp  = clean(formData.get("sellerWhatsapp"), 20);
  const productType     = clean(formData.get("productType"), 50);
  const productCount    = clean(formData.get("productCount"), 50);

  // Script agents
  const salesArguments  = clean(formData.get("salesArguments"), 1000);
  const salesObjections = clean(formData.get("salesObjections"), 1000);
  const notes           = clean(formData.get("notes"), 500);

  // Slug unique
  let slug = slugify(name);
  const existing = await prisma.boutique.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;

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

  // Stocker toutes les infos onboarding dans les settings
  const onboardingData = JSON.stringify({
    // COD
    avgOrderValue, volumeEstimate, confirmationTarget,
    processingTime, deliveryZone, deliveryPaidBy,
    returnPolicy, maxCallAttempts,
    // Marketing
    trafficSource, adBudget, fbPixelId,
    currentPromo, targetAudience,
    sellerWhatsapp, productType, productCount,
    // Script
    salesArguments, salesObjections, notes,
  });

  await prisma.setting.upsert({
    where: { key: `boutique_onboarding_${boutique.id}` },
    create: { key: `boutique_onboarding_${boutique.id}`, value: onboardingData },
    update: { value: onboardingData },
  });

  revalidatePath("/boutiques");
  redirect(`/boutiques/${boutique.id}/importer`);
}
