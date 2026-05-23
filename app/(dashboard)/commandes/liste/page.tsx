import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderActions } from "@/components/OrderActions";
import { OrderTable } from "@/components/OrderTable";

export const dynamic = "force-dynamic";

export default async function ListePage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isAgent = role === "AGENT";
  const agentFilter = isAgent && userId ? { assignedAgentId: userId } : {};
  const [orders, boutiques, cities, agents] = await Promise.all([
    prisma.order.findMany({
      where: agentFilter,
      include: {
        boutique: true,
        customer: true,
        city: true,
        items: { include: { product: true } },
        assignedAgent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.boutique.findMany({ select: { id: true, name: true } }),
    prisma.city.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER"] }, active: true },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Toutes les commandes"
        badges={[{ label: `${orders.length} commandes`, color: "bg-slate-700 text-white" }]}
      />
      <div className="p-6">
        <OrderFilters
          boutiques={boutiques}
          cities={cities}
          agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))}
        />
        <OrderActions
          agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))}
          canAssign={!isAgent}
        />
        <OrderTable orders={orders as any} />
      </div>
    </div>
  );
}
