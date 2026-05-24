"use client";

import { useState } from "react";
import { toggleCrmAction } from "@/app/(dashboard)/parametres/toggle-crm-action";
import { Power, PowerOff } from "lucide-react";

interface CrmToggleButtonProps {
  isActive: boolean;
}

export function CrmToggleButton({ isActive }: CrmToggleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleToggle() {
    setLoading(true);
    setShowConfirm(false);
    await toggleCrmAction();
    setLoading(false);
  }

  if (showConfirm) {
    return (
      <div className="mx-3 mb-2 p-3 rounded-xl bg-red-900/40 border border-red-500/40 text-xs">
        <p className="text-red-200 mb-2 font-semibold">
          {isActive ? "⚠️ Suspendre le CRM ?" : "✅ Réactiver le CRM ?"}
        </p>
        <p className="text-red-300 mb-3 text-xs">
          {isActive
            ? "Les agents et livreurs ne pourront plus accéder."
            : "Tous les utilisateurs pourront à nouveau accéder."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            disabled={loading}
            className="flex-1 py-1.5 rounded-lg font-bold text-xs text-white transition"
            style={{ backgroundColor: isActive ? "#ef4444" : "#10b981" }}
          >
            {loading ? "..." : "Confirmer"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-1.5 rounded-lg font-bold text-xs text-slate-300 bg-white/10 hover:bg-white/20 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition mb-1 ${
        isActive
          ? "text-red-300 hover:bg-red-900/30 hover:text-red-200"
          : "text-emerald-300 hover:bg-emerald-900/30 hover:text-emerald-200"
      }`}
    >
      {isActive ? (
        <><PowerOff className="w-4 h-4" /> Suspendre le CRM</>
      ) : (
        <><Power className="w-4 h-4" /> Réactiver le CRM</>
      )}
    </button>
  );
}
