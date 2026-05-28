"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle, X, ShieldOff, Loader2 } from "lucide-react";
import { deactivateBoutiqueAction, deleteBoutiqueAction } from "./actions";

interface Props {
  boutiqueId: string;
  boutiqueName: string;
  orderCount: number;
  productCount: number;
}

export function DeleteBoutiqueButton({
  boutiqueId,
  boutiqueName,
  orderCount,
  productCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canHardDelete = orderCount === 0;

  function handleDeactivate() {
    setError(null);
    startTransition(async () => {
      try {
        await deactivateBoutiqueAction(boutiqueId);
      } catch (e: any) {
        setError(e.message ?? "Erreur inattendue");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteBoutiqueAction(boutiqueId);
      } catch (e: any) {
        setError(e.message ?? "Erreur inattendue");
      }
    });
  }

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
      >
        <Trash2 className="w-4 h-4" />
        Supprimer la boutique
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />

          {/* Panneau */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">Supprimer la boutique</h2>
                <p className="text-sm text-slate-500 mt-0.5">{boutiqueName}</p>
              </div>
              {!isPending && (
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Stats boutique */}
            <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-black text-slate-800">{orderCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">commande{orderCount > 1 ? "s" : ""} liée{orderCount > 1 ? "s" : ""}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-slate-800">{productCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">produit{productCount > 1 ? "s" : ""}</div>
              </div>
            </div>

            {/* Message selon état */}
            {orderCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-amber-800 font-semibold mb-1">
                  ⚠️ Suppression définitive impossible
                </p>
                <p className="text-xs text-amber-700">
                  Cette boutique a <strong>{orderCount} commande(s)</strong> en base. Tu ne peux pas la supprimer pour conserver l&apos;historique.
                  Tu peux seulement la <strong>désactiver</strong> : elle disparaîtra de la liste active mais ses données seront préservées.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-red-800 font-semibold mb-1">
                  🗑️ Suppression définitive possible
                </p>
                <p className="text-xs text-red-700">
                  Aucune commande liée. La boutique et ses <strong>{productCount} produit(s)</strong> seront <strong>définitivement supprimés</strong> de la base. Cette action est irréversible.
                </p>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {/* Désactiver — toujours disponible */}
              <button
                onClick={handleDeactivate}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl transition"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldOff className="w-4 h-4" />
                )}
                Désactiver la boutique (conserve l&apos;historique)
              </button>

              {/* Supprimer définitivement — seulement si 0 commandes */}
              {canHardDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl transition"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Supprimer définitivement
                </button>
              )}

              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="w-full text-sm text-slate-500 hover:text-slate-700 py-2 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
