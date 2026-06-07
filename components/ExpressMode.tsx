"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { Phone, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Zap, MessageSquare, Check } from "lucide-react";
import { expressCallAction } from "@/app/(dashboard)/commandes/[id]/actions";

type ExpressOrder = {
  id: string;
  code: string;
  status: string;
  totalAmount: number;
  callCount: number;
  customer: { fullName: string; phone: string; address?: string | null };
  city?: { name: string } | null;
  boutique: { name: string };
  items: { quantity: number; unitPrice: number; product: { name: string } }[];
  reportDate?: Date | null;
};

interface Props {
  orders: ExpressOrder[];
}

const OUTCOMES = [
  { value: "CONFIRMED",   label: "Confirmé",      emoji: "✅", color: "bg-emerald-500 hover:bg-emerald-600", key: "c", needsExtra: true },
  { value: "REPORTED",    label: "Reporter",       emoji: "📅", color: "bg-purple-500 hover:bg-purple-600",  key: "r", needsExtra: true },
  { value: "NO_ANSWER",   label: "Pas de réponse", emoji: "📵", color: "bg-amber-500 hover:bg-amber-600",   key: "p", needsExtra: false },
  { value: "BUSY",        label: "Occupé",         emoji: "🔄", color: "bg-orange-500 hover:bg-orange-600", key: "o", needsExtra: false },
  { value: "INJOIGNABLE", label: "Injoignable",    emoji: "❌", color: "bg-red-500 hover:bg-red-600",       key: "i", needsExtra: false },
  { value: "CANCELLED",   label: "Annulé",         emoji: "🚫", color: "bg-slate-500 hover:bg-slate-600",   key: "x", needsExtra: false },
];

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

function toIntl(phone: string): string {
  let p = phone.replace(/[^\d]/g, "");
  if (!p.startsWith("224") && p.length >= 8) p = "224" + p;
  return p;
}

function formatGNF(n: number) {
  return Math.round(n).toLocaleString("fr-FR") + " GNF";
}

function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cod-crm-zeta.vercel.app";

