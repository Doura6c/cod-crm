import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const { response } = await requireRole(["ADMIN", "MANAGER", "AGENT"]);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);

  if (q.length < 2) return NextResponse.json({ orders: [], customers: [] });

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { customer: { fullName: { contains: q } } },
          { customer: { phone: { contains: q } } },
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
        ],
      },
      include: { city: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({ orders, customers });
}
