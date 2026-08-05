/**
 * Connecteur Google Sheets — lecture d'une feuille publique de commandes.
 *
 * Reproduit (et étend) le format d'import de Rapido : le marchand crée une
 * feuille avec les colonnes « Nom client, Téléphone, Produit, Prix, Zone,
 * Adresse, Note », la rend publique en Lecteur, et colle l'URL dans le CRM.
 * Aucune API Google ni compte de service : on lit l'export CSV public.
 *
 * Ce module est volontairement pur (pas de Prisma) pour être testable :
 * la création des commandes vit dans app/api/sync/sheets/route.ts.
 */
import { createHash } from "crypto";

// ── Alias de colonnes (mêmes que Rapido + extensions quantité/référence) ──
// Comparaison insensible à la casse ET aux accents.
const HEADER_ALIASES: Record<string, string[]> = {
  fullName: ["nom client", "client", "name", "nom", "destinataire", "nom complet", "fullname"],
  phone: ["telephone", "tel", "phone", "portable", "mobile", "numero", "contact"],
  product: ["produit", "article", "item", "produits", "designation", "product"],
  price: ["prix", "montant", "price", "total", "montant total", "prix total"],
  zone: ["zone", "ville", "quartier", "city", "commune"],
  address: ["adresse", "address", "lieu", "localisation"],
  note: ["note", "commentaire", "notes", "remarque", "observation"],
  // Extensions absentes de Rapido :
  quantity: ["quantite", "qty", "qte", "nombre", "quantity"],
  externalRef: ["reference", "ref", "code", "code commande", "id commande", "externalref"],
};

/** Champs sans lesquels une ligne est inutilisable (mêmes exigences que Rapido). */
export const REQUIRED_FIELDS = ["fullName", "phone"] as const;

export type SheetRow = {
  fullName: string;
  phone: string;
  product: string;
  price: number;
  quantity: number;
  zone: string;
  address: string;
  note: string;
  externalRef: string; // empreinte calculée si non fournie
  rowNumber: number;   // n° de ligne dans la feuille (1 = en-têtes)
};

export type ParsedSheet = {
  headers: string[];                 // en-têtes bruts de la ligne 1
  mapping: Record<string, number>;   // champ canonique → index de colonne
  unmappedHeaders: string[];         // colonnes ignorées
  missingRequired: string[];         // champs requis introuvables
  rows: SheetRow[];
  skipped: { rowNumber: number; reason: string }[];
};

/** Retire les accents et normalise pour comparer les en-têtes. */
function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Extrait l'ID de feuille d'une URL Google Sheets.
 * Accepte les formes /spreadsheets/d/{id}/... et les URLs avec ?gid=.
 */
export function extractSheetId(url: string): { sheetId: string; gid: string | null } | null {
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) return null;
  const gidMatch = url.match(/[?#&]gid=(\d+)/);
  return { sheetId: m[1], gid: gidMatch ? gidMatch[1] : null };
}

/** URL d'export CSV public d'une feuille (pas d'API, pas d'auth). */
export function csvExportUrl(sheetId: string, gid: string | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

/**
 * Parseur CSV conforme RFC 4180 : guillemets, virgules et retours à la
 * ligne dans les champs, guillemets échappés ("").
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Retirer un éventuel BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  // Ignorer les lignes entièrement vides
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Associe chaque en-tête de la feuille à un champ canonique via les alias. */
export function mapHeaders(headerRow: string[]): {
  mapping: Record<string, number>;
  unmapped: string[];
} {
  const mapping: Record<string, number> = {};
  const unmapped: string[] = [];
  headerRow.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    if (!norm) return;
    const field = Object.keys(HEADER_ALIASES).find(
      (f) => !(f in mapping) && HEADER_ALIASES[f].some((a) => normalizeHeader(a) === norm)
    );
    if (field) mapping[field] = idx;
    else unmapped.push(h.trim());
  });
  return { mapping, unmapped };
}

