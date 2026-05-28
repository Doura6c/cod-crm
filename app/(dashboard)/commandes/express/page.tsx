import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExpressMode } from "@/components/ExpressMode";
import { SupervisorExpressView } from "@/components/SupervisorExpressView";

export const dynamic = "force-dynamic";

export default async function ExpressPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = (session.user as any).role;
  const userId   = (session.user as any).id;

  if (userRole === "LIVREUR") redirect("/livraisons");

  // ═══════════════════════════════════════════════════
  // VUE SUPERVISEUR (ADMIN / MANAGER)
  // ═══════════════════════════════════════════════════
  if (userRole === "ADMIN" || userRole === "MANAGER") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const [
      queueCounts,
      agents,
      todayCallLogs,
      confirmedToday,
      deliveredToday,
      recentCallLogs,
    ] = await Promise.all([
      // File d'attente
      prisma.order.groupBy({
        by: ["status"],
        where: { status: { in: ["NOUVEAU", "REPORTE", "PDR", "INJOIGNABLE"] } },
        _count: { _all: true },
      }),
      // Agents actifs
      prisma.user.findMany({
        where: { role: "AGENT", active: true },
        select: { id: true, firstName: true, lastName: true },
      }),
      // CallLogs du jour
      prisma.callLog.findMany({
        where: { createdAt: { gte: todayStart } },
        select: {
          agentId: true, outcome: true, createdAt: true,
          order: { select: { code: true, customer: { select: { fullName: true } }, boutique: { select: { name: true } } } },
          agent: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      // Commandes confirmées aujourd'hui
      prisma.order.count({ where: { status: { in: ["CONFIRME","EN_LIVRAISON","LIVRE"] }, updatedAt: { gte: todayStart } } }),
      // En attente de livraison
      prisma.order.count({ where: { status: "CONFIRME" } }),
      // Appels récents (flux)
      prisma.callLog.findMany({
        where: { createdAt: { gte: todayStart } },
        select: {
          outcome: true, createdAt: true,
          order: { select: { id: true, code: true, customer: { select: { fullName: true } }, boutique: { select: { name: true } } } },
          agent: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

    // Agents récemment actifs (30 dernières minutes)
    const recentAgentIds = new Set(
      todayCallLogs
        .filter((l) => l.createdAt >= thirtyMinAgo)
        .map((l) => l.agentId)
    );

    // Calcul performance par agent
    const agentPerf = agents.map((a) => {
      const myLogs = todayCallLogs.filter((l) => l.agentId === a.id);
      const lastLog = myLogs[0]; // trié par desc
      return {
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        online: recentAgentIds.has(a.id),
        lastAction: lastLog?.outcome ?? undefined,
        lastActionAt: lastLog?.createdAt?.toISOString() ?? undefined,
        todayTotal:     myLogs.length,
        todayConfirmed: myLogs.filter((l) => l.outcome === "CONFIRMED").length,
        todayNoAnswer:  myLogs.filter((l) => l.outcome === "NO_ANSWER" || l.outcome === "BUSY").length,
        todayReported:  myLogs.filter((l) => l.outcome === "REPORTED").length,
        todayCancelled: myLogs.filter((l) => l.outcome === "CANCELLED" || l.outcome === "INJOIGNABLE").length,
      };
    });

    // Résumé file d'attente
    const queueMap = Object.fromEntries(queueCounts.map((q) => [q.status, q._count._all]));
    const queue = {
      NOUVEAU:     queueMap["NOUVEAU"]    ?? 0,
      REPORTE:     queueMap["REPORTE"]    ?? 0,
      PDR:         (queueMap["PDR"] ?? 0) + (queueMap["INJOIGNABLE"] ?? 0),
      INJOIGNABLE: queueMap["INJOIGNABLE"] ?? 0,
      totalPending: (queueMap["NOUVEAU"] ?? 0) + (queueMap["REPORTE"] ?? 0) +
                    (queueMap["PDR"] ?? 0)     + (queueMap["INJOIGNABLE"] ?? 0),
    };

    // Flux appels récents
    const recentCalls = recentCallLogs.map((l) => ({
      orderId:      l.order.id,
      orderCode:    l.order.code,
      agentName:    `${l.agent.firstName} ${l.agent.lastName}`,
      outcome:      l.outcome,
      customerName: l.order.customer.fullName,
      boutiqueName: l.order.boutique.name,
      at:           l.createdAt.toISOString(),
    }));

    return (
      <SupervisorExpressView
        agents={agentPerf}
        queue={queue}
        recentCalls={recentCalls}
        totalToday={todayCallLogs.length}
        confirmedToday={confirmedToday}
        deliveredToday={deliveredToday}
      />
    );
  }

  // ═══════════════════════════════════════════════════
  // VUE AGENT — mode appel classique
  // ═══════════════════════════════════════════════════
  const agentFilter = userRole === "AGENT" ? { assignedAgentId: userId } : {};

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["NOUVEAU", "REPORTE", "PDR", "INJOIGNABLE"] },
      ...agentFilter,
    },
    include: {
      boutique: { select: { name: true } },
      customer: { select: { fullName: true, phone: true, address: true } },
      city:     { select: { name: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: [
      { status: "asc" },
      { callCount: "asc" },
      { createdAt: "asc" },
    ],
    take: 100,
  });

  const serialized = orders.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    totalAmount: o.totalAmount,
    callCount: o.callCount,
    customer: {
      fullName: o.customer.fullName,
      phone: o.customer.phone,
      address: o.customer.address,
    },
    city: o.city ? { name: o.city.name } : null,
    boutique: { name: o.boutique.name },
    items: o.items.map((it) => ({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      product: { name: it.product.name },
    })),
    reportDate: o.reportDate?.toISOString() ?? null,
  }));

  return <ExpressMode orders={serialized as any} />;
}
