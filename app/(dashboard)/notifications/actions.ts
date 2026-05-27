"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function markAllReadAction(): Promise<void> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}

export async function markOneReadAction(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}
