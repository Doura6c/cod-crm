"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clean, isEmail, isValidRole } from "@/lib/validate";

export async function createUserAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "CREATE_USER")) redirect("/");

  const firstName  = clean(formData.get("firstName"), 50);
  const lastName   = clean(formData.get("lastName"), 50);
  const email      = clean(formData.get("email"), 254).toLowerCase();
  const phone      = clean(formData.get("phone"), 20) || null;
  const newRole    = clean(formData.get("role"), 20) || "AGENT";
  const password   = String(formData.get("password") ?? "").slice(0, 200);
  const boutiqueId = clean(formData.get("boutiqueId"), 50) || null;

  // Validation
  if (!firstName || !lastName || !email || !password) {
    redirect("/equipe/nouveau?error=missing");
  }
  if (!isEmail(email)) {
    redirect("/equipe/nouveau?error=email-invalid");
  }
  if (password.length < 8) {
    redirect("/equipe/nouveau?error=password-short");
  }
  if (!isValidRole(newRole)) {
    redirect("/equipe/nouveau?error=forbidden-role");
  }
  // Seul un Admin peut créer un Admin ou un BOUTIQUE_OWNER
  if ((newRole === "ADMIN" || newRole === "BOUTIQUE_OWNER") && !can(role, "CREATE_ADMIN")) {
    redirect("/equipe/nouveau?error=forbidden-role");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/equipe/nouveau?error=email-exists");
  }

  // bcrypt cost 12 (plus sécurisé que 10)
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      role: newRole,
      passwordHash,
      ...(newRole === "BOUTIQUE_OWNER" && boutiqueId ? { boutiqueId } : {}),
    },
  });

  revalidatePath("/equipe");
  redirect("/equipe?created=1");
}
