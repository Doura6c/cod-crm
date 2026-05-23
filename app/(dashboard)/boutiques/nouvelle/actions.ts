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

  const name = String(formData.get("name") ?? "").trim();
  const sellerName = String(formData.get("sellerName") ?? "").trim();
  const sellerPhone = String(formData.get("sellerPhone") ?? "").trim() || null;
  const sellerEmail = String(formData.get("sellerEmail") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;

  if (!name || !sellerName) {
    redirect("/boutiques/nouvelle?error=missing");
  }

  let slug = slugify(name);
  // Vérifier l'unicité du slug
  const existing = await prisma.boutique.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
  }

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

  revalidatePath("/boutiques");
  redirect(`/boutiques/${boutique.id}/integration`);
}
