import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // ── Feuille 1 : Template simple à remplir ──
  const template = [
    ["SKU *", "Nom *", "Catégorie *", "Prix GNF *", "Ancien Prix GNF", "Description", "Stock", "Badge", "Photo URL"],
    // Exemples à supprimer avant import
    ["MASQUE-LED-01",  "Masque LED 7 Couleurs",      "beaute", 220000, 320000, "Soin visage anti-âge, résultats en 2 semaines",     "OUI", "NEW",   "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c"],
    ["EPILATEUR-02",  "Épilateur Sans Douleur",      "beaute", 180000, 260000, "Épilation jambes et aisselles, rechargeable USB",    "OUI", "CHAUD", "https://images.unsplash.com/photo-1596462502278-27bfdc403348"],
    ["MONTRE-GPS-03", "Montre Connectée Sport GPS",  "tech",   210000, 310000, "Cardio, GPS, autonomie 7 jours, Android/iOS",        "OUI", "TOP",   "https://images.unsplash.com/photo-1546868871-7041f2a55e12"],
    ["ROBOT-COOK-04", "Robot Cuiseur 5L Multifonction","maison",220000,320000, "Cuit, mijote, frits. Timer programmable",            "OUI", "",      "https://images.unsplash.com/photo-1585515320310-259814833e62"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(template);
  ws["!cols"] = [
    { wch: 18 }, // SKU
    { wch: 30 }, // Nom
    { wch: 12 }, // Catégorie
    { wch: 14 }, // Prix
    { wch: 16 }, // Ancien prix
    { wch: 45 }, // Description
    { wch: 8  }, // Stock
    { wch: 8  }, // Badge
    { wch: 55 }, // Photo
  ];

  // ── Feuille 2 : Guide simple ──
  const guide = XLSX.utils.aoa_to_sheet([
    ["GUIDE RAPIDE — CATALOGUE PRODUITS COD CRM"],
    [""],
    ["Colonne",        "Obligatoire", "Valeurs acceptées"],
    ["SKU",            "OUI",         "Identifiant unique sans espace. Ex: MASQUE-01"],
    ["Nom",            "OUI",         "Nom du produit tel qu'affiché au client"],
    ["Catégorie",      "OUI",         "beaute  |  maison  |  tech  |  sante  |  mode  |  enfant"],
    ["Prix GNF",       "OUI",         "Chiffre uniquement. Ex: 220000"],
    ["Ancien Prix GNF","Non",         "Prix barré (promo). Ex: 320000"],
    ["Description",    "Non",         "1-2 phrases lues par les agents au téléphone"],
    ["Stock",          "Non",         "OUI  ou  NON  (défaut: OUI)"],
    ["Badge",          "Non",         "CHAUD  |  NEW  |  TOP  |  (laisser vide)"],
    ["Photo URL",      "Non",         "Lien https:// direct vers l'image produit"],
    [""],
    ["RÈGLES"],
    ["", "Ne pas modifier la ligne d'en-têtes (ligne 1)"],
    ["", "Supprimer les 4 lignes d'exemples avant d'importer"],
    ["", "Un seul SKU par produit — pas de doublons"],
    ["", "Prix en chiffres uniquement, sans GNF ni espace"],
  ]);
  guide["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 55 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catalogue");
  XLSX.utils.book_append_sheet(wb, guide, "Guide");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template_catalogue_hpshop.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
