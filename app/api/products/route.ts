import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({ include: { boutique: true } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
