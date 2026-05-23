"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateAvatarAction(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return;

  // Limiter à 2MB
  if (file.size > 2 * 1024 * 1024) {
    redirect("/profil?error=size");
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: dataUrl },
  });

  revalidatePath("/profil");
  revalidatePath("/");
  redirect("/profil?success=avatar");
}

export async function updatePhoneAction(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");

  const phone = String(formData.get("phone") ?? "").trim();

  await prisma.user.update({
    where: { id: userId },
    data: { phone: phone || null },
  });

  revalidatePath("/profil");
  redirect("/profil?success=phone");
}

export async function removeAvatarAction(): Promise<void> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  revalidatePath("/profil");
  redirect("/profil");
}
