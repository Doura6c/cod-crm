import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { getHmpCommission } from "@/lib/settings";
import { RapportShareButton } from "./RapportShareButton";
import {
  TrendingUp, Package, CheckCircle, Truck, RotateCcw,
  XCircle, Users, Star, Clock, BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Period = "today" | "week" | "month";

function getPeriodRange(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "Aujourd'hui" };
  }
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "7 derniers jours" };
  }
  // month
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: "Ce mois-ci" };
}

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const params = await searchParams;
  const period: Period = (params.period as Period) || "today";
  const { start, end, label } = getPeriodRange(period);

  const hmpCommission = await getHmpCommission();

  // ── Requêtes parallèles ────────────────────────────────────────────────
  const [
    ordersCreated,
    ordersConfirmed,
    ordersEnLivraison,
    ordersCancelled,
    ordersInjoignable,
    deliveriesLivrees,
    deliveriesRetournees,
    callLogsCount,
    agentStats,
    livreurStats,
    stockAlerts,
  ] = await Promise.all([
    // Commandes créées dans la période
    prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
    // Confirmées dans la période
    prisma.order.count({ where: { validatedAt: { gte: start, lte: end }, status: "CONFIRME" } }),
    // En livraison
    prisma.order.count({ where: { status: "EN_LIVRAISON" } }),
    // Annulées dans la période
    prisma.order.count({ where: { status: "ANNULE", updatedAt: { gte: start, lte: end } } }),
    // Injoignables actuels
    prisma.order.count({ where: { status: "INJOIGNABLE" } }),
    // Livrées dans la période
    prisma.delivery.findMany({
      where: { status: "LIVRE", deliveredAt: { gte: start, lte: end } },
      select: { amountCollected: true, order: { select: { totalAmount: true, deliveryFee: true } } },
    }),
    // Retournées dans la période
    prisma.delivery.count({ where: { status: "RETOURNE", updatedAt: { gte: start, lte: end } } }),
    // Appels passés dans la période
    prisma.callLog.count({ where: { createdAt: { gte: start, lte: end } } }),
    // Performance agents
    prisma.callLog.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    // Performance livreurs
    prisma.delivery.groupBy({
      by: ["livreurId"],
      where: { status: "LIVRE", deliveredAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { amountCollected: true },
    }),
    // Produits en stock critique
    prisma.product.count({ where: { active: true, stock: { lte: 5 } } }),
  ]);

  // CA calculé
  const caCollecte = deliveriesLivrees.reduce((s, d) => s + (d.amountCollected ?? 0), 0);
  const nbLivrees = deliveriesLivrees.length;
  const fraisHmpTotal = nbLivrees * hmpCommission;
  const netMarchand = caCollecte - fraisHmpTotal;

  // Taux
  const tauxConfirmation = ordersCreated > 0 ? Math.round((ordersConfirmed / ordersCreated) * 100) : 0;
  const tauxLivraison = (nbLivrees + deliveriesRetournees) > 0
    ? Math.round((nbLivrees / (nbLivrees + deliveriesRetournees)) * 100)
    : 0;

  // Agents enrichis
  const agentIds = agentStats.map((a) => a.agentId);
  const agents = agentIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, firstName: true, lastName: true },
  }) : [];

  const agentConfirmedMap: Record<string, number> = {};
  if (agentIds.length > 0) {
    const confirmedByAgent = await prisma.callLog.groupBy({
      by: ["agentId"],
      where: { outcome: "CONFIRMED", createdAt: { gte: start, lte: end } },
      _count: { id: true },
    });
    confirmedByAgent.forEach((r) => { agentConfirmedMap[r.agentId] = r._count.id; });
  }

  const agentRows = agentStats
    .map((a) => {
      const u = agents.find((x) => x.id === a.agentId);
      return {
        name: u ? `${u.firstName} ${u.lastName}` : "—",
        appels: a._count.id,
        confirmees: agentConfirmedMap[a.agentId] ?? 0,
      };
    })
    .sort((a, b) => b.confirmees - a.confirmees)
    .slice(0, 8);

  // Livreurs enrichis
  const livreurIds = livreurStats.map((l) => l.livreurId).filter(Boolean) as string[];
  const livreurs = livreurIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: livreurIds } },
    select: { id: true, firstName: true, lastName: true },
  }) : [];

  const livreurRows = livreurStats
    .map((l) => {
      const u = livreurs.find((x) => x.id === l.livreurId);
      return {
        name: u ? `${u.firstName} ${u.lastName}` : "—",
        livrees: l._count.id,
        ca: l._sum.amountCollected ?? 0,
      };
    })
    .sort((a, b) => b.livrees - a.livrees)
    .slice(0, 8);

  // Date formatée
  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Rapport de performance"
        badges={[{ label, color: "bg-sky-600 text-white" }]}
        actions={
          <RapportShareButton
            period={label}
            dateLabel={dateLabel}
            stats={{
              ordersCreated,
              ordersConfirmed,
              tauxConfirmation,
              nbLivrees,
              deliveriesRetournees,
              tauxLivraison,
              ordersCancelled,
              ordersInjoignable,
              ordersEnLivraison,
              caCollecte,
              netMarchand,
              callLogsCount,
              agentRows,
              livreurRows,
            }}
          />
        }
      />

      {/* Filtres période */}
      <div className="px-6 pt-4 flex gap-2">
        {(["today", "week", "month"] as Period[]).map((p) => (
          <a
            key={p}
            href={`/rapports?period=${p}`}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              period === p
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p === "today" ? "Aujourd'hui" : p === "week" ? "7 jours" : "Ce mois"}
          </a>
        ))}
      </div>

      <div className="p-6 space-y-6">

        {/* ── KPIs principaux ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Package className="w-5 h-5" />}
            label="Commandes reçues"
            value={ordersCreated}
            color="sky"
          />
          <KpiCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Confirmées"
            value={ordersConfirmed}
            sub={`${tauxConfirmation}% taux`}
            color="emerald"
          />
          <KpiCard
            icon={<Truck className="w-5 h-5" />}
            label="Livrées"
            value={nbLivrees}
            sub={`${tauxLivraison}% taux`}
            color="blue"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="CA collecté"
            value={formatGNF(caCollecte)}
            sub={`Net HMP : ${formatGNF(netMarchand)}`}
            color="amber"
            large
          />
        </div>

        {/* ── Ligne secondaire ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniStat icon="🚚" label="En livraison" value={ordersEnLivraison} color="text-sky-700" />
          <MiniStat icon="↩️" label="Retours" value={deliveriesRetournees} color="text-red-600" />
          <MiniStat icon="🚫" label="Annulées" value={ordersCancelled} color="text-slate-500" />
          <MiniStat icon="📵" label="Injoignables" value={ordersInjoignable} color="text-orange-600" />
          <MiniStat icon="📞" label="Appels passés" value={callLogsCount} color="text-purple-600" />
        </div>

        {/* ── Performances ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Agents */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              <h3 className="font-bold text-slate-800 text-sm uppercase">Performance Agents</h3>
            </div>
            {agentRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun appel sur cette période</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Agent</th>
                    <th className="px-4 py-2 text-right">Appels</th>
                    <th className="px-4 py-2 text-right">Confirmées</th>
                    <th className="px-4 py-2 text-right">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentRows.map((a, i) => {
                    const taux = a.appels > 0 ? Math.round((a.confirmees / a.appels) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {i === 0 && <span className="mr-1">🥇</span>}
                          {i === 1 && <span className="mr-1">🥈</span>}
                          {i === 2 && <span className="mr-1">🥉</span>}
                          {a.name}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{a.appels}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{a.confirmees}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            taux >= 70 ? "bg-emerald-100 text-emerald-700" :
                            taux >= 40 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {taux}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Livreurs */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-800 text-sm uppercase">Performance Livreurs</h3>
            </div>
            {livreurRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucune livraison sur cette période</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Livreur</th>
                    <th className="px-4 py-2 text-right">Livrées</th>
                    <th className="px-4 py-2 text-right">CA encaissé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {livreurRows.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {i === 0 && <span className="mr-1">🥇</span>}
                        {i === 1 && <span className="mr-1">🥈</span>}
                        {i === 2 && <span className="mr-1">🥉</span>}
                        {l.name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">{l.livrees}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatGNF(l.ca)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Alertes ───────────────────────────────────────────────────── */}
        {stockAlerts > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-bold text-orange-800">{stockAlerts} produit{stockAlerts > 1 ? "s" : ""} en stock critique (≤ 5 unités)</div>
              <a href="/produits" className="text-sm text-orange-600 hover:underline font-semibold">
                Voir les produits →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composants ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, large }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  large?: boolean;
}) {
  const colors: Record<string, string> = {
    sky: "from-sky-500 to-sky-600",
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} text-white rounded-2xl p-5 shadow-sm`}>
      <div className="opacity-80 mb-3">{icon}</div>
      <div className={`font-black ${large ? "text-lg leading-tight" : "text-3xl"}`}>{value}</div>
      <div className="text-xs opacity-80 mt-1">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniStat({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <div className={`text-xl font-black ${color}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
