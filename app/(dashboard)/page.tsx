import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatGNF } from "@/lib/utils";
import { getHmpCommission } from "@/lib/settings";
import {
  TrendingUp, Users, Truck, BarChart2,
  Phone, MapPin, Package, Trophy, Star
} from "lucide-react";

export const dynamic = "force-dynamic";

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function periodStart(period: string): Date {
  const d = new Date();
  if (period === "week") { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (period === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  d.setHours(0, 0, 0, 0);
  return d;
}

const AGENT_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

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
    agents,
    livreurs,
    livreurDeliveries,
    agentCallStats,
    topCities,
    topProducts,
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
      take: 40,
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
    // Top villes : nombre de livraisons LIVRE par ville
    prisma.order.groupBy({
      by: ["cityId"],
      where: { status: "LIVRE", createdAt: { gte: since }, cityId: { not: null } },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // Top produits : somme des quantités vendées (commandes LIVRE)
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "LIVRE", createdAt: { gte: since } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
  ]);

  // Résoudre les noms de villes et produits
  const cityIds = topCities.map((c) => c.cityId).filter(Boolean) as string[];
  const productIds = topProducts.map((p) => p.productId);

  const [cityNames, productNames] = await Promise.all([
    prisma.city.findMany({ where: { id: { in: cityIds } }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true, imageUrl: true } }),
  ]);

  const cityMap = Object.fromEntries(cityNames.map((c) => [c.id, c.name]));
  const productMap = Object.fromEntries(productNames.map((p) => [p.id, p]));

  // Totaux pour les barres de progression des tops
  const maxCityCount = topCities[0]?._count.id ?? 1;
  const maxProductQty = topProducts[0]?._sum.quantity ?? 1;

  const hmpCommission = await getHmpCommission();
  const fraisHMP = livreCount * hmpCommission;
  const caTotalVal = caTotal._sum.totalAmount ?? 0;
  const caLivreVal = caLivre._sum.amountCollected ?? 0;
  const confirmedTotal = confirmeCount + enLivraisonCount + livreCount + retourneCount;
  const pdrInj = pdrCount + injoignableCount;

  const PERIODS = [
    { key: "today", label: "Aujourd'hui" },
    { key: "week", label: "7 jours" },
    { key: "month", label: "Ce mois" },
  ];

  // Données pour les barres de progression
  const confStats = [
    { label: "Confirmés",         count: confirmedTotal, total: totalOrders, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Nouveau",           count: nouveauCount,   total: totalOrders, color: "bg-slate-400",   text: "text-slate-600" },
    { label: "Reporté",           count: reporteCount,   total: totalOrders, color: "bg-sky-500",     text: "text-sky-700" },
    { label: "PDR/Injoignable",   count: pdrInj,         total: totalOrders, color: "bg-amber-500",   text: "text-amber-700" },
    { label: "Annulé",            count: annuleCount,    total: totalOrders, color: "bg-red-500",     text: "text-red-700" },
  ];

  const livStats = [
    { label: "Livré",             count: livreCount,      total: confirmedTotal, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "En livraison",      count: enLivraisonCount,total: confirmedTotal, color: "bg-sky-500",     text: "text-sky-700" },
    { label: "Retourné",          count: retourneCount,   total: confirmedTotal, color: "bg-red-400",     text: "text-red-600" },
    { label: "PDR/Injoignable",   count: pdrInj,          total: confirmedTotal, color: "bg-amber-500",   text: "text-amber-700" },
  ];

  const outcomeLabel: Record<string, string> = {
    CONFIRMED: "Confirmé", CANCELLED: "Annulé", REPORTED: "Reporté",
    NO_ANSWER: "Pas de réponse", BUSY: "Occupé", INJOIGNABLE: "Injoignable", ANSWERED: "Répondu",
  };
  const outcomeColor: Record<string, string> = {
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
    REPORTED: "bg-sky-100 text-sky-700",
    NO_ANSWER: "bg-amber-100 text-amber-700",
    BUSY: "bg-orange-100 text-orange-700",
    INJOIGNABLE: "bg-slate-200 text-slate-600",
    ANSWERED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar : agents connectés */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Équipe</span>
        {agents.map((a, i) => (
          <div key={a.id} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm"
              style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }}
            />
            <span className="text-xs text-slate-600 font-medium">{a.firstName} {a.lastName}</span>
          </div>
        ))}
        {livreurs.length > 0 && (
          <>
            <span className="text-slate-200">|</span>
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            {livreurs.map((l) => (
              <span key={l.id} className="text-xs text-slate-500">{l.firstName} {l.lastName}</span>
            ))}
          </>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Période + résumé rapide */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={`/?period=${p.key}`}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
                  period === p.key
                    ? "bg-slate-900 text-white shadow"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {since.toLocaleDateString("fr-FR")} → {new Date().toLocaleDateString("fr-FR")}
          </div>
        </div>

        {/* ────── TAUX DE CONFIRMATION ────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="font-bold text-slate-800">Taux de confirmation</div>
                <div className="text-xs text-slate-400">{totalOrders} commandes reçues</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-600">{pct(confirmedTotal, totalOrders)}%</div>
              <div className="text-xs text-slate-400">{confirmedTotal} confirmées</div>
            </div>
          </div>

          {/* Barre globale */}
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${pct(confirmedTotal, totalOrders)}%` }}
            />
          </div>

          {/* Stats par statut */}
          <div className="space-y-3">
            {confStats.map((s) => {
              const p = pct(s.count, s.total);
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-500 font-medium text-right">{s.label}</div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <div className={`w-10 text-right text-xs font-bold ${s.text}`}>{p}%</div>
                  <div className="w-8 text-right text-xs text-slate-400">{s.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ────── TAUX DE LIVRAISON ────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <div className="font-bold text-slate-800">Taux de livraison</div>
                <div className="text-xs text-slate-400">{confirmedTotal} commandes confirmées</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-sky-600">{pct(livreCount, confirmedTotal)}%</div>
              <div className="text-xs text-slate-400">{livreCount} livrées</div>
            </div>
          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-sky-500 rounded-full"
              style={{ width: `${pct(livreCount, confirmedTotal)}%` }}
            />
          </div>

          <div className="space-y-3">
            {livStats.map((s) => {
              const p = pct(s.count, s.total);
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-500 font-medium text-right">{s.label}</div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${p}%` }} />
                  </div>
                  <div className={`w-10 text-right text-xs font-bold ${s.text}`}>{p}%</div>
                  <div className="w-8 text-right text-xs text-slate-400">{s.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ────── MÉTRIQUES FINANCIÈRES ────── */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Finances
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Chiffre d'affaires",   value: formatGNF(caTotalVal),     sub: `${totalOrders} commandes`, color: "border-sky-400",    bg: "" },
              { label: "CA encaissé (livré)",   value: formatGNF(caLivreVal),     sub: `${livreCount} livrées`,   color: "border-emerald-500", bg: "bg-emerald-50" },
              { label: "CA non versé",          value: formatGNF(Math.max(0, caTotalVal - caLivreVal)), sub: "En attente", color: "border-amber-400", bg: "bg-amber-50" },
              { label: "Revenus HMP",           value: formatGNF(fraisHMP),       sub: `70k × ${livreCount}`, color: "border-violet-500", bg: "bg-violet-50" },
            ].map((m) => (
              <div key={m.label} className={`${m.bg || "bg-white"} border border-slate-200 border-t-4 ${m.color} rounded-xl p-4 shadow-sm`}>
                <div className="text-xs text-slate-500 font-semibold uppercase mb-2">{m.label}</div>
                <div className="text-lg font-black text-slate-800">{m.value}</div>
                <div className="text-xs text-slate-400 mt-1">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ────── PERFORMANCE AGENTS ────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <span className="font-bold text-slate-800">Performance agents</span>
            <span className="ml-auto text-xs text-slate-400">{period === "today" ? "Aujourd'hui" : period === "week" ? "7 jours" : "Ce mois"}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {agents.map((a, i) => {
              const stats = agentCallStats.filter((s) => s.agentId === a.id);
              const total = stats.reduce((s, x) => s + x._count.id, 0);
              const confirmed = stats.find((s) => s.outcome === "CONFIRMED")?._count.id ?? 0;
              const cancelled = stats.find((s) => s.outcome === "CANCELLED")?._count.id ?? 0;
              const reported = stats.find((s) => s.outcome === "REPORTED")?._count.id ?? 0;
              const noAnswer = (stats.find((s) => s.outcome === "NO_ANSWER")?._count.id ?? 0)
                + (stats.find((s) => s.outcome === "INJOIGNABLE")?._count.id ?? 0);
              const rate = pct(confirmed, total);
              return (
                <div key={a.id} className="px-6 py-4 flex items-center gap-4">
                  {/* Agent name + color dot */}
                  <div className="flex items-center gap-2.5 w-36 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm"
                      style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }}
                    >
                      {a.firstName[0]}{a.lastName[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">{a.firstName}</div>
                      <div className="text-xs text-slate-400">{a.lastName}</div>
                    </div>
                  </div>

                  {/* Stats chips */}
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      📞 {total} appels
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      ✓ {confirmed} confirmés
                    </span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                      ↩ {reported} reportés
                    </span>
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                      ✕ {cancelled} annulés
                    </span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                      🔇 {noAnswer} injoignables
                    </span>
                  </div>

                  {/* Taux + barre */}
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">Taux</span>
                      <span className={`text-sm font-black ${rate >= 30 ? "text-emerald-600" : rate >= 15 ? "text-amber-600" : "text-red-500"}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${rate >= 30 ? "bg-emerald-500" : rate >= 15 ? "bg-amber-500" : "bg-red-400"}`}
                        style={{ width: `${Math.min(100, rate)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {agents.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">Aucun agent actif.</div>
            )}
          </div>
        </div>

        {/* ────── PERFORMANCE LIVREURS ────── */}
        {livreurs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
                <Truck className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <span className="font-bold text-slate-800">Performance livreurs</span>
            </div>
            <div className="divide-y divide-slate-50">
              {livreurs.map((l) => {
                const rows = livreurDeliveries.filter((d) => d.livreurId === l.id);
                const livre = rows.filter((d) => d.status === "LIVRE").length;
                const retour = rows.filter((d) => d.status === "RETOURNE").length;
                const ca = rows.filter((d) => d.status === "LIVRE").reduce((s, d) => s + (d.amountCollected ?? 0), 0);
                const rate = pct(livre, livre + retour);
                return (
                  <div key={l.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex items-center gap-2.5 w-36 flex-shrink-0">
                      <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs font-black">
                        {l.firstName[0]}{l.lastName[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-700">{l.firstName}</div>
                        <div className="text-xs text-slate-400">{l.lastName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        ✓ {livre} livrées
                      </span>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                        ↩ {retour} retours
                      </span>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
                        💰 {formatGNF(ca)}
                      </span>
                    </div>
                    <div className="w-28 flex-shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">Taux</span>
                        <span className={`text-sm font-black ${rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-500"}`}>
                          {rate}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ────── TOP VILLES + TOP ARTICLES ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* TOP VILLES */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <span className="font-bold text-slate-800">Top villes — livraisons</span>
              <span className="ml-auto text-xs text-slate-400">{livreCount} livrées</span>
            </div>

            {topCities.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                Aucune donnée sur cette période.
              </div>
            ) : (
              <div className="px-6 py-4 space-y-3">
                {topCities.map((c, i) => {
                  const cityName = cityMap[c.cityId ?? ""] ?? "Inconnue";
                  const count = c._count.id;
                  const ca = c._sum.totalAmount ?? 0;
                  const barWidth = Math.round((count / maxCityCount) * 100);
                  const MEDALS = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={c.cityId ?? i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base w-6 text-center">
                            {i < 3 ? MEDALS[i] : <span className="text-xs font-bold text-slate-400">#{i + 1}</span>}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{cityName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-700">{count}</span>
                          <span className="text-xs text-slate-400 ml-1">livraisons</span>
                          <div className="text-xs text-emerald-600 font-medium">{formatGNF(ca)}</div>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            i === 0 ? "bg-rose-500" :
                            i === 1 ? "bg-orange-400" :
                            i === 2 ? "bg-amber-400" :
                            "bg-slate-300"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TOP ARTICLES */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <span className="font-bold text-slate-800">Top articles vendus</span>
              <span className="ml-auto text-xs text-slate-400">commandes livrées</span>
            </div>

            {topProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                Aucune donnée sur cette période.
              </div>
            ) : (
              <div className="px-6 py-4 space-y-3">
                {topProducts.map((p, i) => {
                  const product = productMap[p.productId];
                  const qty = p._sum.quantity ?? 0;
                  const ca = p._sum.subtotal ?? 0;
                  const barWidth = Math.round((qty / (maxProductQty as number)) * 100);
                  const MEDALS = ["🥇", "🥈", "🥉"];
                  const BAR_COLORS = [
                    "bg-violet-500", "bg-purple-400", "bg-indigo-400",
                    "bg-sky-400", "bg-blue-300",
                  ];
                  return (
                    <div key={p.productId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                          <span className="text-base w-6 text-center flex-shrink-0">
                            {i < 3 ? MEDALS[i] : <span className="text-xs font-bold text-slate-400">#{i + 1}</span>}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800 truncate">
                              {product?.name ?? "Produit inconnu"}
                            </div>
                            {product?.sku && (
                              <div className="text-xs text-slate-400 font-mono">{product.sku}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-black text-slate-700">{qty}</span>
                          <span className="text-xs text-slate-400 ml-1">unités</span>
                          <div className="text-xs text-violet-600 font-medium">{formatGNF(ca)}</div>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[i] ?? "bg-slate-300"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ────── HISTORIQUE D'ACTIVITÉS ────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <span className="font-bold text-slate-800">Historique d&apos;activités</span>
            </div>
            <span className="text-xs text-slate-400">{callLogs.length} entrées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3 text-left">Date & heure</th>
                  <th className="px-5 py-3 text-left">Agent</th>
                  <th className="px-5 py-3 text-left">Résultat</th>
                  <th className="px-5 py-3 text-left">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {callLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-slate-700">
                        {log.agent.firstName} {log.agent.lastName}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${outcomeColor[log.outcome] ?? "bg-slate-100 text-slate-500"}`}>
                        {outcomeLabel[log.outcome] ?? log.outcome}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 max-w-xs truncate">
                      {log.note || "—"}
                    </td>
                  </tr>
                ))}
                {callLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      Aucune activité sur cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
