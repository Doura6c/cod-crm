"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

// ── Superviseur : soumettre une demande de création d'agent ──────────────────
export async function requestCreateAgentAction(formData: FormData): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  if (role !== "MANAGER") redirect("/equipe");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName  = String(formData.get("lastName")  ?? "").trim();
  const email     = String(formData.get("email")     ?? "").trim().toLowerCase();
  const phone     = String(formData.get("phone")     ?? "").trim() || null;
  const password  = String(formData.get("password")  ?? "").trim();

  if (!firstName || !lastName || !email || !password) redirect("/equipe/nouveau?error=missing");
  if (password.length < 6) redirect("/equipe/nouveau?error=password-short");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) redirect("/equipe/nouveau?error=email-exists");

  const id = `treq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await (prisma as any).teamRequest.create({
    data: {
      id,
      type: "CREATE_AGENT",
      status: "PENDING",
      requestedById: userId,
      requestData: JSON.stringify({ firstName, lastName, email, phone, password, role: "AGENT" }),
    },
  });

  revalidatePath("/equipe");
  redirect("/equipe?requested=1");
}

// ── Superviseur : soumettre une demande de suppression d'agent ───────────────
export async function requestDeleteAgentAction(agentId: string, agentName: string): Promise<void> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  if (role !== "MANAGER") return;

  const id = `treq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await (prisma as any).teamRequest.create({
    data: {
      id,
      type: "DELETE_AGENT",
      status: "PENDING",
      requestedById: userId,
      targetUserId: agentId,
      targetName: agentName,
    },
  });

  revalidatePath("/equipe");
}

// ── Admin : approuver une demande ────────────────────────────────────────────
export async function approveTeamRequestAction(requestId: string): Promise<{ error?: string }> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const adminId = (session?.user as any)?.id;
  if (role !== "ADMIN") return { error: "Accès refusé." };

  const req = await (prisma as any).teamRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") return { error: "Demande introuvable ou déjà traitée." };

  if (req.type === "CREATE_AGENT") {
    const data = JSON.parse(req.requestData ?? "{}");
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      await (prisma as any).teamRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", adminNote: "Email déjà utilisé par un autre compte.", reviewedById: adminId, reviewedAt: new Date() },
      });
      revalidatePath("/equipe/demandes");
      return { error: "Email déjà utilisé. Demande rejetée automatiquement." };
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await prisma.user.create({
      data: {
        id: userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        role: "AGENT",
        passwordHash,
      },
    });
  } else if (req.type === "DELETE_AGENT") {
    if (req.targetUserId) {
      await prisma.user.update({
        where: { id: req.targetUserId },
        data: { active: false },
      });
    }
  }

  await (prisma as any).teamRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", reviewedById: adminId, reviewedAt: new Date() },
  });

  revalidatePath("/equipe");
  revalidatePath("/equipe/demandes");
  return {};
}

// ── Admin : rejeter une demande ──────────────────────────────────────────────
export async function rejectTeamRequestAction(requestId: string, note: string): Promise<{ error?: string }> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const adminId = (session?.user as any)?.id;
  if (role !== "ADMIN") return { error: "Accès refusé." };

  await (prisma as any).teamRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", adminNote: note || "Demande rejetée.", reviewedById: adminId, reviewedAt: new Date() },
  });

  revalidatePath("/equipe/demandes");
  return {};
}
