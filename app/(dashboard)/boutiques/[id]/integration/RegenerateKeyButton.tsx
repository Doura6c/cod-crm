"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

export function RegenerateKeyButton({ boutiqueId, currentKey }: { boutiqueId: string; currentKey: string }) {
  const [key, setKey] = useState(currentKey);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [confirming, setConfirming] = useState(false);

  async function regenerate() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/boutiques/${boutiqueId}/regenerate-key`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setKey(data.webhookKey);
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setConfirming(false);
  }

  return (
    <div className="mt-2">
      <code className="block font-mono text-xs bg-amber-50 border border-amber-200 px-3 py-2.5 rounded select-all break-all">
        {key}
      </code>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Régénérer la clé
        </button>
      ) : (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs">
          <p className="flex items-center gap-1.5 text-red-700 font-medium mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> L&apos;ancienne clé cessera de fonctionner immédiatement.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={regenerate}
              disabled={status === "loading"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded font-medium disabled:opacity-50"
            >
              {status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmer
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="px-3 py-1.5 text-slate-600">
              Annuler
            </button>
          </div>
        </div>
      )}
      {status === "done" && (
        <p className="mt-2 text-xs text-green-700 font-medium">
          ✅ Nouvelle clé générée. Mets-la à jour côté HPSHOP (variable CRMCOD_API_KEY).
        </p>
      )}
      {status === "error" && <p className="mt-2 text-xs text-red-600">Erreur lors de la régénération.</p>}
    </div>
  );
}
