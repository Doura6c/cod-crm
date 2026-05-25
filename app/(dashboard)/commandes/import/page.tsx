"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Download } from "lucide-react";

const REQUIRED_COLS = ["phone"];
const OPTIONAL_COLS = ["fullName", "address", "city", "product", "price", "quantity", "deliveryFee", "notes", "externalRef"];

const CSV_EXAMPLE = `phone,fullName,address,city,product,price,quantity,deliveryFee,notes
224621881210,Mamadou Diallo,Quartier Almamya,Conakry,Masque Moto,170000,1,15000,
224622334455,Fatoumata Bah,Labe Centre,Labe,Casque intégral,250000,2,20000,Livrer le matin
224623445566,Ibrahima Sow,,Kindia,Gants moto,80000,1,0,`;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

export default function ImportPage() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = (text: string) => {
    setCsvText(text);
    const rows = parseCSV(text);
    setPreview(rows.slice(0, 5));
    setResult(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleParse((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    const rows = parseCSV(csvText);
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/import/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: 0, skipped: 0, errors: ["Erreur réseau — réessayez."] });
    } finally {
      setLoading(false);
    }
  };

  const downloadExample = () => {
    const blob = new Blob([CSV_EXAMPLE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "exemple_import_commandes.csv";
    a.click();
  };

  const rows = parseCSV(csvText);
  const allCols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <PageHeader
        title="Import de commandes"
        badges={[{ label: "CSV", color: "bg-slate-700 text-white" }]}
        actions={
          <Link
            href="/commandes/liste"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        }
      />

      <div className="p-4 lg:p-6 max-w-4xl space-y-6">

        {/* Instructions */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sky-800 mb-2">Format CSV attendu</div>
              <div className="text-sm text-sky-700 mb-3">
                Colonnes supportées : <code className="bg-sky-100 px-1 rounded">phone</code> (obligatoire),{" "}
                {OPTIONAL_COLS.map((c) => <code key={c} className="bg-sky-100 px-1 rounded mr-1">{c}</code>)}
              </div>
              <div className="text-sm text-sky-700">
                Les colonnes peuvent aussi être en français : <code className="bg-sky-100 px-1 rounded">nom</code>,{" "}
                <code className="bg-sky-100 px-1 rounded">ville</code>,{" "}
                <code className="bg-sky-100 px-1 rounded">adresse</code>,{" "}
                <code className="bg-sky-100 px-1 rounded">produit</code>,{" "}
                <code className="bg-sky-100 px-1 rounded">prix</code>.
              </div>
              <button
                onClick={downloadExample}
                className="mt-3 inline-flex items-center gap-2 text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" /> Télécharger le modèle CSV
              </button>
            </div>
          </div>
        </div>

        {/* Zone upload */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">1. Charger le fichier CSV</h2>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-sky-400 hover:bg-sky-50 transition cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            <div className="text-slate-600 font-semibold">Glissez votre CSV ici ou cliquez pour choisir</div>
            <div className="text-xs text-slate-400 mt-1">Format .csv, encodage UTF-8 recommandé</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="text-center text-sm text-slate-400">— ou collez directement le contenu CSV —</div>

          <textarea
            rows={8}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder={`phone,fullName,city,product,price,quantity\n224621881210,Mamadou Diallo,Conakry,Masque Moto,170000,1`}
            value={csvText}
            onChange={(e) => handleParse(e.target.value)}
          />
        </div>

        {/* Prévisualisation */}
        {preview.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">2. Aperçu ({rows.length} lignes détectées)</h2>
              {!REQUIRED_COLS.every((c) => allCols.includes(c)) && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> Colonne &quot;phone&quot; manquante
                </span>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    {allCols.map((col) => (
                      <th key={col} className="px-3 py-2 text-left whitespace-nowrap">
                        {col}
                        {REQUIRED_COLS.includes(col) && <span className="text-red-500 ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {allCols.map((col) => (
                        <td key={col} className="px-3 py-2 text-slate-700 max-w-[150px] truncate">
                          {row[col] || <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <div className="text-xs text-slate-400 text-center">Aperçu des 5 premières lignes sur {rows.length}</div>
            )}
          </div>
        )}

        {/* Résultat */}
        {result && (
          <div className={`border rounded-xl p-5 ${result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-center gap-3 mb-3">
              {result.errors.length === 0 ? (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              )}
              <div className="font-bold text-slate-800">Résultat de l&apos;import</div>
            </div>
            <div className="flex gap-6 mb-3">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-600">{result.success}</div>
                <div className="text-xs text-slate-500">Créées</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-amber-600">{result.skipped}</div>
                <div className="text-xs text-slate-500">Ignorées</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1.5">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {e}
                  </div>
                ))}
                {result.errors.length > 10 && (
                  <div className="text-xs text-slate-500 text-center">...et {result.errors.length - 10} autre(s) erreur(s)</div>
                )}
              </div>
            )}
            {result.success > 0 && (
              <div className="mt-4">
                <Link
                  href="/commandes/liste"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Voir les commandes importées →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bouton import */}
        {rows.length > 0 && !result && (
          <div>
            <button
              onClick={handleImport}
              disabled={loading || !REQUIRED_COLS.every((c) => allCols.includes(c))}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl text-base transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Importer {rows.length} commande{rows.length > 1 ? "s" : ""}
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              Les commandes déjà existantes (même référence) seront ignorées automatiquement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
