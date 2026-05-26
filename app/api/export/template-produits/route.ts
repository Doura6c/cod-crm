import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Feuille 1 : Template à remplir
  const template = [
    // En-têtes
    ["SKU *", "Nom du produit *", "Description", "Prix de vente (GNF) *", "Prix d'achat (GNF)", "Stock initial", "Alerte stock bas", "Catégorie", "URL Image", "Tags (virgule)"],
    // Exemples
    ["MASQUE-LED-01",  "Masque LED Anti-Age",      "Masque luminothérapie 7 couleurs, résultats visibles en 4 semaines", 350000, 180000, 20, 5,  "Beauté / Soins visage", "https://exemple.com/img1.jpg", "beauté,anti-age,led"],
    ["EPILATEUR-02",  "Épilateur Électrique Pro",  "Épilation définitive sans douleur, 3 vitesses, étanche",             185000, 90000,  15, 3,  "Beauté / Corps",        "https://exemple.com/img2.jpg", "épilation,pro,femme"],
    ["MONTRE-GPS-03", "Montre GPS Connectée",      "Montre sport GPS, cardio, 7 jours autonomie, compatible Android/iOS", 210000, 100000, 10, 2,  "Électronique",          "https://exemple.com/img3.jpg", "montre,sport,gps"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(template);

  // Style colonnes
  ws["!cols"] = [
    { wch: 20 }, // SKU
    { wch: 35 }, // Nom
    { wch: 50 }, // Description
    { wch: 20 }, // Prix vente
    { wch: 18 }, // Prix achat
    { wch: 14 }, // Stock
    { wch: 16 }, // Alerte
    { wch: 22 }, // Catégorie
    { wch: 45 }, // Image
    { wch: 25 }, // Tags
  ];

  // Feuille 2 : Guide
  const guide = XLSX.utils.aoa_to_sheet([
    ["📘 GUIDE D'IMPORT — CATALOGUE PRODUITS COD CRM"],
    [""],
    ["Colonne", "Obligatoire", "Type", "Description / Exemple"],
    ["SKU *",              "OUI", "Texte",  "Identifiant unique (ex: MASQUE-LED-01). Pas d'espace ni caractère spécial."],
    ["Nom du produit *",   "OUI", "Texte",  "Nom affiché dans le CRM et lu par les agents."],
    ["Description",        "Non", "Texte",  "Description courte. Aide les agents à répondre aux questions clients."],
    ["Prix de vente *",    "OUI", "Nombre", "Prix public en Francs Guinéens (GNF). Ex: 350000"],
    ["Prix d'achat",       "Non", "Nombre", "Coût d'achat. Sert au calcul de marge et rentabilité."],
    ["Stock initial",      "Non", "Nombre", "Quantité disponible. Défaut = 0 si vide."],
    ["Alerte stock bas",   "Non", "Nombre", "Seuil d'alerte. Défaut = 5 si vide."],
    ["Catégorie",          "Non", "Texte",  "ex: Beauté, Électronique, Mode..."],
    ["URL Image",          "Non", "URL",    "Lien vers l'image produit (https://...)"],
    ["Tags",               "Non", "Texte",  "Mots-clés séparés par virgule. Ex: beauté,femme,anti-age"],
    [""],
    ["⚠️  RÈGLES IMPORTANTES"],
    ["", "Ne pas modifier la ligne d'en-tête (ligne 1)"],
    ["", "SKU = identifiant unique. Deux produits ne peuvent pas avoir le même SKU."],
    ["", "Les colonnes avec * sont obligatoires."],
    ["", "Prix en chiffres uniquement. Ne pas écrire 'GNF' ou des espaces."],
    ["", "Supprimer les lignes d'exemple avant d'importer."],
    [""],
    ["💡  CONSEILS COD"],
    ["", "Mettez des descriptions courtes et claires → les agents les lisent au téléphone."],
    ["", "Le prix d'achat vous permet de calculer votre ROI et votre seuil de rentabilité."],
    ["", "Définissez une alerte stock = délai de réapprovisionnement en jours × ventes/jour."],
  ]);

  guide["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "📦 Catalogue produits");
  XLSX.utils.book_append_sheet(wb, guide, "📘 Guide");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `template_catalogue_codcrm.xlsx`;

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
