import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderCode } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const boutiqueId = url.searchParams.get("boutiqueId");

  const orders = await prisma.order.findMany({
    where: {
      ...(status && { status }),
      ...(boutiqueId && { boutiqueId }),
    },
    include: {
      boutique: true,
      customer: { include: { city: true } },
      items: { include: { product: true } },
      assignedAgent: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { boutiqueId, customer, items, notes, cityId } = body;

  if (!boutiqueId || !customer?.phone || !items?.length) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const cust = await prisma.customer.upsert({
    where: { id: customer.id ?? "_new" },
    create: {
      fullName: customer.fullName,
      phone: customer.phone,
      altPhone: customer.altPhone,
      address: customer.address,
      cityId: cityId ?? null,
      commune: customer.commune,
    },
    update: {
      fullName: customer.fullName,
      address: customer.address,
      cityId: cityId ?? null,
    },
  });

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i: any) => i.productId) } },
  });

  let subtotal = 0;
  const orderItemsData = items.map((it: any) => {
    const p = products.find((x) => x.id === it.productId);
    if (!p) throw new Error("Produit introuvable");
    const lineTotal = p.price * it.quantity;
    subtotal += lineTotal;
    return {
      productId: p.id,
      quantity: it.quantity,
      unitPrice: p.price,
      subtotal: lineTotal,
    };
  });

  const city = cityId ? await prisma.city.findUnique({ where: { id: cityId } }) : null;
  const deliveryFee = city?.deliveryFee ?? 0;

  const order = await prisma.order.create({
    data: {
      code: generateOrderCode(),
      boutiqueId,
      customerId: cust.id,
      cityId: cityId ?? null,
      totalAmount: subtotal + deliveryFee,
      deliveryFee,
      notes,
      source: "MANUAL",
      items: { create: orderItemsData },
    },
    include: { items: true },
  });

  return NextResponse.json(order, { status: 201 });
}
