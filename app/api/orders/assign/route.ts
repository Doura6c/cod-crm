import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "ASSIGN_ORDER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let orderIds: string[] = [];
  let agentId: string | null = null;
  let redirectTo = "/commandes/confirmation";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    orderIds = body.orderIds ?? [];
    agentId = body.agentId ?? null;
  } else {
    const form = await req.formData();
    const idsField = form.get("orderIds");
    orderIds = typeof idsField === "string" ? idsField.split(",").filter(Boolean) : [];
    const a = form.get("agentId");
    agentId = a ? String(a) : null;
    const rt = form.get("redirectTo");
    if (rt) redirectTo = String(rt);
  }

  if (orderIds.length === 0) {
    return NextResponse.json({ error: "Aucune commande" }, { status: 400 });
  }

  // Vérifier que l'agent existe (si fourni)
  if (agentId) {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || !["AGENT", "MANAGER"].includes(agent.role)) {
      return NextResponse.json({ error: "Agent invalide" }, { status: 400 });
    }
  }

  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: { assignedAgentId: agentId },
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, count: orderIds.length });
  }
  return NextResponse.redirect(new URL(redirectTo, req.url), 303);
}
