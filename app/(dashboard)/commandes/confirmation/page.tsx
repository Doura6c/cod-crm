import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderActions } from "@/components/OrderActions";
import { OrderTable } from "@/components/OrderTable";
import { StatusTabs } from "@/components/StatusTabs";
import { TeamStatus } from "@/components/TeamStatus";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isAgent = userRole === "AGENT";
  const params = await searchParams;
  const currentStatus = params.status ?? "NOUVEAU";

  // Si l'utilisateur est un AGENT, on filtre par ses commandes affectées
  const agentFilter = isAgent && userId ? { assignedAgentId: userId } : {};

  const [orders, nouveauCount, reporteCount, pdrCount, boutiques, cities, agents, reportedTotal, pdrTotal] = await Promise.all([
    prisma.order.findMany({
      where: { status: currentStatus, ...agentFilter },
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
  ]);

  const teamAgents = agents.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
    online: Math.random() > 0.5,
  }));

  return (
    <div>
      <PageHeader
        title="Confirmation"
        badges={[
          { label: `${reportedTotal} REPORTÉ`, color: "bg-red-500 text-white" },
          { label: `${pdrTotal} PDR & INJOIGNABLE`, color: "bg-red-500 text-white" },
        ]}
      />
      <div className="p-6">
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
