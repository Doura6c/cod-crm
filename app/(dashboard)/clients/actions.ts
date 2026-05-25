"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clean } from "@/lib/validate";

/** Blacklister ou retirer de la blacklist un client */
export async function toggleBlacklistAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/clients");

  const customerId = clean(formData.get("customerId"), 50);
  const action = String(formData.get("action") ?? ""); // "blacklist" | "unblacklist"
  const reason = clean(formData.get("reason"), 300);

  if (!customerId) return;

  if (action === "blacklist") {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        blacklisted: true,
        blacklistReason: reason || "Non spécifié",
        blacklistedAt: new Date(),
      },
    });
  } else {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        blacklisted: false,
        blacklistReason: null,
        blacklistedAt: null,
      },
    });
  }

  revalidatePath("/clients");
  revalidatePath(`/clients`);
}
