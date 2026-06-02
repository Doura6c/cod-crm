"use client";

import { useState, useTransition, useCallback } from "react";
import { updateDeliveryMobileAction } from "@/app/(dashboard)/livraisons/actions";
import {
  Phone, CheckCircle, RotateCcw, MapPin, Package,
  ChevronLeft, ChevronRight, AlertTriangle, Info,
  MessageSquare,
} from "lucide-react";

type DeliveryItem = {
  id: string;
  quantity: number;
  subtotal: number;
  product: { name: string } | null;
};

type Delivery = {
  id: string;
  status: string;
  notes: string | null;
  order: {
    id: string;
    code: string;
    totalAmount: number;
    deliveryFee: number;
    notes: string | null;
    boutique: { name: string } | null;
    customer: { fullName: string; phone: string | null; address: string | null } | null;
    city: { name: string } | null;
    items: DeliveryItem[];
  };
};

const RETURN_REASONS = [
  "Client absent",
  "Adresse introuvable",
  "Client refuse la commande",
  "Problème de paiement",
  "Produit endommagé",
  "Autre",
];

function formatGNF(n: number) {
  return Math.round(n).toLocaleString("fr-FR") + " GNF";
}

type ModalState =
  | { type: "none" }
  | { type: "livre"; deliveryId: string; orderId: string; defaultAmount: number }
  | { type: "retour"; deliveryId: string; orderId: string };

type DoneEntry = { id: string; status: "LIVRE" | "RETOURNE"; code: string };

