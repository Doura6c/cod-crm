import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { randomKey } from "@/lib/utils";

// ADMIN uniquement — régénère la clé webhook d'une boutique (rotation).
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await context.params;
  const boutique = await prisma.boutique.findUnique({ where: { id }, select: { id: true } });
  if (!boutique) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const newKey = randomKey(40);
  await prisma.boutique.update({ where: { id }, data: { webhookKey: newKey } });

  return NextResponse.json({ ok: true, webhookKey: newKey });
}
