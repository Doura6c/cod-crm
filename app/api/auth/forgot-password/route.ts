import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { isRateLimited } from "@/lib/rateLimit";
import { generateResetToken, buildResetEmail, RESET_TOKEN_TTL_MS } from "@/lib/passwordReset";

const resend = new Resend(process.env.RESEND_API_KEY);

// Réponse générique systématique : ne jamais révéler si un email existe (anti-énumération).
function generic() {
  return NextResponse.json({
    ok: true,
    message: "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
  });
}

function baseUrl(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("host");
  if (host) return `https://${host}`;
  return process.env.NEXTAUTH_URL ?? "https://cod-crm-zeta.vercel.app";
}

export async function POST(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // Anti-abus : 5 demandes / 15 min par email + 20 / 15 min par IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (
    (await isRateLimited(`pwreset:email:${email}`, 5)) ||
    (await isRateLimited(`pwreset:ip:${ip}`, 20))
  ) {
    // On renvoie quand même la réponse générique pour ne rien divulguer.
    return generic();
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, email: true, active: true },
  });

  // Seuls les comptes actifs reçoivent un lien ; sinon réponse générique silencieuse.
  if (user && user.active) {
    const { token, tokenHash } = generateResetToken();

    // Invalider les anciens tokens non utilisés de cet utilisateur.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${baseUrl(req)}/reinitialiser-mot-de-passe?token=${token}`;
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
        to: user.email,
        subject: "🔐 Réinitialisation de votre mot de passe — COD Manager",
        html: buildResetEmail(resetUrl, user.firstName),
      });
    } catch (err) {
      console.error("[forgot-password] email error:", err);
      // On ne révèle pas l'échec d'envoi côté client.
    }
  }

  return generic();
}
