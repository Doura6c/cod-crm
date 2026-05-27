import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExpressMode } from "@/components/ExpressMode";

export const dynamic = "force-dynamic";

export default async function ExpressPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = (session.user as any).role;
  const userId   = (session.user as any).id;

  // Livreurs et ADMIN sans tâches d'appel ne peuvent pas accéder à ce mode
  if (userRole === "LIVREUR") redirect("/livraisons");

  // Filtre agent : ne voir que ses propres commandes
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
      // Priorité : NOUVEAU en premier, puis reportés
      { status: "asc" },
      { callCount: "asc" },     // commandes jamais appelées en tête
      { createdAt: "asc" },     // plus anciennes en premier
    ],
    take: 100,
  });

  // Sérialisation : convertir les Date en string pour le client
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
