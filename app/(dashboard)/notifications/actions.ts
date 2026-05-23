"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function markAllReadAction(): Promise<void> {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/");

  await prisma.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}

export async function markOneReadAction(formData: FormData): Promise<void> {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}
