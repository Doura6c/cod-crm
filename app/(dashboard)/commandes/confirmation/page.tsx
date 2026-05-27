import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderActions } from "@/components/OrderActions";
import { OrderTable } from "@/components/OrderTable";
import { StatusTabs } from "@/components/StatusTabs";
import { TeamStatus } from "@/components/TeamStatus";
import Link from "next/link";
import { Bell, Phone, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; confirmed?: string }>;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isAgent = userRole === "AGENT";
  const params = await searchParams;
  const currentStatus = params.status ?? "NOUVEAU";
  const confirmedCode = params.confirmed ?? null;

  // Si l'utilisateur est un AGENT, on filtre par ses commandes affectées
  const agentFilter = isAgent && userId ? { assignedAgentId: userId } : {};

  // L'onglet "PDR" doit inclure les commandes PDR ET INJOIGNABLE
  const statusFilter = currentStatus === "PDR"
    ? { status: { in: ["PDR", "INJOIGNABLE"] } }
    : { status: currentStatus };

  // Reportés à rappeler AUJOURD'HUI
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [orders, nouveauCount, reporteCount, pdrCount, boutiques, cities, agents, reportedTotal, pdrTotal, rappelsAujourdHui] = await Promise.all([
    prisma.order.findMany({
      where: { ...statusFilter, ...agentFilter },
      include: {
        boutique: true,
        customer: true,
        city: true,
        items: { include: { product: true } },
        assignedAgent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.order.count({ where: { status: "NOUVEAU", ...agentFilter } }),
    prisma.order.count({ where: { status: "REPORTE", ...agentFilter } }),
    prisma.order.count({ where: { status: { in: ["PDR", "INJOIGNABLE"] }, ...agentFilter } }),
    prisma.boutique.findMany({ select: { id: true, name: true } }),
    prisma.city.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: "AGENT", active: true },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.order.count({ where: { status: "REPORTE", ...agentFilter } }),
    prisma.order.count({ where: { status: { in: ["PDR", "INJOIGNABLE"] }, ...agentFilter } }),
    // Rappels du jour : commandes REPORTÉES avec reportDate = aujourd'hui
    prisma.order.findMany({
      where: {
        status: "REPORTE",
        reportDate: { gte: todayStart, lte: todayEnd },
        ...agentFilter,
      },
      include: { customer: true, boutique: true, city: true },
      orderBy: { reportDate: "asc" },
    }),
  ]);

  // Statut "en ligne" basé sur une activité récente (commande traitée dans les 30 dernières minutes)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recentAgentIds = await prisma.callLog.findMany({
    where: { createdAt: { gte: thirtyMinAgo } },
    select: { agentId: true },
    distinct: ["agentId"],
  });
  const onlineSet = new Set(recentAgentIds.map((r) => r.agentId));

  const teamAgents = agents.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
    online: onlineSet.has(a.id),
  }));

  return (
    <div>
      <PageHeader
        title="Confirmation"
        badges={[
          { label: `${reportedTotal} REPORTÉ`, color: "bg-red-500 text-white" },
          { label: `${pdrTotal} PDR & INJOIGNABLE`, color: "bg-red-500 text-white" },
        ]}
        actions={
          (nouveauCount + reporteCount + pdrCount) > 0 ? (
            <Link
              href="/commandes/express"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition shadow-sm"
            >
              <Zap className="w-4 h-4" />
              Mode Express — {nouveauCount + reporteCount + pdrCount} à traiter
            </Link>
          ) : null
        }
      />
      <div className="p-4 lg:p-6">

        {/* ── Bannière succès confirmation ── */}
        {confirmedCode && (
          <div className="mb-5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-center gap-4">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="font-bold text-emerald-800 text-base">
                Commande <span className="font-mono">{confirmedCode}</span> confirmée avec succès !
              </div>
              <div className="text-sm text-emerald-700 mt-0.5">
                Le message a été envoyé au client. La commande est maintenant en attente d&apos;affectation livreur.
              </div>
            </div>
          </div>
        )}

        {/* ── Bannière rappels du jour ── */}
        {rappelsAujourdHui.length > 0 && (
          <div className="mb-5 bg-amber-50 border-2 border-amber-400 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-800 text-base">
                🔔 {rappelsAujourdHui.length} rappel{rappelsAujourdHui.length > 1 ? "s" : ""} à faire AUJOURD&apos;HUI
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {rappelsAujourdHui.map((o) => (
                <Link
                  key={o.id}
                  href={`/commandes/${o.id}`}
                  className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-2.5 hover:bg-amber-50 transition"
                >
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{o.customer.fullName}</span>
                    <span className="text-xs text-slate-500 ml-2">{o.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{o.boutique.name}</span>
                    <a
                      href={`tel:${o.customer.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 bg-sky-500 text-white text-xs px-2.5 py-1 rounded-lg hover:bg-sky-600"
                    >
                      <Phone className="w-3 h-3" /> {o.customer.phone}
                    </a>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <TeamStatus agents={teamAgents} />
        <OrderFilters
          boutiques={boutiques}
          cities={cities}
          agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))}
        />
        <OrderActions
          agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))}
          canAssign={!isAgent}
        />
        <StatusTabs
          tabs={[
            { key: "NOUVEAU", label: "Nouveau", count: nouveauCount, color: "bg-slate-700 text-white" },
            { key: "REPORTE", label: "Reporté", count: reporteCount, color: "bg-sky-500 text-white" },
            { key: "PDR", label: "PDR & Inj", count: pdrCount, color: "bg-amber-500 text-white" },
          ]}
        />
        <OrderTable orders={orders as any} />
      </div>
    </div>
  );
}
