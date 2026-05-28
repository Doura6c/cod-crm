import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderTable } from "@/components/OrderTable";

export const dynamic = "force-dynamic";

export default async function AttentePage({
  searchParams,
}: {
  searchParams: Promise<{ boutiqueId?: string; q?: string; agentId?: string; city?: string }>;
}) {
  const params = await searchParams;
  const boutiqueId = params.boutiqueId ?? "";
  const q = params.q ?? "";
  const agentId = params.agentId ?? "";

  const extraFilters: Record<string, unknown> = {};
  if (boutiqueId) extraFilters.boutiqueId = boutiqueId;
  if (agentId) extraFilters.assignedAgentId = agentId;
  if (q) {
    (extraFilters as any).OR = [
      { code: { contains: q } },
      { customer: { fullName: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  const [orders, boutiques, cities, agents] = await Promise.all([
    prisma.order.findMany({
      where: { status: "CONFIRME", ...extraFilters },
      include: {
        boutique: true,
        customer: true,
        city: true,
        items: { include: { product: true } },
        assignedAgent: true,
      },
      orderBy: { validatedAt: "desc" },
      take: 100,
    }),
    prisma.boutique.findMany({ select: { id: true, name: true } }),
    prisma.city.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: "AGENT", active: true },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  // Stats par boutique pour cette vue
  const statsByBoutique = orders.reduce<Record<string, { name: string; count: number; total: number }>>(
    (acc, o) => {
      const bid = o.boutiqueId;
      if (!acc[bid]) acc[bid] = { name: o.boutique.name, count: 0, total: 0 };
      acc[bid].count++;
      acc[bid].total += o.totalAmount;
      return acc;
    },
    {}
  );

  return (
    <div>
      <PageHeader
        title="En attente de livraison"
        badges={[
          { label: `${orders.length} CONFIRMÉS`, color: "bg-emerald-500 text-white" },
          ...(boutiqueId
            ? [{ label: `🏪 ${boutiques.find((b) => b.id === boutiqueId)?.name ?? "Boutique filtrée"}`, color: "bg-sky-600 text-white" }]
            : []),
        ]}
      />
      <div className="p-6 space-y-5">

        {/* Répartition par boutique (si plusieurs) */}
        {!boutiqueId && Object.keys(statsByBoutique).length > 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(statsByBoutique).map(([bid, stat]) => (
              <a
                key={bid}
                href={`/commandes/attente?boutiqueId=${bid}`}
                className="bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-3 flex items-start gap-2 cursor-pointer transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:bg-sky-500 group-hover:text-white transition">
                  {stat.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate">{stat.name}</div>
                  <div className="text-sm font-black text-emerald-600">{stat.count} cmd</div>
                </div>
              </a>
            ))}
          </div>
        )}

        <OrderFilters
          basePath="/commandes/attente"
          boutiques={boutiques}
          cities={cities}
          agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))}
          currentFilters={{ boutiqueId, q, agentId }}
        />
        <OrderTable orders={orders as any} />
      </div>
    </div>
  );
}
