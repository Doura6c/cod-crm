import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "@/lib/apiAuth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const products = await prisma.product.findMany({ include: { boutique: true } });

  // Seuls ADMIN/MANAGER voient les coûts d'achat (marges sensibles)
  const canSeeCost = user.role === "ADMIN" || user.role === "MANAGER";
  const result = canSeeCost
    ? products
    : products.map((p) => ({ ...p, costPrice: null }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  // Création de produit réservée ADMIN/MANAGER
  if (user.role !== "ADMIN" && user.role !== "MANAGER") return forbidden();
  const body = await req.json();

  const product = await prisma.product.create({
    data: {
      sku: body.sku,
      name: body.name,
      description: body.description,
      price: Number(body.price),
      costPrice: body.costPrice ? Number(body.costPrice) : null,
      stock: Number(body.stock ?? 0),
      stockAlert: Number(body.stockAlert ?? 5),
      imageUrl: body.imageUrl,
      boutiqueId: body.boutiqueId,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
