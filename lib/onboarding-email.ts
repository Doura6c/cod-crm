import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type Role = "ADMIN" | "MANAGER" | "AGENT" | "LIVREUR" | "BOUTIQUE_OWNER";

const GUIDE_BY_ROLE: Record<Role, { file: string; label: string }> = {
  ADMIN: { file: "onboarding-ADMIN.pdf", label: "Administrateur" },
  MANAGER: { file: "onboarding-MANAGER.pdf", label: "Superviseur" },
  AGENT: { file: "onboarding-AGENT.pdf", label: "Agent Call Center" },
  LIVREUR: { file: "onboarding-LIVREUR.pdf", label: "Livreur" },
  BOUTIQUE_OWNER: { file: "onboarding-BOUTIQUE_OWNER.pdf", label: "Boutique partenaire" },
};

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://cod-crm-zeta.vercel.app";
}

/** Récupère le PDF : lecture disque (dev / bundle) sinon fetch de l'URL publique (Vercel). */
async function loadGuide(file: string): Promise<Buffer> {
  const localPath = path.join(process.cwd(), "public", "guides", file);
  try {
    return await fs.promises.readFile(localPath);
  } catch {
    const res = await fetch(`${baseUrl()}/guides/${file}`);
    if (!res.ok) throw new Error(`Guide introuvable (${res.status}) : ${file}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

export interface OnboardingRecipient {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
}

/**
 * Envoie au nouvel utilisateur le guide d'onboarding (PDF) correspondant à son rôle.
 * Ne lève jamais : renvoie { ok } pour ne pas bloquer la création du compte.
 */
export async function sendOnboardingGuide(
  user: OnboardingRecipient
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const guide = GUIDE_BY_ROLE[user.role as Role];
  if (!guide) return { ok: false, skipped: true, error: `Rôle sans guide : ${user.role}` };
  if (!user.email) return { ok: false, skipped: true, error: "Email manquant" };

  try {
    const pdf = await loadGuide(guide.file);
    const prenom = (user.firstName ?? "").trim();

    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
      to: user.email,
      subject: `Bienvenue sur le CRM COD — Votre guide ${guide.label}`,
      html: buildEmail(prenom, guide.label),
      attachments: [
        { filename: `Guide-onboarding-${guide.label.replace(/\s+/g, "-")}.pdf`, content: pdf },
      ],
    });

    return { ok: true };
  } catch (err: any) {
    console.error("[onboarding-email]", err);
    return { ok: false, error: err?.message ?? "Erreur envoi du guide" };
  }
}

function buildEmail(prenom: string, roleLabel: string): string {
  const bonjour = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <tr>
    <td style="background:#002C6E;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
        Help<span style="color:#E8001C;">Me</span>Process
      </h1>
      <p style="margin:8px 0 0;color:#bcd0ec;font-size:14px;">CRM COD — Bienvenue dans l'équipe</p>
    </td>
  </tr>

  <tr>
    <td style="padding:32px 40px 0;">
      <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
        ${bonjour}<br/><br/>
        Votre compte sur le <strong>CRM COD de HelpMeProcess</strong> a été créé avec le profil
        <strong>${roleLabel}</strong>.<br/>
        Vous trouverez en pièce jointe votre <strong>guide d'onboarding</strong> au format PDF :
        il décrit pas à pas la connexion, vos fonctionnalités, les procédures clés et les bonnes
        pratiques propres à votre rôle.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
            <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Accès à l'application</div>
            <a href="https://cod-crm-zeta.vercel.app/login" style="font-size:15px;color:#002C6E;font-weight:700;text-decoration:none;">https://cod-crm-zeta.vercel.app/login</a>
            <div style="font-size:12px;color:#64748b;margin-top:8px;">Connectez-vous avec l'e-mail et le mot de passe qui vous ont été communiqués, et changez votre mot de passe à la première connexion.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 40px 0;">
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;">
        <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.5;">
          📎 <strong>Guide ${roleLabel}</strong> joint à cet e-mail (PDF). Conservez-le : il vous servira de référence au quotidien.
        </p>
      </div>
    </td>
  </tr>

  <tr>
    <td style="padding:32px 40px;text-align:center;border-top:1px solid #e2e8f0;margin-top:24px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        E-mail envoyé automatiquement par <strong>HelpMeProcess COD CRM</strong><br/>
        Conakry, Guinée — Document confidentiel réservé aux utilisateurs autorisés.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
