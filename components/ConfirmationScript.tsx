"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Phone, MessageSquare, AlertTriangle, Send } from "lucide-react";

interface Props {
  customerName: string;
  customerPhone: string;
  orderCode: string;
  boutiqueName: string;
  agentName: string;
  productsLabel: string;
  totalAmount: number;
  deliveryDays?: number | null;
  city?: string | null;
  address?: string | null;
  status: string;
  orderId?: string;
}

function toIntl(phone: string): string {
  let p = phone.replace(/[^\d]/g, "");
  if (!p.startsWith("224") && p.length >= 8) p = "224" + p;
  return p;
}

function formatGNF(n: number) {
  return Math.round(n).toLocaleString("fr-FR") + " GNF";
}

function truncateProducts(label: string): string {
  const parts = label.split(", ");
  if (parts.length <= 2) return label;
  return parts.slice(0, 2).join(", ") + ` et ${parts.length - 2} autre${parts.length - 2 > 1 ? "s" : ""} article${parts.length - 2 > 1 ? "s" : ""}`;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cod-crm-zeta.vercel.app";

export function ConfirmationScript({
  customerName, customerPhone, orderCode, boutiqueName, agentName,
  productsLabel, totalAmount, deliveryDays, city, address, status, orderId,
}: Props) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const isInjoignable = status === "INJOIGNABLE" || status === "PDR";
  const intlPhone = toIntl(customerPhone);
  const trackingLink = orderId ? `${SITE_URL}/suivi/${orderId}` : null;
  const productsShort = truncateProducts(productsLabel);

  // Script oral à lire au téléphone
  const script = `Bonjour ${customerName}, je suis ${agentName} de HelpMeProcess pour le compte de ${boutiqueName}.

Je vous appelle pour confirmer votre commande n°${orderCode}.

Vous avez commandé :
${productsLabel}

Le montant total est de ${formatGNF(totalAmount)}, paiement à la livraison.

${address || city ? `Adresse de livraison : ${address ? address + ", " : ""}${city ?? ""}` : ""}
${deliveryDays ? `Délai de livraison : ${deliveryDays} jour${deliveryDays > 1 ? "s" : ""}.` : ""}

Confirmez-vous cette commande ?

Merci pour votre confiance ! À très bientôt.`;

  // Message WhatsApp / SMS
  const waMessage = isInjoignable
    ? `Bonjour ${customerName} 👋\n\nNous n'avons pas pu vous joindre concernant votre commande *${orderCode}* chez *${boutiqueName}*.\n\nArticles : ${productsShort}\nMontant : *${formatGNF(totalAmount)}* (paiement à la livraison)\n\nMerci de nous rappeler pour confirmer ✅\nHelpMeProcess COD`
    : `Bonjour ${customerName} 👋\n\nVotre commande *${orderCode}* chez *${boutiqueName}* est en cours de traitement.\n\nArticles : ${productsShort}\nMontant : *${formatGNF(totalAmount)}* (paiement à la livraison)\n${trackingLink ? `\n🔎 Suivez votre commande : ${trackingLink}` : ""}\n\nNous vous contacterons prochainement pour confirmer 📦\nHelpMeProcess COD`;

  const waHref  = `https://wa.me/${intlPhone}?text=${encodeURIComponent(waMessage)}`;
  const smsHref = `sms:+${intlPhone}?body=${encodeURIComponent(waMessage.replace(/\*/g, ""))}`;
  const telHref = `tel:+${intlPhone}`;

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${isInjoignable ? "border-red-300" : "border-sky-300"}`}>
      {/* En-tête */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-3 transition ${
          isInjoignable ? "bg-red-50 hover:bg-red-100" : "bg-sky-50 hover:bg-sky-100"
        }`}
      >
        <div className="flex items-center gap-2">
          {isInjoignable
            ? <AlertTriangle className="w-5 h-5 text-red-600" />
            : <Phone className="w-5 h-5 text-sky-600" />}
          <span className={`font-bold text-sm uppercase ${isInjoignable ? "text-red-700" : "text-sky-700"}`}>
            {isInjoignable ? "🚨 Client injoignable — Envoyer un rappel" : "📞 Script de confirmation HelpMeProcess"}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="bg-white px-5 py-4 space-y-4">

          {/* ⚠️ Avertissement SMS vs WhatsApp */}
          <div className="bg-red-50 border-2 border-red-400 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🔴</span>
            <div className="text-sm font-semibold text-red-800">
              <strong>IMPORTANT :</strong> Demandez au client s'il préfère recevoir la confirmation par{" "}
              <span className="underline">SMS</span> ou <span className="underline">WhatsApp</span> pour suivre sa commande,
              puis envoyez le message correspondant avant de valider.
            </div>
          </div>

          {/* Aperçu du message */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Message à envoyer au client
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{waMessage}</div>
          </div>

          {/* Boutons envoi */}
          <div className="grid grid-cols-3 gap-2">
            <a href={telHref}
              className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 py-3 rounded-xl text-sm transition"
            >
              <Phone className="w-4 h-4" /> Appeler
            </a>
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              onClick={() => setMessageSent(true)}
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da950] text-white font-bold px-3 py-3 rounded-xl text-sm transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a href={smsHref}
              onClick={() => setMessageSent(true)}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-3 rounded-xl text-sm transition"
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </a>
          </div>

          {/* Confirmation envoi */}
          <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition ${
            messageSent ? "bg-emerald-50 border-emerald-400" : "bg-slate-50 border-slate-200 hover:border-slate-300"
          }`}>
            <input
              type="checkbox"
              checked={messageSent}
              onChange={(e) => setMessageSent(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 cursor-pointer"
            />
            <span className={`text-sm font-semibold ${messageSent ? "text-emerald-700" : "text-slate-600"}`}>
              {messageSent ? "✅ Message envoyé au client" : "Je confirme avoir envoyé le message au client"}
            </span>
          </label>

          {/* Script oral */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                📋 Script oral — à lire au client
              </div>
              <button onClick={copyScript}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 transition"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copié !</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
              </button>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {script}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
