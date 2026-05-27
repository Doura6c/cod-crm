"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  phone: string;
  customerName: string;
  orderCode: string;
  orderId: string;
  status: string;
  boutiqueName: string;
  livreurName?: string | null;
  deliveryScheduledAt?: string | null;  // ISO string
  productsLabel?: string | null;
}

function toIntl(phone: string): string {
  let p = phone.replace(/[^\d]/g, "");
  if (!p.startsWith("224") && p.length >= 8) p = "224" + p;
  return p;
}

function truncateProducts(label: string): string {
  if (!label) return "";
  const parts = label.split(", ");
  if (parts.length <= 2) return label;
  return parts.slice(0, 2).join(", ") + ` et ${parts.length - 2} autre${parts.length - 2 > 1 ? "s" : ""} article${parts.length - 2 > 1 ? "s" : ""}`;
}

function formatDeliveryTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cod-crm-zeta.vercel.app";

export function WhatsAppSuiviButton({
  phone, customerName, orderCode, orderId, status, boutiqueName,
  livreurName, deliveryScheduledAt, productsLabel,
}: Props) {
  const [copied, setCopied] = useState(false);
  const trackingLink = `${SITE_URL}/suivi/${orderId}`;
  const productsShort = productsLabel ? truncateProducts(productsLabel) : null;

  let message: string;
  if (status === "EN_LIVRAISON") {
    const parts = [
      `Bonjour ${customerName} 👋`,
      ``,
      `Votre commande *${orderCode}* chez *${boutiqueName}* est en cours de livraison 🚚`,
    ];
    if (productsShort) parts.push(`\nArticles : ${productsShort}`);
    if (livreurName) parts.push(`\n👤 Livreur : *${livreurName}*`);
    if (deliveryScheduledAt) parts.push(`⏰ Heure de livraison prévue : *${formatDeliveryTime(deliveryScheduledAt)}*`);
    parts.push(`\n🔎 Suivez votre commande en temps réel :\n👉 ${trackingLink}`);
    parts.push(`\nVotre colis arrive bientôt ! 😊`);
    message = parts.join("\n");
  } else {
    // CONFIRME
    const parts = [
      `Bonjour ${customerName} 👋`,
      ``,
      `Votre commande *${orderCode}* chez *${boutiqueName}* est confirmée ✅`,
    ];
    if (productsShort) parts.push(`\nArticles : ${productsShort}`);
    parts.push(`\nSuivez l'état de votre livraison en temps réel ici :`);
    parts.push(`👉 ${trackingLink}`);
    parts.push(`\nMerci pour votre confiance ! 🙏`);
    message = parts.join("\n");
  }

  const waHref = `https://wa.me/${toIntl(phone)}?text=${encodeURIComponent(message)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={`border-2 rounded-xl p-4 ${status === "EN_LIVRAISON" ? "bg-sky-50 border-sky-300" : "bg-emerald-50 border-emerald-300"}`}>
      <div className={`text-sm font-bold mb-3 ${status === "EN_LIVRAISON" ? "text-sky-700" : "text-emerald-700"}`}>
        {status === "EN_LIVRAISON" ? "🚚 Envoyer le lien de suivi au client" : "✅ Envoyer la confirmation au client"}
      </div>

      {/* Aperçu du message */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {message}
      </div>

      {/* Boutons */}
      <div className="flex gap-2 flex-wrap">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da950] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Envoyer sur WhatsApp
        </a>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2.5 rounded-xl text-sm transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copié !" : "Copier le lien"}
        </button>
      </div>

      <div className="mt-2 text-xs text-slate-400 truncate">
        🔗 {trackingLink}
      </div>
    </div>
  );
}
