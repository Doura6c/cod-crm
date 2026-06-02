import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/suivi?q=CODE_OU_TELEPHONE
 * Public — pas d'auth requise
 * Retourne l'orderId pour redirection vers /suivi/[id]
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }

  // Chercher par code commande (ex: HMP-2024-XXXX)
  const byCode = await prisma.order.findFirst({
    where: { code: { equals: q, mode: "insensitive" } },
    select: { id: true },
  });
  if (byCode) return NextResponse.json({ orderId: byCode.id });

  // Chercher par numéro de téléphone (correspondance exacte — M1 : évite l'énumération partielle)
  const phone = q.replace(/\s+/g, "");
  const byPhone = await prisma.order.findFirst({
    where: { customer: { phone: { equals: phone } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (byPhone) return NextResponse.json({ orderId: byPhone.id });

  // Chercher par externalRef
  const byRef = await prisma.order.findFirst({
    where: { externalRef: q },
    select: { id: true },
  });
  if (byRef) return NextResponse.json({ orderId: byRef.id });

  return NextResponse.json({ orderId: null }, { status: 404 });
}
