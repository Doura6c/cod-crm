import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderTable } from "@/components/OrderTable";

export const dynamic = "force-dynamic";

export default async function AttentePage() {
  const [orders, boutiques, cities, agents] = await Promise.all([
    prisma.order.findMany({
      where: { status: "CONFIRME" },
      include: {
        boutique: true,
        customer: true,
        city: true,
        items: { include: { product: true } },
        assignedAgent: true,
      },
      orderBy: { validatedAt: "desc" },
      take: 50,
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
        title="En attente de validation livraison"
        badges={[{ label: `${orders.length} CONFIRMÉS`, color: "bg-emerald-500 text-white" }]}
      />
      <div className="p-6">
        <OrderFilters
          boutiques={boutiques}
          cities={cities}
          agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))}
        />
        <OrderTable orders={orders as any} />
      </div>
    </div>
  );
}
