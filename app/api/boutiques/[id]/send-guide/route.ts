import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const WEBHOOK_URL = "https://cod-crm-zeta.vercel.app/api/webhook/order";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const { id } = await params;
  const boutique = await prisma.boutique.findUnique({ where: { id } });
  if (!boutique) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const body = await req.json();
  const toEmail: string = body.email?.trim();
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const html = buildGuideEmail(escapeHtml(boutique.name), boutique.webhookKey, WEBHOOK_URL);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
      to: toEmail,
      subject: `🔗 Guide d'intégration COD CRM — ${boutique.name}`,
      html,
    });

    return NextResponse.json({ ok: true, message: `Guide envoyé à ${toEmail}` });
  } catch (err: any) {
    console.error("[send-guide]", err);
    return NextResponse.json({ error: err.message ?? "Erreur envoi email" }, { status: 500 });
  }
}

function buildGuideEmail(boutiqueName: string, webhookKey: string, webhookUrl: string): string {
  const code = `async function envoyerAuCRM(commande) {
  const res = await fetch("${webhookUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Key": "${webhookKey}"
    },
    body: JSON.stringify({
      externalRef: commande.id,
      customer: {
        fullName: commande.clientNom,
        phone:    commande.clientTel,
        address:  commande.adresse,
        city:     commande.ville
      },
      items: commande.produits.map(p => ({
        sku:      p.reference,
        name:     p.nom,
        price:    p.prix,
        quantity: p.quantite
      })),
      deliveryFee: commande.fraisLivraison || 0,
      notes: commande.note || ""
    })
  });
  return res.json();
}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Guide intégration COD CRM — ${boutiqueName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:36px 40px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🔗</div>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Guide d'intégration COD CRM</h1>
      <p style="margin:8px 0 0;color:#bae6fd;font-size:14px;">Boutique : <strong>${boutiqueName}</strong></p>
    </td>
  </tr>

  <!-- Intro -->
  <tr>
    <td style="padding:32px 40px 0;">
      <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
        Bonjour,<br/><br/>
        Voici les informations d'intégration pour connecter votre boutique <strong>${boutiqueName}</strong>
        au système COD CRM de <strong>HelpMeProcess</strong>.<br/>
        À chaque commande validée sur votre site, envoyez les données via le webhook ci-dessous.
      </p>
    </td>
  </tr>

  <!-- Identifiants -->
  <tr>
    <td style="padding:24px 40px 0;">
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
        🔑 Identifiants webhook
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:4px;">URL Webhook</div>
            <code style="font-family:monospace;font-size:13px;color:#0369a1;word-break:break-all;">${webhookUrl}</code>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px;background:#fffbeb;border-radius:8px;border:2px solid #fbbf24;">
            <div style="font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;margin-bottom:4px;">⚠️ Clé secrète (X-Webhook-Key)</div>
            <code style="font-family:monospace;font-size:13px;color:#92400e;word-break:break-all;font-weight:700;">${webhookKey}</code>
            <div style="font-size:11px;color:#b45309;margin-top:6px;">Ne partagez pas cette clé. Elle est unique à votre boutique.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Code -->
  <tr>
    <td style="padding:24px 40px 0;">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:700;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
        💻 Code à intégrer
      </h2>
      <p style="margin:0 0 12px;color:#475569;font-size:13px;">
        Ajoutez cette fonction sur la page de confirmation de commande de votre site :
      </p>
      <div style="background:#0f172a;border-radius:10px;padding:20px;overflow-x:auto;">
        <pre style="margin:0;color:#e2e8f0;font-family:monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all;">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </div>
    </td>
  </tr>

  <!-- Champs obligatoires -->
  <tr>
    <td style="padding:24px 40px 0;">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:700;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
        📋 Champs obligatoires
      </h2>
      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <tr style="background:#f8fafc;">
          <th style="text-align:left;color:#475569;font-weight:700;padding:10px 12px;border-bottom:1px solid #e2e8f0;">Champ</th>
          <th style="text-align:left;color:#475569;font-weight:700;padding:10px 12px;border-bottom:1px solid #e2e8f0;">Obligatoire</th>
          <th style="text-align:left;color:#475569;font-weight:700;padding:10px 12px;border-bottom:1px solid #e2e8f0;">Description</th>
        </tr>
        ${[
          ["customer.phone", "✅ OUI", "Téléphone du client (identifiant unique)"],
          ["items", "✅ OUI", "Au moins 1 produit avec name + price"],
          ["externalRef", "Recommandé", "ID commande côté boutique (évite les doublons)"],
          ["customer.fullName", "Non", "Nom complet du client"],
          ["customer.address", "Non", "Adresse de livraison"],
          ["customer.city", "Non", "Ville de livraison"],
          ["deliveryFee", "Non", "Frais de livraison (0 si gratuit)"],
        ].map(([field, req, desc]) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 12px;"><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;color:#0369a1;">${field}</code></td>
          <td style="padding:8px 12px;color:${req.includes("OUI") ? "#16a34a" : "#64748b"};font-weight:${req.includes("OUI") ? "700" : "400"};">${req}</td>
          <td style="padding:8px 12px;color:#64748b;">${desc}</td>
        </tr>`).join("")}
      </table>
    </td>
  </tr>

  <!-- Test -->
  <tr>
    <td style="padding:24px 40px 0;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;">
        <h3 style="margin:0 0 8px;color:#15803d;font-size:14px;">✅ Comment tester ?</h3>
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.5;">
          Effectuez une commande test sur votre site → vérifiez avec HelpMeProcess que la commande
          apparaît dans le CRM avec le statut <strong>NOUVEAU</strong>. En cas de problème,
          contactez-nous sur WhatsApp.
        </p>
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:32px 40px;text-align:center;border-top:1px solid #e2e8f0;margin-top:24px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Ce guide a été généré automatiquement par <strong>HelpMeProcess COD CRM</strong><br/>
        Des questions ? Contactez-nous sur WhatsApp : <strong>+224 621 88 12 10</strong>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
