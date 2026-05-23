import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatGNF } from "@/lib/utils";

export const dynamic = "force-dynamic";

function pct(num: number, den: number) {
  if (!den) return "0%";
  return Math.round((num / den) * 100) + "%";
}

function periodStart(period: string): Date {
  const d = new Date();
  if (period === "week") { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (period === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  d.setHours(0, 0, 0, 0);
  return d;
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

  const { period = "month" } = await searchParams;
  const since = periodStart(period);

  const [
    totalOrders,
    nouveauCount,
    confirmeCount,
    reporteCount,
    pdrCount,
    injoignableCount,
    annuleCount,
    enLivraisonCount,
    livreCount,
    retourneCount,
    caTotal,
    caLivre,
    callLogs,
    recentOrders,
    agents,
    livreurs,
    livreurDeliveries,
    agentCallStats,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "NOUVEAU", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "CONFIRME", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "REPORTE", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "PDR", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "INJOIGNABLE", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "ANNULE", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "EN_LIVRAISON", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "LIVRE", createdAt: { gte: since } } }),
    prisma.order.count({ where: { status: "RETOURNE", createdAt: { gte: since } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: since } }, _sum: { totalAmount: true } }),
    prisma.delivery.aggregate({ where: { status: "LIVRE", deliveredAt: { gte: since } }, _sum: { amountCollected: true } }),
    prisma.callLog.findMany({
      where: { createdAt: { gte: since } },
      include: { agent: { select: { firstName: true, lastName: true, id: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      include: { customer: true, boutique: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.user.findMany({ where: { role: { in: ["AGENT", "MANAGER"] }, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.user.findMany({ where: { role: "LIVREUR", active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.delivery.findMany({
      where: { updatedAt: { gte: since } },
      select: { livreurId: true, status: true, amountCollected: true },
    }),
    prisma.callLog.groupBy({
      by: ["agentId", "outcome"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  const fraisHMP = livreCount * 70000;
  const caTotalVal = caTotal._sum.totalAmount ?? 0;
  const caLivreVal = caLivre._sum.amountCollected ?? 0;
  const caVerse = caLivreVal;
  const caNonVerse = caTotalVal - caLivreVal;
  const profitNet = fraisHMP;

  const confirmedTotal = confirmeCount + enLivraisonCount + livreCount + retourneCount;
  const pdrInj = pdrCount + injoignableCount;
  const livraisonTotal = livreCount + retourneCount + enLivraisonCount;

  const PERIODS = [
    { key: "today", label: "Aujourd'hui" },
    { key: "week", label: "7 jours" },
    { key: "month", label: "Ce mois" },
  ];

  const COLORS = ["#3b82f6","#ef4444","#f59e0b","#10b981","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16","#6366f1","#14b8a6"];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header agents */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
        {agents.map((a, i) => (
          <div key={a.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-slate-600 font-medium">{a.firstName} {a.lastName}</span>
          </div>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {/* Filtres période */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold uppercase">Période</span>
          {PERIODS.map((p) => (
            <Link key={p.key} href={`/?period=${p.key}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${period === p.key ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {p.label}
            </Link>
          ))}
          <span className="text-xs text-slate-400 ml-auto">
            {since.toLocaleDateString("fr-FR")} — {new Date().toLocaleDateString("fr-FR")}
          </span>
        </div>

        {/* TAUX DE CONFIRMATION */}
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Taux de confirmation</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Tous", count: totalOrders, pct: "100%", color: "border-slate-800", bar: "bg-slate-800" },
              { label: "Nouveau", count: nouveauCount, pct: pct(nouveauCount, totalOrders), color: "border-slate-400", bar: "bg-slate-400" },
              { label: "Confirmé", count: confirmedTotal, pct: pct(confirmedTotal, totalOrders), color: "border-emerald-500", bar: "bg-emerald-500" },
              { label: "Reporté", count: reporteCount, pct: pct(reporteCount, totalOrders), color: "border-sky-500", bar: "bg-sky-500" },
              { label: "PDR & Injoignable", count: pdrInj, pct: pct(pdrInj, totalOrders), color: "border-amber-500", bar: "bg-amber-500" },
              { label: "Annulé", count: annuleCount, pct: pct(annuleCount, totalOrders), color: "border-red-500", bar: "bg-red-500" },
            ].map((stat) => (
              <div key={stat.label} className={`bg-white border-t-4 ${stat.color} rounded-lg p-4 text-center shadow-sm`}>
                <div className="text-2xl font-black text-slate-800">{stat.pct}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{stat.count} commandes</div>
                <div className={`h-1 rounded-full mt-2 ${stat.bar}`} style={{ width: "100%" }} />
              </div>
            ))}
          </div>
        </div>

        {/* TAUX DE LIVRAISON */}
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Taux de livraison</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Tous", count: confirmedTotal, pct: "100%", color: "border-slate-800", bar: "bg-slate-800" },
              { label: "Livré", count: livreCount, pct: pct(livreCount, confirmedTotal), color: "border-emerald-500", bar: "bg-emerald-500" },
              { label: "En livraison", count: enLivraisonCount, pct: pct(enLivraisonCount, confirmedTotal), color: "border-sky-400", bar: "bg-sky-400" },
              { label: "PDR & Injoignable", count: pdrInj, pct: pct(pdrInj, confirmedTotal), color: "border-amber-500", bar: "bg-amber-500" },
              { label: "Retourné", count: retourneCount, pct: pct(retourneCount, confirmedTotal), color: "border-red-400", bar: "bg-red-400" },
              { label: "Annulé", count: annuleCount, pct: pct(annuleCount, confirmedTotal), color: "border-red-600", bar: "bg-red-600" },
            ].map((stat) => (
              <div key={stat.label} className={`bg-white border-t-4 ${stat.color} rounded-lg p-4 text-center shadow-sm`}>
                <div className="text-2xl font-black text-slate-800">{stat.pct}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{stat.count} commandes</div>
                <div className={`h-1 rounded-full mt-2 ${stat.bar}`} />
              </div>
            ))}
          </div>
        </div>

        {/* MÉTRIQUES FINANCIÈRES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Chiffre d'affaire", value: formatGNF(caTotalVal), sub: `${totalOrders} commandes (100%)`, color: "border-sky-500" },
            { label: "Total CA versé", value: formatGNF(caVerse), sub: `${livreCount} commandes livrées`, color: "border-emerald-500" },
            { label: "Total CA non versé", value: formatGNF(caNonVerse), sub: `${totalOrders - livreCount} commandes`, color: "border-amber-500" },
            { label: "Frais de livraison (HMP)", value: formatGNF(fraisHMP), sub: `70 000 × ${livreCount} livrées`, color: "border-violet-500" },
          ].map((m) => (
            <div key={m.label} className={`bg-white border-t-4 ${m.color} rounded-lg p-4 shadow-sm`}>
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-lg font-black text-slate-800">{m.value}</div>
              <div className="text-xs text-slate-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Bénéfices livraison", value: formatGNF(fraisHMP), sub: `${livreCount} commandes`, color: "border-emerald-400" },
            { label: "Dépenses et charges", value: "0 GNF", sub: "Charges", color: "border-slate-300" },
            { label: "Profit net", value: formatGNF(profitNet), sub: "Gains", color: "border-emerald-600" },
          ].map((m) => (
            <div key={m.label} className={`bg-white border-t-4 ${m.color} rounded-lg p-4 shadow-sm`}>
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-lg font-black text-slate-800">{m.value}</div>
              <div className="text-xs text-slate-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* PERFORMANCE AGENTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Performance agents</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Agent</th>
                  <th className="px-4 py-2 text-center">Appels</th>
                  <th className="px-4 py-2 text-center">Confirmés</th>
                  <th className="px-4 py-2 text-center">Annulés</th>
                  <th className="px-4 py-2 text-center">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((a, i) => {
                  const agentStats = agentCallStats.filter((s) => s.agentId === a.id);
                  const total = agentStats.reduce((s, x) => s + x._count.id, 0);
                  const confirmed = agentStats.find((s) => s.outcome === "CONFIRMED")?._count.id ?? 0;
                  const cancelled = agentStats.find((s) => s.outcome === "CANCELLED")?._count.id ?? 0;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-slate-700">{a.firstName} {a.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{total}</td>
                      <td className="px-4 py-2.5 text-center"><span className="bg-emerald-100 text-emerald-700 font-bold text-xs px-2 py-0.5 rounded-full">{confirmed}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="bg-red-100 text-red-600 font-bold text-xs px-2 py-0.5 rounded-full">{cancelled}</span></td>
                      <td className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">{pct(confirmed, total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PERFORMANCE LIVREURS */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Performance livreurs</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Livreur</th>
                  <th className="px-4 py-2 text-center">Livrées</th>
                  <th className="px-4 py-2 text-center">Retours</th>
                  <th className="px-4 py-2 text-right">CA collecté</th>
                  <th className="px-4 py-2 text-center">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {livreurs.map((l) => {
                  const rows = livreurDeliveries.filter((d) => d.livreurId === l.id);
                  const livre = rows.filter((d) => d.status === "LIVRE").length;
                  const retour = rows.filter((d) => d.status === "RETOURNE").length;
                  const ca = rows.filter((d) => d.status === "LIVRE").reduce((s, d) => s + (d.amountCollected ?? 0), 0);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{l.firstName} {l.lastName}</td>
                      <td className="px-4 py-2.5 text-center"><span className="bg-emerald-100 text-emerald-700 font-bold text-xs px-2 py-0.5 rounded-full">{livre}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="bg-red-100 text-red-600 font-bold text-xs px-2 py-0.5 rounded-full">{retour}</span></td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold">{formatGNF(ca)}</td>
                      <td className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">{pct(livre, livre + retour)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* HISTORIQUE D'ACTIVITÉS */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Historique d&apos;activités des agents</h2>
            <span className="text-xs text-slate-400">{callLogs.length} activités</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Agent</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {callLogs.map((log) => {
                  const outcomeStyles: Record<string, string> = {
                    CONFIRMED: "bg-emerald-100 text-emerald-700",
                    CANCELLED: "bg-red-100 text-red-700",
                    REPORTED: "bg-sky-100 text-sky-700",
                    NO_ANSWER: "bg-amber-100 text-amber-700",
                    BUSY: "bg-orange-100 text-orange-700",
                    INJOIGNABLE: "bg-slate-200 text-slate-700",
                    ANSWERED: "bg-blue-100 text-blue-700",
                  };
                  const outcomeLabels: Record<string, string> = {
                    CONFIRMED: "✓ Confirmé",
                    CANCELLED: "✗ Annulé",
                    REPORTED: "↩ Reporté",
                    NO_ANSWER: "Pas de réponse",
                    BUSY: "Occupé",
                    INJOIGNABLE: "Injoignable",
                    ANSWERED: "Répondu",
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-700">{log.agent.firstName} {log.agent.lastName}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${outcomeStyles[log.outcome] ?? "bg-slate-100 text-slate-600"}`}>
                          {outcomeLabels[log.outcome] ?? log.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">{log.note ?? "—"}</td>
                    </tr>
                  );
                })}
                {callLogs.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Aucune activité enregistrée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
