"use client";
import { useState, useEffect } from "react";
import { Trash2, Loader2, AlertTriangle, CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";

type Counts = {
  commandes: { orders: number; items: number; logs: number; invoices: number; merchantInvoices: number };
  clients: { customers: number };
  produits: { products: number; movements: number };
  boutiques: { boutiques: number };
  livraisons: { deliveries: number };
  autres: { notifications: number; teamRequests: number };
} | null;

type Selection = {
  commandes: boolean;
  clients: boolean;
  produits: boolean;
  boutiques: boolean;
  livraisons: boolean;
};

type Step = "idle" | "loading_counts" | "select" | "confirm" | "deleting" | "done" | "error";

const LABELS: { key: keyof Selection; label: string; color: string; detail: (c: Counts) => string }[] = [
  {
    key: "commandes",
    label: "Commandes",
    color: "blue",
    detail: (c) => c ? `${c.commandes.orders} commandes · ${c.commandes.items} articles · ${c.commandes.logs} logs · ${c.commandes.invoices} factures` : "…",
  },
  {
    key: "clients",
    label: "Clients",
    color: "purple",
    detail: (c) => c ? `${c.clients.customers} clients` : "…",
  },
  {
    key: "produits",
    label: "Produits",
    color: "orange",
    detail: (c) => c ? `${c.produits.products} références · ${c.produits.movements} mouvements de stock` : "…",
  },
  {
    key: "boutiques",
    label: "Boutiques",
    color: "green",
    detail: (c) => c ? `${c.boutiques.boutiques} boutiques · clés webhook révoquées` : "…",
  },
  {
    key: "livraisons",
    label: "Livraisons",
    color: "cyan",
    detail: (c) => c ? `${c.livraisons.deliveries} livraisons` : "…",
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:   "border-blue-200 bg-blue-50",
  purple: "border-purple-200 bg-purple-50",
  orange: "border-orange-200 bg-orange-50",
  green:  "border-green-200 bg-green-50",
  cyan:   "border-cyan-200 bg-cyan-50",
};

const BADGE_MAP: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  green:  "bg-green-100 text-green-700",
  cyan:   "bg-cyan-100 text-cyan-700",
};

export default function ResetDataButton() {
  const [step, setStep] = useState<Step>("idle");
  const [counts, setCounts] = useState<Counts>(null);
  const [selection, setSelection] = useState<Selection>({
    commandes: true, clients: true, produits: true, boutiques: true, livraisons: true,
  });
  const [confirmText, setConfirmText] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [error, setError] = useState("");

  const allSelected = Object.values(selection).every(Boolean);
  const anySelected = Object.values(selection).some(Boolean);

  function toggleAll() {
    const next = !allSelected;
    setSelection({ commandes: next, clients: next, produits: next, boutiques: next, livraisons: next });
  }

  async function loadCounts() {
    setStep("loading_counts");
    try {
      const res = await fetch("/api/admin/reset");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setCounts(data);
      setStep("select");
    } catch {
      setError("Impossible de charger les compteurs.");
      setStep("error");
    }
  }

  async function handleDelete() {
    setStep("deleting");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-confirm-reset": "RESET_CONFIRMED",
        },
        body: JSON.stringify(selection),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur");
        setStep("error");
        return;
      }
      const parts = Object.entries(data.deleted as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
      setResultMsg(`Supprimé avec succès : ${parts || "aucune donnée trouvée"}.`);
      setStep("done");
    } catch {
      setError("Erreur réseau. Réessayez.");
      setStep("error");
    }
  }

  // ── ÉTAPE 0 : bouton initial ──
  if (step === "idle") {
    return (
      <button
        onClick={loadCounts}
        className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-5 py-2.5 rounded-lg transition text-sm"
      >
        <Trash2 className="w-4 h-4" />
        Supprimer des données fictives…
      </button>
    );
  }

  // ── Chargement compteurs ──
  if (step === "loading_counts") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement des compteurs…
      </div>
    );
  }

  // ── Suppression en cours ──
  if (step === "deleting") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
        Suppression en cours…
      </div>
    );
  }

  // ── Succès ──
  if (step === "done") {
    return (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">{resultMsg}</div>
        </div>
        <button
          onClick={() => { setStep("idle"); setCounts(null); setConfirmText(""); }}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Recommencer
        </button>
      </div>
    );
  }

  // ── Erreur ──
  if (step === "error") {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">❌ {error}</div>
        <button onClick={() => setStep("idle")} className="text-sm text-slate-500 underline">Retour</button>
      </div>
    );
  }

  // ── ÉTAPE 1 : sélection ──
  if (step === "select") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Sélectionne les données à supprimer :</p>
          <button
            onClick={toggleAll}
            className="text-xs text-sky-600 hover:underline"
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        </div>

        <div className="space-y-2">
          {LABELS.map(({ key, label, color, detail }) => (
            <label
              key={key}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition hover:opacity-90 ${
                selection[key] ? COLOR_MAP[color] : "border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={selection[key]}
                onChange={() => setSelection((s) => ({ ...s, [key]: !s[key] }))}
                className="mt-0.5 w-4 h-4 accent-red-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">{label}</span>
                  {counts && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_MAP[color]}`}>
                      {key === "commandes" && `${counts.commandes.orders} enreg.`}
                      {key === "clients" && `${counts.clients.customers} enreg.`}
                      {key === "produits" && `${counts.produits.products} enreg.`}
                      {key === "boutiques" && `${counts.boutiques.boutiques} enreg.`}
                      {key === "livraisons" && `${counts.livraisons.deliveries} enreg.`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{detail(counts)}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setStep("confirm")}
            disabled={!anySelected}
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
          >
            Continuer <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStep("idle")}
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2.5"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 2 : confirmation par saisie ──
  if (step === "confirm") {
    const selectedLabels = LABELS.filter((l) => selection[l.key]).map((l) => l.label);

    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-300 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900 text-sm">Confirmation finale</p>
              <p className="text-sm text-red-800 mt-1">
                Tu vas supprimer définitivement :{" "}
                <strong>{selectedLabels.join(", ")}</strong>.
                Cette action est <strong>irréversible</strong>.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-red-900 mb-1.5">
              Tape <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">CONFIRMER</code> pour valider
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONFIRMER"
              className="w-full border-2 border-red-300 focus:border-red-500 rounded-lg px-3 py-2 text-sm font-mono outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={confirmText !== "CONFIRMER"}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer maintenant
          </button>
          <button
            onClick={() => { setStep("select"); setConfirmText(""); }}
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2.5"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  return null;
}
