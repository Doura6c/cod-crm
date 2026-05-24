"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleCrmAction(): Promise<void> {
  const session = await auth();
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin === true;
  const role = (session?.user as any)?.role;

  // Seul l'admin peut suspendre le CRM
  if (role !== "ADMIN" && !isSuperAdmin) redirect("/");

  const current = await prisma.setting.findUnique({ where: { key: "crm_active" } });
  const currentValue = current?.value ?? "true";
  const newValue = currentValue === "true" ? "false" : "true";

  await prisma.setting.upsert({
    where: { key: "crm_active" },
    update: { value: newValue },
    create: { key: "crm_active", value: newValue },
  });

  revalidatePath("/", "layout");
}
