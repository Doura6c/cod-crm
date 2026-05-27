"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertTriangle, Loader2, X, ArrowRight, Eye, SkipForward
} from "lucide-react";

type ProductRow = {
  sku: string; name: string; description: string;
  price: number; costPrice: number | null;
  stock: number; stockAlert: number;
  imageUrl: string; category: string; tags: string;
  _valid: boolean; _errors: string[];
};

type ImportResult = {
  summary: { total: number; created: number; updated: number; errors: number };
  errors: { row: number; sku: string; error: string }[];
};

export default function ImporterClient({ boutiqueId, boutiqueName }: { boutiqueId: string; boutiqueName: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Colonnes : SKU | Nom | Catégorie | Prix | Ancien Prix | Description | Stock | Badge | Photo URL
  async function parseFile(file: File) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    const EXEMPLES = ["MASQUE-LED-01", "EPILATEUR-02", "MONTRE-GPS-03", "ROBOT-COOK-04"];
    const CATS_OK  = ["beaute", "maison", "tech", "sante", "mode", "enfant"];

    const parsed: ProductRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every((c: any) => c === "" || c === null || c === undefined)) continue;

      const sku         = String(row[0] ?? "").trim();
      const name        = String(row[1] ?? "").trim();
      const category    = String(row[2] ?? "").trim().toLowerCase();
      const price       = parseFloat(String(row[3] ?? "0").replace(/\s/g, ""));
      const costPrice   = row[4] !== "" ? parseFloat(String(row[4]).replace(/\s/g, "")) : null;
      const description = String(row[5] ?? "").trim();
      const stockVal    = String(row[6] ?? "OUI").trim().toUpperCase();
      const stock       = stockVal === "NON" ? 0 : 1;
      const stockAlert  = 5;
      const imageUrl    = String(row[8] ?? "").trim();

      const errors: string[] = [];
      if (!sku) errors.push("SKU manquant");
      if (!name) errors.push("Nom manquant");
      if (isNaN(price) || price <= 0) errors.push("Prix invalide");
      if (category && !CATS_OK.includes(category)) errors.push(`Catégorie invalide: "${category}"`);
      if (EXEMPLES.includes(sku)) errors.push("Ligne d'exemple — à supprimer");

      parsed.push({ sku, name, description, price, costPrice, stock, stockAlert, imageUrl, category, tags: "", _valid: errors.length === 0, _errors: errors });
    }

    return parsed;
  }

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Format non supporté. Utilisez un fichier .xlsx, .xls ou .csv");
      return;
    }
    setFileName(file.name);
    const parsed = await parseFile(file);
    setRows(parsed);
    setStep("preview");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r._valid);
    if (!validRows.length) return;
    setStep("importing");

    const payload = validRows.map((r) => ({
      sku: r.sku, name: r.name, description: r.description,
      price: r.price, costPrice: r.costPrice,
      stock: r.stock, stockAlert: r.stockAlert,
      imageUrl: r.imageUrl,
    }));

    const res = await fetch(`/api/boutiques/${boutiqueId}/import-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: payload }),
    });

    const data = await res.json();
    setResult(data);
    setStep("done");
  }

  const validCount   = rows.filter((r) => r._valid).length;
  const invalidCount = rows.filter((r) => !r._valid).length;

  // ── UPLOAD ──
  if (step === "upload") {
    return (
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex items-start gap-4">
          <FileSpreadsheet className="w-8 h-8 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sky-900">Importer le catalogue produits de <span className="text-sky-600">{boutiqueName}</span></h2>
            <p className="text-sm text-sky-700 mt-1">
              Télécharge le template Excel, remplis-le avec les produits du vendeur, puis importe-le ici.
              Les agents auront accès aux produits, descriptions et prix pendant les appels.
            </p>
          </div>
        </div>

        {/* Étape A : Télécharger le template */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">① Télécharger le template</h3>
              <p className="text-sm text-slate-500 mt-0.5">Fichier Excel pré-formaté avec colonnes et exemples</p>
            </div>
            <a
              href="/api/export/template-produits"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
            >
              <Download className="w-4 h-4" />
              Télécharger template.xlsx
            </a>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p>📦 <strong>Colonnes :</strong> SKU*, Nom*, Description, Prix vente*, Prix achat, Stock, Alerte stock, Catégorie, Image URL, Tags</p>
            <p>💡 <strong>Conseil COD :</strong> Remplis les descriptions → les agents les lisent au téléphone pour convaincre le client</p>
            <p>📊 <strong>Prix d'achat :</strong> facultatif mais recommandé pour calculer ton ROI par commande</p>
          </div>
        </div>

        {/* Étape B : Uploader */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-800 mb-1">② Uploader le fichier rempli</h3>
          <p className="text-sm text-slate-500 mb-4">Formats acceptés : .xlsx, .xls, .csv</p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
              dragOver ? "border-sky-400 bg-sky-50" : "border-slate-300 hover:border-sky-400 hover:bg-sky-50/50"
            }`}
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Glisser-déposer ton fichier ici</p>
            <p className="text-sm text-slate-500 mt-1">ou cliquer pour parcourir</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        </div>

        {/* Passer cette étape */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => router.push(`/boutiques/${boutiqueId}/integration`)}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <SkipForward className="w-4 h-4" />
            Passer cette étape (importer plus tard)
          </button>
        </div>
      </div>
    );
  }

  // ── PREVIEW ──
  if (step === "preview") {
    return (
      <div className="space-y-5">
        {/* Résumé */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-xs text-slate-500">Fichier</div>
              <div className="font-semibold text-slate-800 text-sm">{fileName}</div>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
            <div className="text-xs text-emerald-600">Valides</div>
            <div className="font-bold text-emerald-700 text-xl">{validCount}</div>
          </div>
          {invalidCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
              <div className="text-xs text-red-500">Erreurs</div>
              <div className="font-bold text-red-700 text-xl">{invalidCount}</div>
            </div>
          )}
          <button
            onClick={() => { setStep("upload"); setRows([]); setFileName(""); }}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4" /> Changer de fichier
          </button>
        </div>

        {/* Tableau preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-800 text-sm">Aperçu — {rows.length} lignes détectées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-6">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Statut</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">SKU</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Nom</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Prix vente</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Prix achat</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Stock</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Erreurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row._valid ? "hover:bg-slate-50" : "bg-red-50"}>
                    <td className="px-3 py-2 text-slate-400">{i + 2}</td>
                    <td className="px-3 py-2">
                      {row._valid
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />OK</span>
                        : <span className="inline-flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3.5 h-3.5" />Erreur</span>
                      }
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">{row.sku || <span className="text-red-400 italic">vide</span>}</td>
                    <td className="px-3 py-2 text-slate-800 max-w-[200px] truncate">{row.name || <span className="text-red-400 italic">vide</span>}</td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {row.price > 0 ? `${row.price.toLocaleString("fr-FR")} GNF` : <span className="text-red-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {row.costPrice ? `${row.costPrice.toLocaleString("fr-FR")} GNF` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{row.stock}</td>
                    <td className="px-3 py-2 text-red-600 text-xs">{row._errors.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Avertissements */}
        {invalidCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>{invalidCount} ligne(s) avec erreurs</strong> seront ignorées lors de l'import.
              Seules les <strong>{validCount} lignes valides</strong> seront importées.
              Tu peux corriger le fichier et recharger.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleImport}
            disabled={validCount === 0}
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-7 py-3 rounded-xl transition"
          >
            <Upload className="w-4 h-4" />
            Importer {validCount} produit{validCount > 1 ? "s" : ""}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/boutiques/${boutiqueId}/integration`)}
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-3"
          >
            Passer →
          </button>
        </div>
      </div>
    );
  }

  // ── IMPORTING ──
  if (step === "importing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
        <p className="font-semibold text-slate-700">Import en cours…</p>
        <p className="text-sm text-slate-500">Création des produits dans le CRM</p>
      </div>
    );
  }

  // ── DONE ──
  if (step === "done" && result) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-emerald-900 text-lg">Import terminé !</h2>
            <p className="text-sm text-emerald-700 mt-1">Le catalogue de <strong>{boutiqueName}</strong> est dans le CRM.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total traité", value: result.summary.total, color: "slate" },
            { label: "Créés", value: result.summary.created, color: "emerald" },
            { label: "Mis à jour", value: result.summary.updated, color: "sky" },
            { label: "Erreurs", value: result.summary.errors, color: result.summary.errors > 0 ? "red" : "slate" },
          ].map((s) => (
            <div key={s.label} className={`bg-white border rounded-xl p-4 text-center border-${s.color}-200`}>
              <div className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Erreurs détaillées */}
        {result.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Lignes ignorées
            </h3>
            <div className="space-y-1">
              {result.errors.map((e, i) => (
                <div key={i} className="text-xs text-red-700 flex gap-3">
                  <span className="font-mono">Ligne {e.row}</span>
                  <span className="font-mono text-red-500">{e.sku}</span>
                  <span>{e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA → Étape 3 */}
        <button
          onClick={() => router.push(`/boutiques/${boutiqueId}/integration`)}
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-8 py-3 rounded-xl transition"
        >
          Étape 3 — Webhook & Go Live
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
