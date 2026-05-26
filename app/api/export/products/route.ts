import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const boutiqueId = searchParams.get("boutiqueId") ?? "";
  const slug = searchParams.get("slug") ?? "";

  // Résoudre la boutique par slug si fourni
  let resolvedBoutiqueId = boutiqueId;
  if (!resolvedBoutiqueId && slug) {
    const b = await prisma.boutique.findUnique({ where: { slug } });
    if (b) resolvedBoutiqueId = b.id;
  }

  const products = await prisma.product.findMany({
    where: {
      ...(resolvedBoutiqueId ? { boutiqueId: resolvedBoutiqueId } : {}),
      active: true,
    },
    include: { boutique: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const rows = products.map((p) => ({
    "SKU": p.sku,
    "Nom du produit": p.name,
    "Description": p.description ?? "",
    "Prix de vente (GNF)": p.price,
    "Prix d'achat (GNF)": p.costPrice ?? "",
    "Stock actuel": p.stock,
    "Alerte stock": p.stockAlert,
    "Boutique": p.boutique?.name ?? "—",
    "Actif": p.active ? "Oui" : "Non",
    "Image URL": p.imageUrl ?? "",
    "Date création": new Date(p.createdAt).toLocaleDateString("fr-FR"),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Largeurs colonnes
  ws["!cols"] = [
    { wch: 20 }, // SKU
    { wch: 35 }, // Nom
    { wch: 40 }, // Description
    { wch: 18 }, // Prix vente
    { wch: 18 }, // Prix achat
    { wch: 14 }, // Stock
    { wch: 14 }, // Alerte
    { wch: 20 }, // Boutique
    { wch: 8 },  // Actif
    { wch: 45 }, // Image
    { wch: 14 }, // Date
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catalogue produits");

  // Feuille 2 : guide d'import
  const guide = XLSX.utils.aoa_to_sheet([
    ["GUIDE D'IMPORT — CATALOGUE PRODUITS COD CRM"],
    [""],
    ["Colonne", "Obligatoire", "Description"],
    ["SKU", "OUI", "Identifiant unique du produit (ex: MASQUE-MOTO-01)"],
    ["Nom du produit", "OUI", "Nom affiché dans le CRM et sur les commandes"],
    ["Description", "Non", "Description courte"],
    ["Prix de vente (GNF)", "OUI", "Prix public en Francs Guinéens"],
    ["Prix d'achat (GNF)", "Non", "Pour calcul de marge"],
    ["Stock actuel", "Non", "Quantité en stock (défaut: 0)"],
    ["Alerte stock", "Non", "Seuil d'alerte stock bas (défaut: 5)"],
    ["Image URL", "Non", "Lien vers l'image produit"],
  ]);
  guide["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, guide, "Guide import");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const boutiqueLabel = resolvedBoutiqueId
    ? (products[0]?.boutique?.name?.replace(/\s+/g, "_") ?? "boutique")
    : "tous_produits";
  const filename = `catalogue_${boutiqueLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
