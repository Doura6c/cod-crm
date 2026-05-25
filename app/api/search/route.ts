import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);

  if (q.length < 2) return NextResponse.json({ orders: [], customers: [] });

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { customer: { fullName: { contains: q, mode: "insensitive" } } },
          { customer: { phone: { contains: q } } },
          { notes: { contains: q, mode: "insensitive" } },
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
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      include: { city: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({ orders, customers });
}
