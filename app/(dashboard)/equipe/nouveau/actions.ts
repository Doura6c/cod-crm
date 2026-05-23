"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "CREATE_USER")) redirect("/");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const newRole = String(formData.get("role") ?? "AGENT");
  const password = String(formData.get("password") ?? "");

  if (!firstName || !lastName || !email || !password) {
    redirect("/equipe/nouveau?error=missing");
  }
  if (password.length < 6) {
    redirect("/equipe/nouveau?error=password-short");
  }
  // Seul un Admin peut créer un Admin
  if (newRole === "ADMIN" && !can(role, "CREATE_ADMIN")) {
    redirect("/equipe/nouveau?error=forbidden-role");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/equipe/nouveau?error=email-exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      role: newRole,
      passwordHash,
    },
  });

  revalidatePath("/equipe");
  redirect("/equipe?created=1");
}