/** Normalise un téléphone guinéen : chiffres seuls, préfixe 224 optionnel retiré. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00224")) p = p.slice(5);
  else if (p.startsWith("224") && p.length > 9) p = p.slice(3);
  return p;
}

/** Prix : accepte "280000", "280 000", "280.000", "280,000 GNF". */
export function parsePrice(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  // Les séparateurs de milliers (espace/point/virgule) sont ambigus ; en GNF
  // il n'y a pas de décimales → on garde les chiffres seuls.
  const digits = cleaned.replace(/[.,]/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Empreinte stable d'une ligne → externalRef d'idempotence.
 * Basée sur le CONTENU (pas la position) : réordonner ou insérer des lignes
 * dans la feuille ne réimporte rien. Deux lignes au contenu strictement
 * identique reçoivent un suffixe d'occurrence (#2, #3…) : une vraie
 * re-commande identique du même client crée bien une 2e commande.
 */
export function rowFingerprint(
  r: Pick<SheetRow, "phone" | "product" | "price" | "quantity" | "zone" | "address" | "note">,
  occurrence: number
): string {
  const basis = [r.phone, r.product, r.price, r.quantity, r.zone, r.address, r.note]
    .map((v) => String(v).trim().toLowerCase())
    .join("|");
  const hash = createHash("sha256").update(basis).digest("hex").slice(0, 16);
  return occurrence > 1 ? `SHEET:${hash}#${occurrence}` : `SHEET:${hash}`;
}

/** Parse le CSV complet d'une feuille de commandes. */
export function parseSheet(csvText: string, maxRows = 500): ParsedSheet {
  const grid = parseCsv(csvText);
  if (grid.length === 0) {
    return { headers: [], mapping: {}, unmappedHeaders: [], missingRequired: [...REQUIRED_FIELDS], rows: [], skipped: [] };
  }
  const headers = grid[0].map((h) => h.trim());
  const { mapping, unmapped } = mapHeaders(headers);
  const missingRequired = REQUIRED_FIELDS.filter((f) => !(f in mapping));

  const rows: SheetRow[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];
  const seen = new Map<string, number>(); // empreinte → occurrences

  const get = (line: string[], field: string) =>
    field in mapping ? String(line[mapping[field]] ?? "").trim() : "";

  for (let i = 1; i < grid.length && rows.length < maxRows; i++) {
    const line = grid[i];
    const rowNumber = i + 1;
    const phone = normalizePhone(get(line, "phone"));
    const fullName = get(line, "fullName");

    if (!phone && !fullName && !get(line, "product")) continue; // ligne décorative
    if (!phone || phone.length < 8) {
      skipped.push({ rowNumber, reason: `Téléphone invalide ("${get(line, "phone")}")` });
      continue;
    }
    if (!fullName) {
      skipped.push({ rowNumber, reason: "Nom client manquant" });
      continue;
    }

    const quantity = Math.max(1, parseInt(get(line, "quantity") || "1", 10) || 1);
    const partial = {
      phone,
      product: get(line, "product") || "Produit",
      price: parsePrice(get(line, "price")),
      quantity,
      zone: get(line, "zone"),
      address: get(line, "address"),
      note: get(line, "note"),
    };

    // Référence fournie par le marchand, sinon empreinte de contenu
    let externalRef = get(line, "externalRef");
    if (externalRef) {
      externalRef = `SHEET:${externalRef.slice(0, 80)}`;
    } else {
      const key = rowFingerprint(partial, 1);
      const occ = (seen.get(key) ?? 0) + 1;
      seen.set(key, occ);
      externalRef = rowFingerprint(partial, occ);
    }

    rows.push({ fullName, ...partial, externalRef, rowNumber });
  }

  return { headers, mapping, unmappedHeaders: unmapped, missingRequired, rows, skipped };
}

/**
 * Télécharge le CSV d'une feuille publique. Erreurs explicites :
 * feuille privée (redirection vers la page de connexion Google) ou introuvable.
 */
export async function fetchSheetCsv(sheetUrl: string, timeoutMs = 15000): Promise<
  { ok: true; csv: string } | { ok: false; error: string }
> {
  const parsed = extractSheetId(sheetUrl);
  if (!parsed) {
    return { ok: false, error: "URL invalide. Attendu : https://docs.google.com/spreadsheets/d/…" };
  }
  const url = csvExportUrl(parsed.sheetId, parsed.gid);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { Accept: "text/csv,*/*" },
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || contentType.includes("text/html")) {
      // Google renvoie une page HTML (connexion / accès refusé) si la feuille n'est pas publique
      return {
        ok: false,
        error:
          res.status === 404
            ? "Feuille introuvable. Vérifiez l'URL."
            : "Feuille non publique. Dans Google Sheets : Fichier → Partager → « Tout le monde avec le lien » en mode Lecteur.",
      };
    }
    const csv = await res.text();
    if (csv.length > 2 * 1024 * 1024) {
      return { ok: false, error: "Feuille trop volumineuse (max 2 Mo)." };
    }
    return { ok: true, csv };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name === "AbortError" ? "Délai dépassé en lisant la feuille." : "Feuille injoignable.",
    };
  } finally {
    clearTimeout(timer);
  }
}
