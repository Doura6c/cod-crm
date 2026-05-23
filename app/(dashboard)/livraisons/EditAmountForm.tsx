"use client";

import { useState } from "react";
import { editDeliveryAmountAction } from "./EditAmountAction";
import { Pencil, X, Check } from "lucide-react";

interface Props {
  deliveryId: string;
  currentAmount: number;
  originalAmount?: number | null;
  editNote?: string | null;
  editedAt?: Date | null;
}

export function EditAmountForm({ deliveryId, currentAmount, originalAmount, editNote, editedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function fmt(n: number) {
    return Math.round(n).toLocaleString("fr-FR") + " GNF";
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-700 text-sm">{fmt(currentAmount)}</span>
          <button
            onClick={() => setOpen(true)}
            className="text-slate-400 hover:text-sky-600 transition"
            title="Modifier le montant"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        {originalAmount != null && originalAmount !== currentAmount && (
          <div className="text-xs text-amber-600">
            initial: {fmt(originalAmount)}
            <span className={`ml-1 font-bold ${currentAmount > originalAmount ? "text-emerald-600" : "text-red-500"}`}>
              ({currentAmount > originalAmount ? "+" : ""}{fmt(currentAmount - originalAmount)})
            </span>
          </div>
        )}
        {editNote && editedAt && (
          <div className="text-xs text-slate-400 italic max-w-[160px] text-right">
            ✏️ {editNote}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await editDeliveryAmountAction(fd);
        setPending(false);
        setOpen(false);
      }}
      className="flex flex-col gap-2 min-w-[200px]"
    >
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input
        type="number"
        name="newAmount"
        defaultValue={Math.round(currentAmount)}
        min={1}
        step={1000}
        required
        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold w-full focus:outline-none focus:ring-2 focus:ring-sky-400"
        autoFocus
      />
      <input
        type="text"
        name="editNote"
        placeholder="Raison de la modification"
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-400"
      />
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2 py-1.5 rounded-lg transition disabled:opacity-60"
        >
          <Check className="w-3.5 h-3.5" /> Valider
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center w-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
