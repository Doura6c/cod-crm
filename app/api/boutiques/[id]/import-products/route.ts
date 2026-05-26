import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * POST /api/boutiques/[id]/import-products
 * Body JSON: { products: [...] }
 * Upsert par SKU — met à jour si existe, crée sinon.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403, headers: CORS });
  }

  const { id: boutiqueId } = await params;

  const boutique = await prisma.boutique.findUnique({ where: { id: boutiqueId } });
  if (!boutique) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404, headers: CORS });
  }

  const body = await req.json();
  const products: any[] = body.products ?? [];

  if (!products.length) {
    return NextResponse.json({ error: "Aucun produit fourni" }, { status: 400, headers: CORS });
  }

  const errors: { row: number; sku: string; error: string }[] = [];
  const created: string[] = [];
  const updated: string[] = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const sku   = String(p.sku ?? "").trim();
    const name  = String(p.name ?? "").trim();
    const price = parseFloat(String(p.price ?? "0").replace(/\s/g, ""));

    if (!sku) { errors.push({ row: i + 2, sku: "—", error: "SKU manquant" }); continue; }
    if (!name) { errors.push({ row: i + 2, sku, error: "Nom manquant" }); continue; }
    if (isNaN(price) || price <= 0) { errors.push({ row: i + 2, sku, error: "Prix invalide ou nul" }); continue; }

    const costPrice   = parseFloat(String(p.costPrice ?? "").replace(/\s/g, "")) || null;
    const stock       = parseInt(String(p.stock ?? "0"), 10) || 0;
    const stockAlert  = parseInt(String(p.stockAlert ?? "5"), 10) || 5;
    const description = String(p.description ?? "").trim() || null;
    const imageUrl    = String(p.imageUrl ?? "").trim() || null;

    try {
      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        await prisma.product.update({
          where: { sku },
          data: { name, price, costPrice, stock, stockAlert, description, imageUrl, boutiqueId, active: true },
        });
        updated.push(sku);
      } else {
        await prisma.product.create({
          data: { sku, name, price, costPrice, stock, stockAlert, description, imageUrl, boutiqueId, active: true },
        });
        created.push(sku);
      }
    } catch (err: any) {
      errors.push({ row: i + 2, sku, error: err.message ?? "Erreur DB" });
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total: products.length,
      created: created.length,
      updated: updated.length,
      errors: errors.length,
    },
    created,
    updated,
    errors,
  }, { status: 200, headers: CORS });
}
