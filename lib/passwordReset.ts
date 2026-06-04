import { randomBytes, createHash } from "crypto";

// Durée de validité d'un lien de réinitialisation
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

// Génère un token aléatoire (envoyé par email) et son hash (stocké en base).
// On ne stocke jamais le token en clair : seul le hash permet de retrouver la demande.
export function generateResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildResetEmail(resetUrl: string, firstName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Réinitialisation de votre mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 40px;text-align:center;">
      <div style="font-size:30px;margin-bottom:8px;">🔐</div>
      <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:700;">Réinitialisation du mot de passe</h1>
      <p style="margin:8px 0 0;color:#bae6fd;font-size:13px;">HelpMeProcess COD Manager</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;">
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
        Bonjour ${firstName},<br/><br/>
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous
        pour en choisir un nouveau. Ce lien est valable <strong>1 heure</strong> et ne peut servir
        qu'une seule fois.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;">
          Choisir un nouveau mot de passe
        </a>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <span style="color:#0369a1;word-break:break-all;">${resetUrl}</span>
      </p>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe
        reste inchangé.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        HelpMeProcess COD Manager — message automatique, ne pas répondre.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
