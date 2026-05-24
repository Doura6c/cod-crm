"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { approveTeamRequestAction, rejectTeamRequestAction } from "./actions";

export function DemandesClient({ requestId }: { requestId: string }) {
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [rejectNote, setRejectNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const res = await approveTeamRequestAction(requestId);
      if (res.error) setFeedback(res.error);
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectTeamRequestAction(requestId, rejectNote);
      if (res.error) setFeedback(res.error);
      else setMode("idle");
    });
  }

  if (feedback) {
    return <div className="px-5 pb-4 text-xs text-red-500">{feedback}</div>;
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 bg-slate-50/50 dark:bg-slate-900/30">
      {mode === "idle" ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Approuver
          </button>
          <button
            onClick={() => setMode("reject")}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            <X className="w-3.5 h-3.5" /> Rejeter
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Raison du rejet (facultatif)..."
            className="input text-xs py-1.5"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Confirmer le rejet
            </button>
            <button onClick={() => setMode("idle")} className="text-xs text-slate-500 hover:text-slate-700 px-2">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
