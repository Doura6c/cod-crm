"use server";

import { auth } from "@/auth";
import { setSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") redirect("/");

  const commission = formData.get("hmp_commission");
  const companyName = formData.get("company_name");
  const currency = formData.get("currency");

  if (commission) {
    const val = parseFloat(String(commission));
    if (!isNaN(val) && val > 0) {
      await setSetting("hmp_commission", String(Math.round(val)));
    }
  }
  if (companyName) await setSetting("company_name", String(companyName));
  if (currency) await setSetting("currency", String(currency));

  revalidatePath("/parametres");
  revalidatePath("/");
}
