"use client";

import { useState } from "react";
import { MessageSquare, Phone, Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface Props {
  customerName: string;
  customerPhone: string;
  orderCode: string;
  boutiqueName: string;
  agentName: string;
  productsLabel: string;          // ex: "Machine à coudre x1, Aspirateur x1"
  totalAmount: number;
  deliveryDays?: number | null;
  city?: string | null;
  address?: string | null;
  status: string;                 // statut actuel de la commande
  orderId?: string;               // pour le lien de suivi
}

/** Numéro international compatible WhatsApp/SMS (retire tout sauf chiffres, ajoute "224" si manque) */
function toIntl(phone: string): string {
  let p = phone.replace(/[^\d]/g, "");
  if (!p.startsWith("224") && p.length >= 8 && p.length <= 9) p = "224" + p;
  return p;
}

function formatGNF(n: number) {
  return Math.round(n).toLocaleString("fr-FR") + " GNF";
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cod-crm-zeta.vercel.app";

export function ConfirmationScript({
  customerName, customerPhone, orderCode, boutiqueName, agentName,
  productsLabel, totalAmount, deliveryDays, city, address, status, orderId,
}: Props) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const isInjoignable = status === "INJOIGNABLE" || status === "PDR";

  // Script de confirmation
  const script = `Bonjour ${customerName}, je suis ${agentName} de HelpMeProcess pour le compte de ${boutiqueName}.

Je vous appelle pour confirmer votre commande n°${orderCode}.

Vous avez commandé :
${productsLabel}

Le montant total est de ${formatGNF(totalAmount)}, paiement à la livraison.

Pouvez-vous me confirmer votre adresse de livraison ?
${address ? `Adresse enregistrée : ${address}${city ? ", " + city : ""}` : city ? `Ville : ${city}` : ""}

${deliveryDays ? `La livraison se fera sous ${deliveryDays} jour${deliveryDays > 1 ? "s" : ""}.` : ""}

Confirmez-vous cette commande ?

Merci pour votre confiance avec HelpMeProcess. À très bientôt !`;

  // Messages pré-remplis (SMS + WhatsApp) selon le statut
  const trackingLink = orderId ? `${SITE_URL}/suivi/${orderId}` : null;

  const smsBody = isInjoignable
    ? `Bonjour ${customerName}, nous essayons de vous joindre concernant votre commande ${orderCode} chez ${boutiqueName}. Merci de nous rappeler au plus vite. HelpMeProcess COD`
    : `Bonjour ${customerName}, votre commande ${orderCode} chez ${boutiqueName} d'un montant de ${formatGNF(totalAmount)} est en cours de traitement. Nous vous contacterons prochainement.${trackingLink ? `\n\nSuivez votre commande : ${trackingLink}` : ""} HelpMeProcess COD`;

  const waBody = smsBody;

  const intlPhone = toIntl(customerPhone);
  const smsHref  = `sms:+${intlPhone}?body=${encodeURIComponent(smsBody)}`;
  const waHref   = `https://wa.me/${intlPhone}?text=${encodeURIComponent(waBody)}`;
  const telHref  = `tel:+${intlPhone}`;

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={`border-2 rounded-xl overflow-hidden mb-4 ${
      isInjoignable ? "border-red-300 bg-red-50" : "border-sky-300 bg-sky-50"
    }`}>
      {/* En-tête */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-3 transition ${
          isInjoignable ? "hover:bg-red-100" : "hover:bg-sky-100"
        }`}
      >
        <div className="flex items-center gap-2">
          {isInjoignable ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <Phone className="w-5 h-5 text-sky-600" />
          )}
          <span className={`font-bold text-sm uppercase ${isInjoignable ? "text-red-700" : "text-sky-700"}`}>
            {isInjoignable
              ? "🚨 Client injoignable — Envoyer un rappel"
              : "📞 Script de confirmation HelpMeProcess"}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="bg-white px-5 py-4 space-y-4">

          {/* Boutons contact rapide */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={telHref}
              className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 py-2.5 rounded-lg text-sm transition"
            >
              <Phone className="w-4 h-4" /> Appeler
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2.5 rounded-lg text-sm transition"
            >
              {/* Icone WhatsApp inline */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href={smsHref}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2.5 rounded-lg text-sm transition"
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </a>
          </div>

          {/* Aperçu message SMS/WhatsApp */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
              📩 Message pré-rempli (SMS / WhatsApp)
            </div>
            <div className="text-sm text-slate-700 italic whitespace-pre-wrap">{smsBody}</div>
          </div>

          {/* Script de confirmation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                📋 Script de confirmation à lire au client
              </div>
              <button
                onClick={copyScript}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 transition"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" /> Copié !</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copier le script</>
                )}
              </button>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {script}
            </div>
          </div>

          {/* Indicateurs */}
          <div className="text-xs text-slate-500 flex items-center gap-4 pt-2 border-t border-slate-100">
            <span>👤 <strong>Client :</strong> {customerName}</span>
            <span>📞 <strong>Tél :</strong> {customerPhone}</span>
            <span>🏷️ <strong>Commande :</strong> {orderCode}</span>
          </div>
        </div>
      )}
    </div>
  );
}
