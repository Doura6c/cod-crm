"use client";

import { useState } from "react";
import {
  FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, RefreshCw,
  Unplug, ChevronDown, Table2,
} from "lucide-react";

type Props = {
  boutiqueId: string;
  initialSheetUrl: string | null;
  initialSyncEnabled: boolean;
  initialLastSyncAt: string | null;
  initialLastError: string | null;
  initialImportedCount: number;
};

type Preview = {
  headers: string[];
  mapped: string[];
  unmapped: string[];
  rowCount: number;
  skipped: { rowNumber: number; reason: string }[];
};

const COLONNES = [
  { nom: "Nom client", requis: true, ex: "Mamadou Diallo", alias: "client, name, nom, destinataire" },
  { nom: "Téléphone", requis: true, ex: "+224 622 111 001", alias: "tel, phone, portable, mobile" },
  { nom: "Produit", requis: false, ex: "Masque Moto", alias: "produit, article, item" },
  { nom: "Prix", requis: false, ex: "280000", alias: "prix, montant, price, total" },
  { nom: "Zone", requis: false, ex: "Ratoma", alias: "zone, ville, quartier" },
  { nom: "Adresse", requis: false, ex: "Carrefour Madina", alias: "adresse, address" },
  { nom: "Note", requis: false, ex: "Livrer le matin", alias: "note, commentaire" },
  { nom: "Quantité", requis: false, ex: "2", alias: "quantite, qty, qte" },
  { nom: "Référence", requis: false, ex: "CMD-001", alias: "reference, ref, code" },
];

