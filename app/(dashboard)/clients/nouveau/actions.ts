"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clean } from "@/lib/validate";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createClientAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const fullName  = clean(formData.get("fullName"), 100);
  const phone     = clean(formData.get("phone"), 20).replace(/\s/g, "");
  const altPhone  = clean(formData.get("altPhone"), 20).replace(/\s/g, "") || null;
  const address   = clean(formData.get("address"), 300) || null;
  const commune   = clean(formData.get("commune"), 100) || null;
  const cityName  = clean(formData.get("cityName"), 100);
  const notes     = clean(formData.get("notes"), 500) || null;

  if (!fullName || !phone) {
    redirect("/clients/nouveau?error=missing");
  }

  // Vérifier doublon téléphone
  const existing = await prisma.customer.findFirst({ where: { phone } });
  if (existing) {
    redirect(`/clients/nouveau?error=duplicate&phone=${encodeURIComponent(phone)}`);
  }

  // Ville
  let cityId: string | null = null;
  if (cityName) {
    const city = await prisma.city.upsert({
      where: { name: cityName },
      create: { name: cityName },
      update: {},
    });
    cityId = city.id;
  }

  const customer = await prisma.customer.create({
    data: {
      fullName,
      phone,
      altPhone,
      address,
      commune,
      cityId,
      notes,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients?created=${customer.id}`);
}
