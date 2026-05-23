import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      boutique: true,
      customer: { include: { city: true } },
      items: { include: { product: true } },
      assignedAgent: true,
      validatedBy: true,
      delivery: { include: { livreur: true } },
      invoice: true,
      callLogs: { include: { agent: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json();

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      subStatus: body.subStatus,
      notes: body.notes,
      reportDate: body.reportDate ? new Date(body.reportDate) : undefined,
      assignedAgentId: body.assignedAgentId,
      callCount: body.callCount,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
