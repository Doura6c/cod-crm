import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, statusBadge } from "@/lib/utils";
import {
  ShoppingBag, CheckCircle2, Truck, XCircle, TrendingUp,
  Users, Package, Phone, RotateCcw, Clock, Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

function periodStart(period: string): Date {
  const d = new Date();
  if (period === "week") { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (period === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  d.setHours(0, 0, 0, 0);
  return d;
}

function pct(num: number, den: number) {
  if (!den) return "—";
  return Math.round((num / den) * 100) + "%";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  if (userRole === "AGENT") redirect("/commandes/confirmation");
  if (userRole === "LIVREUR") redirect("/livraisons");

  const { period = "today" } = await searchParams;
  const since = periodStart(period);

  const [
    totalOrders,
    confirmedOrders,
    enLivraisonOrders,
    livreedOrders,
    retourneOrders,
    annuleOrders,
    revenueAgg,
    pendingNew,
    recentOrders,
    topProducts,
    activeBoutiques,
    activeAgents,
    agentPerf,
    livreurPerf,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "CONFIRME", updatedAt: { gte: since } } }),
    prisma.order.count({ where: { status: "EN_LIVRAISON", updatedAt: { gte: since } } }),
    prisma.order.count({ where: { status: "LIVRE", updatedAt: { gte: since } } }),
    prisma.order.count({ where: { status: "RETOURNE", updatedAt: { gte: since } } }),
    prisma.order.count({ where: { status: "ANNULE", updatedAt: { gte: since } } }),
    prisma.delivery.aggregate({
      where: { status: "LIVRE", deliveredAt: { gte: since } },
      _sum: { amountCollected: true },
    }),
    prisma.order.count({ where: { status: "NOUVEAU" } }),
    prisma.order.findMany({
      include: { boutique: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: since } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.boutique.count({ where: { active: true } }),
    prisma.user.count({ where: { active: true, role: { in: ["AGENT", "MANAGER"] } } }),
    // Perf agents : nombre de confirmations
    prisma.callLog.groupBy({
      by: ["agentId"],
      where: { outcome: "CONFIRMED", createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    // Perf livreurs : livré vs retourné
    prisma.delivery.groupBy({
      by: ["livreurId"],
      where: { status: { in: ["LIVRE", "RETOURNE"] }, updatedAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  // Enrichir agents
  const agentIds = agentPerf.map((a) => a.agentId).filter(Boolean) as string[];
  const agentUsers = agentIds.length
    ? await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];

  // Enrichir livreurs
  const livreurIds = [...new Set(livreurPerf.map((l) => l.livreurId).filter(Boolean))] as string[];
  const livreurUsers = livreurIds.length
    ? await prisma.user.findMany({ where: { id: { in: livreurIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];

  // Livreur détail LIVRE vs RETOURNE
  const livreurDeliveries = livreurIds.length
    ? await prisma.delivery.findMany({
        where: { livreurId: { in: livreurIds }, status: { in: ["LIVRE", "RETOURNE"] }, updatedAt: { gte: since } },
        select: { livreurId: true, status: true, amountCollected: true },
      })
    : [];

  // Top products data
  const topProductIds = topProducts.map((p) => p.productId);
  const topProductsData = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } } })
    : [];

  const ca = revenueAgg._sum.amountCollected ?? 0;
  const confirmRate = pct(confirmedOrders + enLivraisonOrders + livreedOrders + retourneOrders, totalOrders);
  const livraisonRate = pct(livreedOrders, livreedOrders + retourneOrders);

  const PERIODS = [
    { key: "today", label: "Aujourd'hui" },
    { key: "week", label: "7 jours" },
    { key: "month", label: "Ce mois" },
  ];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        badges={[{ label: `${pendingNew} à traiter`, color: "bg-red-500 text-white" }]}
      />
      <div className="p-6 space-y-6">

        {/* Sélecteur période */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/?period=${p.key}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                period === p.key
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-xl p-5 shadow-md">
            <ShoppingBag className="w-7 h-7 opacity-80 mb-2" />
            <div className="text-3xl font-black">{totalOrders}</div>
            <div className="text-sm opacity-90 mt-1">Commandes reçues</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-md">
            <CheckCircle2 className="w-7 h-7 opacity-80 mb-2" />
            <div className="text-3xl font-black">{confirmedOrders}</div>
            <div className="text-sm opacity-90 mt-1">Confirmées</div>
            <div className="text-xs opacity-75 mt-0.5">Taux confirmation : {confirmRate}</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl p-5 shadow-md">
            <Truck className="w-7 h-7 opacity-80 mb-2" />
            <div className="text-3xl font-black">{livreedOrders}</div>
            <div className="text-sm opacity-90 mt-1">Livrées</div>
            <div className="text-xs opacity-75 mt-0.5">Taux livraison : {livraisonRate}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-5 shadow-md">
            <TrendingUp className="w-7 h-7 opacity-80 mb-2" />
            <div className="text-2xl font-black">{formatGNF(ca)}</div>
            <div className="text-sm opacity-90 mt-1">CA encaissé</div>
          </div>
        </div>

        {/* Stats secondaires */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-sky-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">En livraison</div>
              <div className="text-2xl font-bold text-slate-800">{enLivraisonOrders}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Retournées</div>
              <div className="text-2xl font-bold text-slate-800">{retourneOrders}</div>
              <div className="text-xs text-slate-400">{pct(retourneOrders, livreedOrders + retourneOrders)} retour</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-slate-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Annulées</div>
              <div className="text-2xl font-bold text-slate-800">{annuleOrders}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <Phone className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">En attente appel</div>
              <div className="text-2xl font-bold text-slate-800">{pendingNew}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Commandes récentes */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Commandes récentes</h2>
              <Link href="/commandes/liste" className="text-sm text-sky-600 hover:underline">Voir tout</Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Code</th>
                  <th className="px-4 py-2 text-left font-semibold">Client</th>
                  <th className="px-4 py-2 text-right font-semibold">Montant</th>
                  <th className="px-4 py-2 text-left font-semibold">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((o) => {
                  const b = statusBadge(o.status);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/commandes/${o.id}`} className="font-mono text-xs text-sky-700 hover:underline">{o.code}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{o.customer.fullName}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatGNF(o.totalAmount)}</td>
                      <td className="px-4 py-2.5"><span className={`badge ${b.color}`}>{b.label}</span></td>
                    </tr>
                  );
                })}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Aucune commande</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Top produits */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Top produits</h2>
            </div>
            <div className="p-4 space-y-3">
              {topProducts.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-4">Aucune donnée</div>
              ) : (
                topProducts.map((tp) => {
                  const prod = topProductsData.find((p) => p.id === tp.productId);
                  if (!prod) return null;
                  return (
                    <div key={tp.productId} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{prod.name}</div>
                        <div className="text-xs text-slate-400">Stock restant : {prod.stock}</div>
                      </div>
                      <div className="text-sm font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">×{tp._sum.quantity}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Performance équipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Performance agents */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              <h2 className="font-semibold text-slate-800">Performance agents</h2>
            </div>
            {agentPerf.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Aucune confirmation sur la période</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Agent</th>
                    <th className="px-4 py-2 text-right font-semibold">Confirmations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentPerf.map((a) => {
                    const user = agentUsers.find((u) => u.id === a.agentId);
                    return (
                      <tr key={a.agentId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {user ? `${user.firstName} ${user.lastName}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="inline-block bg-emerald-100 text-emerald-700 font-bold text-xs px-2 py-0.5 rounded-full">
                            {a._count.id} ✓
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Performance livreurs */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-500" />
              <h2 className="font-semibold text-slate-800">Performance livreurs</h2>
            </div>
            {livreurIds.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Aucune livraison terminée sur la période</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Livreur</th>
                    <th className="px-4 py-2 text-center font-semibold">Livrées</th>
                    <th className="px-4 py-2 text-center font-semibold">Retours</th>
                    <th className="px-4 py-2 text-right font-semibold">CA collecté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {livreurIds.map((lid) => {
                    const user = livreurUsers.find((u) => u.id === lid);
                    const rows = livreurDeliveries.filter((d) => d.livreurId === lid);
                    const livre = rows.filter((d) => d.status === "LIVRE").length;
                    const retour = rows.filter((d) => d.status === "RETOURNE").length;
                    const ca = rows.filter((d) => d.status === "LIVRE").reduce((s, d) => s + (d.amountCollected ?? 0), 0);
                    return (
                      <tr key={lid} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {user ? `${user.firstName} ${user.lastName}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block bg-emerald-100 text-emerald-700 font-bold text-xs px-2 py-0.5 rounded-full">{livre}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block bg-red-100 text-red-600 font-bold text-xs px-2 py-0.5 rounded-full">{retour}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{formatGNF(ca)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Infos globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <Zap className="w-7 h-7 text-violet-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Agents actifs</div>
              <div className="text-xl font-bold">{activeAgents}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <Package className="w-7 h-7 text-indigo-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Boutiques actives</div>
              <div className="text-xl font-bold">{activeBoutiques}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