export function SheetConnect(props: Props) {
  const [sheetUrl, setSheetUrl] = useState(props.initialSheetUrl ?? "");
  const [connected, setConnected] = useState(!!props.initialSheetUrl);
  const [syncEnabled, setSyncEnabled] = useState(props.initialSyncEnabled);
  const [lastSyncAt, setLastSyncAt] = useState(props.initialLastSyncAt);
  const [lastError, setLastError] = useState(props.initialLastError);
  const [importedCount, setImportedCount] = useState(props.initialImportedCount);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"" | "connect" | "sync" | "toggle" | "disconnect">("");
  const [error, setError] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [showFormat, setShowFormat] = useState(false);

  async function connect() {
    setBusy("connect"); setError(""); setPreview(null);
    try {
      const res = await fetch(`/api/boutiques/${props.boutiqueId}/sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnected(true);
        setPreview(data.preview);
        setLastError(null);
      } else {
        setError(data.error ?? "Erreur de connexion");
      }
    } catch {
      setError("Erreur réseau");
    }
    setBusy("");
  }

  async function syncNow() {
    setBusy("sync"); setError(""); setSyncMsg("");
    try {
      const res = await fetch(`/api/sync/sheets?boutiqueId=${props.boutiqueId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const r = data.results?.[0];
        if (r?.error) {
          setLastError(r.error);
          setError(r.error);
        } else if (r) {
          const parts = [];
          if (r.imported > 0) parts.push(`${r.imported} nouvelle(s)`);
          if (r.duplicatesFlagged > 0) parts.push(`${r.duplicatesFlagged} doublon(s) à vérifier`);
          if (r.blacklisted > 0) parts.push(`${r.blacklisted} client(s) blacklisté(s) ignoré(s)`);
          if (parts.length === 0) parts.push("aucune nouvelle commande");
          setSyncMsg(`Synchro OK — ${parts.join(", ")}.`);
          setImportedCount((n) => n + r.imported + r.duplicatesFlagged);
          setLastSyncAt(new Date().toISOString());
          setLastError(null);
        }
      } else {
        setError(data.error ?? "Erreur de synchronisation");
      }
    } catch {
      setError("Erreur réseau");
    }
    setBusy("");
  }

  async function toggleSync() {
    setBusy("toggle"); setError("");
    const next = !syncEnabled;
    try {
      const res = await fetch(`/api/boutiques/${props.boutiqueId}/sheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) setSyncEnabled(next);
      else setError((await res.json()).error ?? "Erreur");
    } catch {
      setError("Erreur réseau");
    }
    setBusy("");
  }

  async function disconnect() {
    if (!confirm("Déconnecter la feuille Google Sheets ? Les commandes déjà importées sont conservées.")) return;
    setBusy("disconnect"); setError("");
    try {
      const res = await fetch(`/api/boutiques/${props.boutiqueId}/sheet`, { method: "DELETE" });
      if (res.ok) {
        setConnected(false); setSyncEnabled(false); setSheetUrl(""); setPreview(null); setSyncMsg("");
      }
    } catch {
      setError("Erreur réseau");
    }
    setBusy("");
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800">Import Google Sheets</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            connected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} />
          {connected ? "Connecté" : "Non connecté"}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Le vendeur tient ses commandes dans une feuille Google Sheets ? Collez son lien : le CRM
        importe les nouvelles lignes automatiquement. Compatible avec les feuilles au format Rapido.
      </p>

      {/* 3 étapes */}
      {!connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm space-y-2">
          <div className="font-semibold text-amber-900">3 étapes pour connecter</div>
          <ol className="list-decimal list-inside text-amber-800 space-y-1">
            <li>
              Créez une feuille sur sheets.google.com avec en ligne 1 :{" "}
              <strong>Nom client</strong>, <strong>Téléphone</strong>, Produit, Prix, Zone, Adresse, Note
            </li>
            <li>
              Fichier → Partager → <strong>Tout le monde avec le lien</strong> en mode <strong>Lecteur</strong>
            </li>
            <li>Collez l&apos;URL ci-dessous puis cliquez Connecter</li>
          </ol>
        </div>
      )}

      {/* URL + Connecter */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="url"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          className="flex-1 min-w-[240px] border border-slate-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={connect}
          disabled={busy !== "" || !sheetUrl.trim()}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {connected ? "Reconnecter" : "Connecter"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-start gap-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {/* Aperçu après connexion réussie */}
      {preview && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm">
          <p className="flex items-center gap-1.5 text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Feuille lue : {preview.rowCount} ligne(s) exploitable(s)
          </p>
          <p className="text-emerald-700 text-xs mt-1">
            Colonnes reconnues : {preview.mapped.length ? preview.mapped.join(", ") : "aucune"}
            {preview.unmapped.length > 0 && <> — ignorées : {preview.unmapped.join(", ")}</>}
          </p>
          {preview.skipped.length > 0 && (
            <ul className="text-amber-700 text-xs mt-1 list-disc list-inside">
              {preview.skipped.map((s) => (
                <li key={s.rowNumber}>Ligne {s.rowNumber} : {s.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* État + actions quand connecté */}
      {connected && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800 text-sm">Sync automatique</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Vérifie la feuille à intervalle régulier
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSync}
                disabled={busy !== ""}
                aria-pressed={syncEnabled}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  syncEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    syncEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <div>
                Dernière synchro :{" "}
                {lastSyncAt ? new Date(lastSyncAt).toLocaleString("fr-FR") : "jamais"}
              </div>
              <div>Commandes importées : <strong className="text-slate-700">{importedCount}</strong></div>
              {lastError && <div className="text-red-600">Dernière erreur : {lastError}</div>}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
            <button
              type="button"
              onClick={syncNow}
              disabled={busy !== ""}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {busy === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Synchroniser maintenant
            </button>
            {syncMsg && <p className="text-xs text-emerald-700 font-medium">{syncMsg}</p>}
            <button
              type="button"
              onClick={disconnect}
              disabled={busy !== ""}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              <Unplug className="w-3.5 h-3.5" /> Déconnecter la feuille
            </button>
          </div>
        </div>
      )}

      {/* Format des colonnes accepté */}
      <div className="mt-4 border border-slate-200 rounded-lg">
        <button
          type="button"
          onClick={() => setShowFormat((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
        >
          <span className="inline-flex items-center gap-2">
            <Table2 className="w-4 h-4 text-sky-600" /> Format des colonnes accepté
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFormat ? "rotate-180" : ""}`} />
        </button>
        {showFormat && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {COLONNES.map((c) => (
                <div
                  key={c.nom}
                  className={`border-l-4 ${c.requis ? "border-red-400" : "border-emerald-400"} bg-slate-50 rounded p-3`}
                >
                  <div className="text-sm font-semibold text-slate-800">
                    {c.nom}{" "}
                    {c.requis && <span className="text-red-500 text-xs font-medium">requis</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Ex : <em>{c.ex}</em></div>
                  <div className="text-xs text-slate-400 mt-0.5">Accepte : {c.alias}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded p-2.5">
              💡 Les noms de colonnes ne sont pas sensibles à la casse ni aux accents. Une ligne déjà
              importée n&apos;est jamais réimportée. Contrairement à Rapido, un client qui recommande
              n&apos;est pas ignoré : la commande est créée et marquée « doublon possible » pour
              vérification par un agent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
