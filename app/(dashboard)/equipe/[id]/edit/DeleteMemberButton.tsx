"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteCollaboratorAction } from "./actions";

export function DeleteMemberButton({ userId, fullName }: { userId: string; fullName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold px-4 py-2.5 rounded-xl transition text-sm border border-red-200"
      >
        <Trash2 className="w-4 h-4" />
        Supprimer ce membre
      </button>
    );
  }

  return (
    <div className="w-full bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-800">
        Supprimer définitivement <strong>{fullName}</strong> ? Cette action est{" "}
        <strong>irréversible</strong>. Ses commandes et livraisons seront conservées mais détachées
        de lui ; ses journaux d'appels seront supprimés.
      </p>
      <form action={deleteCollaboratorAction} className="flex items-center gap-3">
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Oui, supprimer
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2.5"
        >
          Annuler
        </button>
      </form>
    </div>
  );
}