export function ExpressMode({ orders: initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [idx, setIdx] = useState(0);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const current = orders[idx];
  const total = orders.length;
  const remaining = total - done.length;

  // ── Raccourcis clavier ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key.toLowerCase()) {
        case "c": setOutcome("CONFIRMED"); break;
        case "r": setOutcome("REPORTED"); break;
        case "p": case "n": setOutcome("NO_ANSWER"); break;
        case "o": setOutcome("BUSY"); break;
        case "i": setOutcome("INJOIGNABLE"); break;
        case "x": setOutcome("CANCELLED"); break;
        case "escape": setOutcome(null); break;
        case "arrowright": advance(); break;
        case "arrowleft":
          if (idx > 0) { setIdx((i) => i - 1); reset(); }
          break;
        case "enter":
          if (outcome && canSubmit()) submit();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, outcome, note, reportDate, deliveryAt, messageSent, cancelReason]);

  function reset() {
    setOutcome(null);
    setNote("");
    setReportDate("");
    setDeliveryAt("");
    setMessageSent(false);
    setCancelReason("");
    setFeedback(null);
  }

  function advance() {
    if (idx < orders.length - 1) {
      setIdx((i) => i + 1);
      reset();
    }
  }

  function canSubmit(): boolean {
    if (!outcome) return false;
    if (outcome === "CONFIRMED" && !messageSent) return false;
    if (outcome === "CANCELLED" && cancelReason === "") return false;
    return true;
  }

  function submit() {
    if (!current || !outcome) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("orderId", current.id);
      fd.append("outcome", outcome);
      fd.append("note", note.trim());
      if (cancelReason) fd.append("cancelReason", cancelReason);
      if (reportDate) fd.append("reportDate", reportDate);
      if (deliveryAt) fd.append("deliveryScheduledAt", deliveryAt);

      const result = await expressCallAction(fd);
      if (result.ok) {
        setDone((d) => [...d, current.id]);
        setFeedback({ type: "ok", msg: `${current.code} — ${OUTCOMES.find(o => o.value === outcome)?.label}` });
        // Retirer la commande traitée de la liste et avancer
        setTimeout(() => {
          setOrders((prev) => prev.filter((o) => o.id !== current.id));
          setIdx((i) => Math.max(0, Math.min(i, orders.length - 2)));
          reset();
        }, 900);
      } else {
        setFeedback({ type: "err", msg: result.error ?? "Erreur" });
      }
    });
  }

  // ── Plus de commandes ────────────────────────────────────────────────────
  if (orders.length === 0 || !current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-slate-800">File d&apos;attente terminée !</h2>
        <p className="text-slate-500">
          {done.length > 0
            ? `Vous avez traité ${done.length} commande${done.length > 1 ? "s" : ""} en Mode Express.`
            : "Aucune commande à traiter pour le moment."}
        </p>
        <Link
          href="/commandes/confirmation"
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
      </div>
    );
  }

  const productsLabel = current.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", ");
  const intlPhone = toIntl(current.customer.phone);
  const selectedOutcome = OUTCOMES.find((o) => o.value === outcome);

  // Message WhatsApp pour cet ordre
  const waMessage = current.status === "INJOIGNABLE"
    ? `Bonjour ${current.customer.fullName} 👋\n\nNous n'avons pas pu vous joindre concernant votre commande *${current.code}* chez *${current.boutique.name}*.\n\nArticles : ${productsLabel}\nMontant : *${formatGNF(current.totalAmount)}* (paiement à la livraison)\n\nMerci de nous rappeler pour confirmer ✅\nHelpMeProcess COD`
    : `Bonjour ${current.customer.fullName} 👋\n\nVotre commande *${current.code}* chez *${current.boutique.name}* est en cours de traitement.\n\nArticles : ${productsLabel}\nMontant : *${formatGNF(current.totalAmount)}* (paiement à la livraison)\n\nNous vous contacterons prochainement pour confirmer 📦\nHelpMeProcess COD`;

  const waHref = `https://wa.me/${intlPhone}?text=${encodeURIComponent(waMessage)}`;
  const smsHref = `sms:+${intlPhone}?body=${encodeURIComponent(waMessage.replace(/\*/g, ""))}`;
  const telHref = `tel:+${intlPhone}`;

  const progressPct = total > 0 ? Math.round(((total - orders.length) / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header fixe ────────────────────────────────────────────────────── */}
      <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Link href="/commandes/confirmation" className="p-1.5 rounded-lg hover:bg-white/10 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Zap className="w-5 h-5 text-yellow-400" />
        <span className="font-bold text-sm flex-1">Mode Express Appel</span>
        <span className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-full">
          {orders.length} commande{orders.length > 1 ? "s" : ""} à traiter
        </span>
        <Link
          href={`/commandes/${current.id}`}
          className="text-xs text-blue-300 hover:text-white transition"
        >
          Détail →
        </Link>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 bg-slate-200">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── Corps ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

          {/* Feedback flash */}
          {feedback && (
            <div className={`rounded-xl px-4 py-3 font-semibold text-sm flex items-center gap-2 ${
              feedback.type === "ok"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}>
              {feedback.type === "ok" ? "✅" : "❌"} {feedback.msg}
            </div>
          )}

          {/* ── Fiche commande ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Statut */}
            <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
              <span className="font-mono text-white font-bold text-sm">{current.code}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-xs">{current.boutique.name}</span>
                {current.callCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {current.callCount} appel{current.callCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Infos client */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-bold text-slate-900">{current.customer.fullName}</div>
                  <a
                    href={telHref}
                    className="inline-flex items-center gap-1.5 text-sky-600 font-bold text-lg mt-0.5 hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    {current.customer.phone}
                  </a>
                  <div className="text-sm text-slate-500 mt-0.5">
                    📍 {current.city?.name ?? current.customer.address ?? "—"}
                    {current.customer.address && current.city?.name && ` — ${current.customer.address}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-emerald-600">{formatGNF(current.totalAmount)}</div>
                  <div className="text-xs text-slate-500">À la livraison</div>
                </div>
              </div>

              {/* Produits */}
              <div className="mt-3 bg-slate-50 rounded-xl px-4 py-3">
                {current.items.map((it, i) => (
                  <div key={i} className="text-sm text-slate-700 leading-relaxed">
                    🛍 <span className="font-semibold">{it.product.name}</span>
                    <span className="text-slate-500"> × {it.quantity}</span>
                    <span className="text-slate-400 text-xs ml-2">{formatGNF(it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Boutons contact ─────────────────────────────────────── */}
            <div className="px-5 pb-4 mt-3 grid grid-cols-3 gap-2">
              <a
                href={telHref}
                className="flex flex-col items-center justify-center gap-1 bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 py-3 rounded-xl text-sm transition"
              >
                <Phone className="w-5 h-5" />
                <span className="text-xs">Appeler</span>
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMessageSent(true)}
                className="flex flex-col items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1da950] text-white font-bold px-3 py-3 rounded-xl text-sm transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-xs">WhatsApp</span>
              </a>
              <a
                href={smsHref}
                onClick={() => setMessageSent(true)}
                className="flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-3 rounded-xl text-sm transition"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">SMS</span>
              </a>
            </div>
          </div>

          {/* ── Sélection résultat ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center justify-between">
              <span>Résultat de l&apos;appel</span>
              <span className="text-slate-300 text-[10px] font-mono hidden md:block">C·R·P·O·I·X + ↵</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setOutcome(outcome === o.value ? null : o.value)}
                  className={`flex items-center justify-center gap-2 font-bold px-3 py-3 rounded-xl text-sm transition border-2 ${
                    outcome === o.value
                      ? `${o.color} text-white border-transparent scale-[1.03] shadow-md`
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base">{o.emoji}</span>
                  <span>{o.label}</span>
                  <span className="hidden md:block text-[10px] opacity-50 font-mono uppercase ml-auto">[{o.key}]</span>
                </button>
              ))}
            </div>

            {/* Champs conditionnels */}
            {outcome === "REPORTED" && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <label className="block text-xs font-semibold text-purple-700 mb-1">📅 Date de rappel</label>
                <input
                  type="datetime-local"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="input border-purple-300"
                />
              </div>
            )}

            {outcome === "CONFIRMED" && (
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">⏰ Heure de livraison promise</label>
                  <input
                    type="datetime-local"
                    value={deliveryAt}
                    onChange={(e) => setDeliveryAt(e.target.value)}
                    className="input border-emerald-300"
                  />
                </div>
                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition ${
                  messageSent
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-red-50 border-red-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={messageSent}
                    onChange={(e) => setMessageSent(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer"
                  />
                  <span className={`text-sm font-semibold ${messageSent ? "text-emerald-700" : "text-red-700"}`}>
                    {messageSent
                      ? "✅ Message envoyé au client"
                      : "⚠️ Cochez après avoir envoyé le WhatsApp/SMS"}
                  </span>
                </label>
              </div>
            )}

            {/* Motif d'annulation — obligatoire si annulé */}
            {outcome === "CANCELLED" && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <label className="block text-xs font-semibold text-red-700 mb-1">
                  🚫 Motif de l&apos;annulation (obligatoire)
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input border-red-300"
                >
                  <option value="">— Choisir un motif —</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Note */}
            <div className="mt-3">
              <textarea
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optionnel)…"
                rows={2}
                className="input resize-none text-sm"
              />
            </div>

            {/* Bouton valider */}
            <button
              onClick={submit}
              disabled={!canSubmit() || isPending}
              className={`mt-3 w-full font-bold px-5 py-3.5 rounded-xl text-sm transition ${
                canSubmit() && !isPending
                  ? selectedOutcome?.value === "CONFIRMED"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                    : "bg-sky-500 hover:bg-sky-600 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Enregistrement…
                </span>
              ) : selectedOutcome ? (
                `${selectedOutcome.emoji} Valider — ${selectedOutcome.label} [Entrée]`
              ) : (
                "Sélectionnez un résultat ci-dessus"
              )}
            </button>

            {outcome === "CONFIRMED" && !messageSent && (
              <p className="text-xs text-red-600 text-center mt-2 font-semibold">
                Cliquez d&apos;abord WhatsApp ou SMS ↑ puis cochez la case
              </p>
            )}

            {outcome === "CANCELLED" && cancelReason === "" && (
              <p className="text-xs text-red-600 text-center mt-2 font-semibold">
                Choisissez d&apos;abord le motif de l&apos;annulation ↑
              </p>
            )}
          </div>

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => { if (idx > 0) { setIdx((i) => i - 1); reset(); } }}
              disabled={idx === 0}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Précédente
            </button>

            <span className="text-xs text-slate-400 font-semibold">
              {idx + 1} / {orders.length}
            </span>

            <button
              onClick={advance}
              disabled={idx >= orders.length - 1}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Passer [→] <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Aide raccourcis clavier */}
          <div className="text-center text-xs text-slate-400 mt-2">
            <span className="hidden md:block">
              ⌨️ Raccourcis : <kbd className="bg-slate-100 px-1 rounded">C</kbd> Confirmé &nbsp;
              <kbd className="bg-slate-100 px-1 rounded">R</kbd> Reporter &nbsp;
              <kbd className="bg-slate-100 px-1 rounded">P</kbd> Pas de réponse &nbsp;
              <kbd className="bg-slate-100 px-1 rounded">I</kbd> Injoignable &nbsp;
              <kbd className="bg-slate-100 px-1 rounded">→</kbd> Passer &nbsp;
              <kbd className="bg-slate-100 px-1 rounded">↵</kbd> Valider
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
