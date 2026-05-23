import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OrderTable } from "@/components/OrderTable";

export const dynamic = "force-dynamic";

export default async function AnnulePage() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["ANNULE", "LIVRE", "RETOURNE"] } },
    include: {
      boutique: true,
      customer: true,
      city: true,
      items: { include: { product: true } },
      assignedAgent: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Annulé / Terminé"
        badges={[{ label: `${orders.length}`, color: "bg-slate-700 text-white" }]}
      />
      <div className="p-6">
        <OrderTable orders={orders as any} />
      </div>
    </div>
  );
}
