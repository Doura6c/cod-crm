"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { isValidRole } from "@/lib/validate";

export async function updateCollaboratorAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin === true;
  if (role !== "ADMIN") redirect("/equipe");

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) redirect("/equipe");

  // Protect the super admin account from being edited by a regular admin
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  if (target?.isSuperAdmin && !isSuperAdmin) {
    redirect("/equipe?error=forbidden");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const newRole = String(formData.get("role") ?? "").trim();
  const active = formData.get("active") === "true";
  const newPassword = String(formData.get("password") ?? "").trim();
  const assignedCityId = String(formData.get("assignedCityId") ?? "").trim() || null;
  const subZone = String(formData.get("subZone") ?? "").trim() || null;
  const boutiqueId = String(formData.get("boutiqueId") ?? "").trim() || null;

  if (!firstName || !lastName || !email || !newRole) {
    redirect(`/equipe/${userId}/edit?error=missing`);
  }
  // E1 — Valider que le rôle est dans la liste autorisée (protection contre injection via formulaire)
  if (!isValidRole(newRole)) {
    redirect(`/equipe/${userId}/edit?error=forbidden-role`);
  }

  // Un Client Boutique doit être rattaché à une boutique
  if (newRole === "BOUTIQUE_OWNER" && !boutiqueId) {
    redirect(`/equipe/${userId}/edit?error=boutique-required`);
  }

  // Check email uniqueness (exclude current user)
  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (existing) {
    redirect(`/equipe/${userId}/edit?error=email-exists`);
  }

  const updateData: any = {
    firstName,
    lastName,
    email,
    phone: phone || null,
    role: newRole,
    active,
    assignedCityId: newRole === "LIVREUR" ? assignedCityId : null,
    subZone: newRole === "LIVREUR" ? subZone : null,
    // boutiqueId conservé uniquement pour les Clients Boutique, sinon détaché
    boutiqueId: newRole === "BOUTIQUE_OWNER" ? boutiqueId : null,
  };

  if (newPassword) {
    if (newPassword.length < 8) {
      redirect(`/equipe/${userId}/edit?error=password-short`);
    }
    updateData.passwordHash = await hash(newPassword, 12);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath("/equipe");
  revalidatePath(`/equipe/${userId}/edit`);
  redirect(`/equipe?success=${userId}`);
}
