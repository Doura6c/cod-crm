import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const { response } = await requireRole(["ADMIN", "MANAGER", "AGENT"]);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);

  if (q.length < 2) return NextResponse.json({ orders: [], customers: [] });

  // Normalisation téléphone : on retire espaces, "+", indicatif 224 et 0 initial
  // pour matcher quel que soit le format saisi (+224 628…, 00224…, 0628…, 628…).
  const phoneCore = q.replace(/\D/g, "").replace(/^224/, "").replace(/^0/, "");
  const phoneOr =
    phoneCore.length >= 5
      ? [
          { customer: { phone: { contains: phoneCore } } },
          { customer: { phone: { contains: q.replace(/\D/g, "") } } },
        ]
      : [];

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { customer: { fullName: { contains: q } } },
          { customer: { phone: { contains: q } } },
          ...phoneOr,
          { notes: { contains: q } },
        ],
      },
      include: {
        customer: { select: { fullName: true, phone: true } },
        boutique: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: q } },
          { phone: { contains: q } },
          ...(phoneCore.length >= 5 ? [{ phone: { contains: phoneCore } }] : []),
        ],
      },
      include: { city: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({ orders, customers });
}