export function LivreurMobileApp({
  initialDeliveries,
  livreurName,
}: {
  initialDeliveries: Delivery[];
  livreurName: string;
}) {
  const [pending, setPending] = useState<Delivery[]>(
    initialDeliveries.filter((d) => d.status === "ASSIGNED")
  );
  const [done, setDone] = useState<DoneEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [amount, setAmount] = useState("");
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showFlash = (type: "ok" | "err", msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 2500);
  };

  const current = pending[currentIndex] ?? null;
  const total = pending.length + done.length;
  const progress = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const markDone = useCallback(
    (id: string, status: "LIVRE" | "RETOURNE", code: string) => {
      setDone((d) => [...d, { id, status, code }]);
      setPending((p) => {
        const next = p.filter((x) => x.id !== id);
        // Ajuster l'index si nécessaire
        setCurrentIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    },
    []
  );

  function openLivre() {
    if (!current) return;
    setAmount(String(Math.round(current.order.totalAmount)));
    setModal({ type: "livre", deliveryId: current.id, orderId: current.order.id, defaultAmount: current.order.totalAmount });
  }

  function openRetour() {
    if (!current) return;
    setReturnReason(RETURN_REASONS[0]);
    setCustomReason("");
    setModal({ type: "retour", deliveryId: current.id, orderId: current.order.id });
  }

  function confirmLivre() {
    if (modal.type !== "livre") return;
    const { deliveryId, orderId } = modal;
    const actualAmount = parseFloat(amount) || modal.defaultAmount;
    const code = current?.order.code ?? "";
    startTransition(async () => {
      const res = await updateDeliveryMobileAction(deliveryId, orderId, "LIVRE", actualAmount);
      if (res.ok) {
        markDone(deliveryId, "LIVRE", code);
        setModal({ type: "none" });
        showFlash("ok", `✅ ${code} livrée — ${formatGNF(actualAmount)} encaissés`);
      } else {
        showFlash("err", res.error ?? "Erreur");
        setModal({ type: "none" });
      }
    });
  }

  function confirmRetour() {
    if (modal.type !== "retour") return;
    const { deliveryId, orderId } = modal;
    const reason = returnReason === "Autre" ? customReason || "Retour" : returnReason;
    const code = current?.order.code ?? "";
    startTransition(async () => {
      const res = await updateDeliveryMobileAction(deliveryId, orderId, "RETOURNE", undefined, reason);
      if (res.ok) {
        markDone(deliveryId, "RETOURNE", code);
        setModal({ type: "none" });
        showFlash("ok", `🔄 ${code} retournée`);
      } else {
        showFlash("err", res.error ?? "Erreur");
        setModal({ type: "none" });
      }
    });
  }

  const whatsappMsg = current
    ? encodeURIComponent(
        `Bonjour ${current.order.customer?.fullName}, votre commande ${current.order.code} est en cours de livraison.\n` +
        `Le livreur ${livreurName} arrive bientôt.\n` +
        `Montant à préparer : ${formatGNF(current.order.totalAmount)}\n` +
        `Merci ! 🚚`
      )
    : "";

  const mapsQuery = current
    ? encodeURIComponent(
        [
          current.order.customer?.address,
          current.order.city?.name,
          "Conakry Guinée",
        ]
          .filter(Boolean)
          .join(", ")
      )
    : "";

  // ── Écran fin de tournée ──────────────────────────────────────────────────
  if (pending.length === 0 && done.length > 0) {
    const livrees = done.filter((d) => d.status === "LIVRE").length;
    const retours = done.filter((d) => d.status === "RETOURNE").length;
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Tournée terminée !</h2>
        <p className="text-slate-500 mb-8">Bravo {livreurName.split(" ")[0]}, tu as tout traité.</p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
          <div className="bg-emerald-100 rounded-2xl p-4">
            <div className="text-3xl font-black text-emerald-700">{livrees}</div>
            <div className="text-sm text-emerald-600 mt-1">Livrées ✅</div>
          </div>
          <div className="bg-red-100 rounded-2xl p-4">
            <div className="text-3xl font-black text-red-600">{retours}</div>
            <div className="text-sm text-red-500 mt-1">Retours ❌</div>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          Actualiser
        </button>
      </div>
    );
  }

  // ── Écran aucune livraison ─────────────────────────────────────────────────
  if (pending.length === 0 && done.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Aucune livraison assignée</h2>
        <p className="text-slate-400 text-sm">Le superviseur vous affectera bientôt des commandes.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
        >
          Actualiser
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-lg mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-[#0f172a] text-white px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Livraisons du jour</div>
            <div className="font-black text-lg">{livreurName}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400">{done.length}<span className="text-slate-400 text-lg">/{total}</span></div>
            <div className="text-xs text-slate-400">traitées</div>
          </div>
        </div>
        {/* Barre de progression */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-2 bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{pending.length} restante{pending.length > 1 ? "s" : ""}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* ── Navigation entre commandes ──────────────────────────── */}
      {pending.length > 1 && (
        <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2 flex-shrink-0">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg disabled:opacity-30 hover:bg-slate-100 active:bg-slate-200 transition"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="text-sm font-semibold text-slate-600">
            Livraison <span className="text-slate-900 font-black">{currentIndex + 1}</span> sur {pending.length}
          </div>
          <button
            onClick={() => setCurrentIndex((i) => Math.min(pending.length - 1, i + 1))}
            disabled={currentIndex === pending.length - 1}
            className="p-2 rounded-lg disabled:opacity-30 hover:bg-slate-100 active:bg-slate-200 transition"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}

      {/* ── Flash notification ─────────────────────────────────── */}
      {flash && (
        <div
          className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-semibold text-center shadow-lg ${
            flash.type === "ok" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {flash.msg}
        </div>
      )}

      {/* ── Carte livraison ────────────────────────────────────── */}
      {current && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

          {/* Entête commande */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-sky-200 font-semibold uppercase tracking-wide">{current.order.boutique?.name}</div>
                <div className="text-white font-black text-lg font-mono">{current.order.code}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-black text-xl">{formatGNF(current.order.totalAmount)}</div>
                <div className="text-sky-200 text-xs">à encaisser</div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Client */}
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 text-lg font-black text-sky-600">
                  {current.order.customer?.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-base">{current.order.customer?.fullName}</div>
                  <div className="text-sm text-slate-500">{current.order.customer?.phone}</div>
                </div>
              </div>

              {/* Adresse */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adresse</span>
                </div>
                <div className="text-sm font-bold text-sky-700">{current.order.city?.name ?? "Non précisée"}</div>
                {current.order.customer?.address && (
                  <div className="text-xs text-slate-500 mt-0.5">{current.order.customer.address}</div>
                )}
              </div>

              {/* Boutons contact + maps */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`tel:${current.order.customer?.phone}`}
                  className="flex flex-col items-center justify-center gap-1 bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 py-3 rounded-xl transition text-xs"
                >
                  <Phone className="w-5 h-5" />
                  Appeler
                </a>
                <a
                  href={`https://wa.me/${current.order.customer?.phone}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 bg-[#25D366] active:bg-[#1da851] text-white font-bold px-3 py-3 rounded-xl transition text-xs"
                >
                  <MessageSquare className="w-5 h-5" />
                  WhatsApp
                </a>
                <a
                  href={`https://maps.google.com/?q=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 bg-slate-700 active:bg-slate-900 text-white font-bold px-3 py-3 rounded-xl transition text-xs"
                >
                  <MapPin className="w-5 h-5" />
                  Maps
                </a>
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Produits à remettre</span>
            </div>
            <div className="space-y-2">
              {current.order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700 flex-1 min-w-0 pr-2 truncate">
                    {item.product?.name}
                  </span>
                  <div className="text-right flex-shrink-0">
                    <span className="bg-slate-200 text-slate-700 font-black text-xs px-2 py-0.5 rounded-full">
                      ×{item.quantity}
                    </span>
                    <div className="text-xs text-slate-500 mt-0.5">{formatGNF(item.subtotal)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(current.order.notes || current.notes) && (
            <div className="space-y-2">
              {current.order.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-700 uppercase mb-0.5">Note commande</div>
                    <div className="text-sm text-amber-800">{current.order.notes}</div>
                  </div>
                </div>
              )}
              {current.notes && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-violet-700 uppercase mb-0.5">Note livraison</div>
                    <div className="text-sm text-violet-800">{current.notes}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Espace pour les boutons fixes du bas */}
          <div className="h-6" />
        </div>
      )}

      {/* ── Boutons d'action fixes en bas ──────────────────────── */}
      {current && (
        <div className="flex-shrink-0 bg-white border-t-2 border-slate-200 p-4 pb-safe">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openRetour}
              disabled={isPending}
              className="flex flex-col items-center justify-center gap-1.5 bg-red-50 border-2 border-red-200 active:bg-red-100 text-red-600 font-black px-4 py-4 rounded-2xl transition text-sm disabled:opacity-50"
            >
              <RotateCcw className="w-6 h-6" />
              RETOUR
            </button>
            <button
              onClick={openLivre}
              disabled={isPending}
              className="flex flex-col items-center justify-center gap-1.5 bg-emerald-500 active:bg-emerald-700 text-white font-black px-4 py-4 rounded-2xl transition text-sm disabled:opacity-50 shadow-lg shadow-emerald-200"
            >
              <CheckCircle className="w-6 h-6" />
              LIVRÉ ✅
            </button>
          </div>
        </div>
      )}

      {/* ── Modal LIVRÉ ────────────────────────────────────────── */}
      {modal.type === "livre" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm border-0 p-0 cursor-pointer" aria-label="Fermer" onClick={() => setModal({ type: "none" })} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-8 shadow-2xl animate-slide-up">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-black text-slate-800 mb-1">Confirmer la livraison</h3>
            <p className="text-sm text-slate-500 mb-5">{current?.order.code} — {current?.order.customer?.fullName}</p>

            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              Montant encaissé (GNF) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step={1000}
              autoFocus
              className="w-full border-2 border-slate-200 focus:border-emerald-400 rounded-xl px-4 py-3 text-xl font-black text-slate-800 focus:outline-none text-center mb-2"
            />
            <p className="text-xs text-slate-400 mb-6 text-center">
              Prix prévu : {formatGNF(modal.defaultAmount)} — modifiez si accord avec le client
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModal({ type: "none" })}
                className="border-2 border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm active:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmLivre}
                disabled={isPending}
                className="bg-emerald-500 active:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {isPending ? "..." : "Confirmer ✅"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal RETOUR ───────────────────────────────────────── */}
      {modal.type === "retour" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm border-0 p-0 cursor-pointer" aria-label="Fermer" onClick={() => setModal({ type: "none" })} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-8 shadow-2xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-black text-slate-800 mb-1">Raison du retour</h3>
            <p className="text-sm text-slate-500 mb-5">{current?.order.code} — {current?.order.customer?.fullName}</p>

            <div className="space-y-2 mb-5">
              {RETURN_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReturnReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold border-2 transition ${
                    returnReason === r
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-700 active:bg-slate-50"
                  }`}
                >
                  {returnReason === r ? "● " : "○ "}
                  {r}
                </button>
              ))}
            </div>

            {returnReason === "Autre" && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Précisez la raison..."
                autoFocus
                className="w-full border-2 border-slate-200 focus:border-red-400 rounded-xl px-4 py-3 text-sm focus:outline-none mb-4"
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModal({ type: "none" })}
                className="border-2 border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm active:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmRetour}
                disabled={isPending}
                className="bg-red-500 active:bg-red-700 text-white font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {isPending ? "..." : "Confirmer ❌"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
