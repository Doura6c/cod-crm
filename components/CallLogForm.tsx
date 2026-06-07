"use client";

import { useState } from "react";
import { logCallAction } from "@/app/(dashboard)/commandes/[id]/actions";

interface Props {
  orderId: string;
  requireMessageSent?: boolean; // obligatoire si la commande est en attente de confirmation
}

const OUTCOME_OPTIONS = [
  { value: "ANSWERED",    label: "📞 Répondu — en attente de décision" },
  { value: "CONFIRMED",   label: "✅ Confirmé — valider la commande" },
  { value: "REPORTED",    label: "📅 Reporté — à rappeler plus tard" },
  { value: "NO_ANSWER",   label: "📵 Pas de réponse" },
  { value: "BUSY",        label: "🔄 Occupé — rappeler dans 30 min" },
  { value: "INJOIGNABLE", label: "❌ Injoignable — 3+ tentatives sans réponse" },
  { value: "CANCELLED",   label: "🚫 Annulé — le client ne veut plus" },
];

// Motifs d'annulation proposés à l'agent (obligatoire si "Annulé")
const CANCEL_REASONS = [
  "Client ne veut plus le produit",
  "Prix trop élevé",
  "Commande en double",
  "Délai de livraison trop long",
  "Client injoignable définitivement",
  "Produit en rupture de stock",
  "Mauvais numéro / erreur de commande",
  "Autre (préciser en note)",
];

export function CallLogForm({ orderId, requireMessageSent = false }: Props) {
  const [outcome, setOutcome] = useState("ANSWERED");
  const [messageSent, setMessageSent] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const isConfirmed = outcome === "CONFIRMED";
  const isReported  = outcome === "REPORTED";
  const isCancelled = outcome === "CANCELLED";

  // Le bouton Valider est bloqué si confirmé ET que le message n'a pas encore été envoyé,
  // OU si annulé sans motif sélectionné.
  const canSubmit =
    (!(isConfirmed && requireMessageSent) || messageSent) &&
    (!isCancelled || cancelReason !== "");

  return (
    <form action={logCallAction} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
      <input type="hidden" name="orderId" value={orderId} />

      {/* Résultat de l'appel */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Résultat de l&apos;appel
        </label>
        <select
          name="outcome"
          required
          value={outcome}
          onChange={(e) => { setOutcome(e.target.value); setMessageSent(false); setCancelReason(""); }}
          className="input"
        >
          {OUTCOME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Motif d'annulation — obligatoire si annulé */}
      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <label className="block text-xs font-semibold text-red-700 mb-1">
            🚫 Motif de l&apos;annulation (obligatoire)
          </label>
          <select
            name="cancelReason"
            required
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="input border-red-300 focus:ring-red-400"
          >
            <option value="">— Choisir un motif —</option>
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <p className="text-xs text-red-600 mt-1">
            Le motif est enregistré pour le suivi qualité et les statistiques.
          </p>
        </div>
      )}

      {/* Date de rappel — si reporté */}
      {isReported && (
        <div>
          <label className="block text-xs font-semibold text-purple-700 mb-1">
            📅 Date et heure de rappel
          </label>
          <input
            type="datetime-local"
            name="reportDate"
            className="input border-purple-300 focus:ring-purple-400"
          />
        </div>
      )}

      {/* Heure de livraison promise — si confirmé */}
      {isConfirmed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <label className="block text-xs font-semibold text-emerald-700 mb-1">
            ⏰ Heure de livraison promise au client
          </label>
          <input
            type="datetime-local"
            name="deliveryScheduledAt"
            className="input border-emerald-300 focus:ring-emerald-400"
          />
          <p className="text-xs text-emerald-600 mt-1">
            Date et heure que vous avez communiquée au client lors de la confirmation
          </p>
        </div>
      )}

      {/* Checkbox confirmation envoi message — obligatoire si confirmé */}
      {isConfirmed && requireMessageSent && (
        <label
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition ${
            messageSent
              ? "bg-emerald-50 border-emerald-400"
              : "bg-red-50 border-red-300 animate-pulse"
          }`}
        >
          <input
            type="checkbox"
            checked={messageSent}
            onChange={(e) => setMessageSent(e.target.checked)}
            className="w-5 h-5 accent-emerald-600 cursor-pointer flex-shrink-0"
          />
          <span className={`text-sm font-semibold leading-snug ${messageSent ? "text-emerald-700" : "text-red-700"}`}>
            {messageSent
              ? "✅ Message de confirmation envoyé au client (WhatsApp ou SMS)"
              : "⚠️ Confirmez avoir envoyé le message WhatsApp ou SMS au client avant de valider"}
          </span>
        </label>
      )}

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
        <textarea
          name="note"
          rows={2}
          placeholder="Ex : Client demande livraison demain matin"
          className="input resize-none"
        />
      </div>

      {/* Bouton soumettre */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full font-bold px-5 py-2.5 rounded-xl text-sm transition ${
          canSubmit
            ? isConfirmed
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
              : "bg-sky-500 hover:bg-sky-600 text-white"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        {isConfirmed ? "✅ Valider la commande" : "Enregistrer l'appel"}
      </button>

      {!canSubmit && (
        <p className="text-xs text-red-600 text-center font-semibold">
          {isCancelled && cancelReason === ""
            ? "Choisissez d'abord le motif de l'annulation (voir ci-dessus ↑)"
            : "Envoyez d'abord le message WhatsApp ou SMS au client (voir ci-dessus ↑)"}
        </p>
      )}
    </form>
  );
}
