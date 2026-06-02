"use client";

import { useState } from "react";
import { UserPlus, X, Check } from "lucide-react";

type Agent = { id: string; name: string };

export function AssignBar({ agents }: { agents: Agent[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [agentId, setAgentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Read selected checkboxes when modal opens
  function openModal() {
    const checks = document.querySelectorAll<HTMLInputElement>(
      'table tbody input[type="checkbox"][data-order-id]:checked'
    );
    const ids = Array.from(checks).map((el) => el.dataset.orderId!).filter(Boolean);
    setSelected(ids);
    setShowModal(true);
  }

  async function submit() {
    if (!agentId || selected.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selected, agentId }),
      });
      if (res.ok) {
        setShowModal(false);
        window.location.reload();
      } else {
        alert("Erreur lors de l'affectation");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded text-sm transition"
      >
        <UserPlus className="w-4 h-4" />
        Affecter
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold">Affecter des commandes</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700" aria-label="Fermer">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selected.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg">
                  ⚠️ Sélectionnez au moins une commande en cochant les cases dans le tableau.
                </div>
              ) : (
                <div className="bg-sky-50 border border-sky-200 text-sky-800 text-sm p-3 rounded-lg">
                  {selected.length} commande{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Affecter à
                </label>
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="input"
                  disabled={selected.length === 0}
                >
                  <option value="">— Choisir un agent —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded"
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={loading || !agentId || selected.length === 0}
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" /> Affecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
