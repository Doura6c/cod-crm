"use client";
import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export default function ResetDataButton() {
  const [step, setStep] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleReset() {
    setStep("loading");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "DELETE",
        headers: { "x-confirm-reset": "RESET_ALL_DATA" },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message ?? "Données supprimées avec succès.");
        setStep("done");
      } else {
        setMessage(data.error ?? "Erreur lors de la suppression.");
        setStep("error");
      }
    } catch {
      setMessage("Erreur réseau. Réessayez.");
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 font-medium">
        ✅ {message}
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          ❌ {message}
        </div>
        <button onClick={() => setStep("idle")} className="text-sm text-slate-600 underline">
          Réessayer
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="bg-red-50 border border-red-300 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <strong>Dernière confirmation :</strong> Toutes les commandes, clients, produits et boutiques
            seront <strong>définitivement supprimés</strong>. Cette action est irréversible.
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            Oui, supprimer toutes les données
          </button>
          <button
            onClick={() => setStep("idle")}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm transition"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Suppression en cours...
      </div>
    );
  }

  return (
    <button
      onClick={() => setStep("confirm")}
      className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-5 py-2.5 rounded-lg transition text-sm"
    >
      <Trash2 className="w-4 h-4" />
      Supprimer toutes les données fictives
    </button>
  );
}
