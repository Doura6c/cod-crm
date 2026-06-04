import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { isRateLimited } from "@/lib/rateLimit";
import { hashResetToken } from "@/lib/passwordReset";

export async function POST(req: Request) {
  let token = "";
  let password = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "").trim();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  // Anti-brute-force sur la validation de token.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`pwreset-confirm:ip:${ip}`, 30)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, active: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user?.active) {
    return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  // Mise à jour atomique : on change le mot de passe, on marque le token utilisé,
  // et on supprime tout autre token en attente pour ce compte.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
}
