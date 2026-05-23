import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatGNF, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getPeriodRange } from "@/lib/period";
import { getAgentPrime, getLivreurPrime } from "@/lib/settings";
import { Trophy, Package, CheckCircle, Truck, Phone, Calendar, TrendingUp, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const userName = (session.user as any).name || "Utilisateur";

  // Cette page est réservée AGENT et LIVREUR
  if (role !== "AGENT" && role !== "LIVREUR") redirect("/");

  const { period = "month", from = "", to = "", day = "" } = await searchParams;
  const { start, end, label: periodLabel } = getPeriodRange(period, from, to, day);

  const dateFilter = start || end ? {
    ...(start ? { gte: start } : {}),
    ...(end ? { lte: end } : {}),
  } : undefined;

  if (role === "AGENT") {
    // -----------------------------
    // PERFORMANCE AGENT DE CONFIRMATION
    // -----------------------------
    const agentPrime = await getAgentPrime();

    // Commandes validées par l'agent (callLog CONFIRMED OU order.validatedById)
    const validatedOrders = await prisma.order.findMany({
      where: {
        validatedById: userId,
        ...(dateFilter ? { validatedAt: dateFilter } : {}),
      },
      include: {
        items: { select: { quantity: true } },
        delivery: { select: { status: true } },
        customer: { select: { fullName: true } },
        boutique: { select: { name: true } },
      },
      orderBy: { validatedAt: "desc" },
      take: 200,
    });

    // Stats appels (sur la période, créés)
    const callLogs = await prisma.callLog.findMany({
      where: { agentId: userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      select: { outcome: true },
    });

    const callsByOutcome: Record<string, number> = {};
    callLogs.forEach((c) => { callsByOutcome[c.outcome] = (callsByOutcome[c.outcome] ?? 0) + 1; });

    const totalCalls = callLogs.length;
    const confirmedCalls = callsByOutcome["CONFIRMED"] ?? 0;
    const reportedCalls = callsByOutcome["REPORTED"] ?? 0;
    const cancelledCalls = callsByOutcome["CANCELLED"] ?? 0;
    const injoignableCalls = (callsByOutcome["INJOIGNABLE"] ?? 0) + (callsByOutcome["NO_ANSWER"] ?? 0) + (callsByOutcome["BUSY"] ?? 0);

    const confirmationRate = totalCalls > 0 ? Math.round((confirmedCalls / totalCalls) * 100) : 0;

    // Commandes confirmées QUI ONT ÉTÉ LIVRÉES (qualifie pour la prime)
    const deliveredFromAgent = validatedOrders.filter((o) => o.status === "LIVRE");
    const productsDelivered = deliveredFromAgent.reduce(
      (s, o) => s + o.items.reduce((a, it) => a + it.quantity, 0),
      0
    );
    const totalPrime = productsDelivered * agentPrime;

    return (
      <div>
        <PageHeader
          title="Ma Performance"
          badges={[
            { label: periodLabel, color: "bg-sky-600 text-white" },
            { label: `${formatGNF(totalPrime)} de prime`, color: "bg-emerald-600 text-white" },
          ]}
        />
        <div className="p-6 space-y-6 max-w-6xl">

          <PeriodFilter basePath="/performance" period={period} from={from} to={to} day={day} />

          {/* En-tête agent */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center text-white text-2xl font-black">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-sky-700 uppercase font-bold tracking-wider">Agent de confirmation</div>
              <div className="text-2xl font-black text-slate-900">{userName}</div>
              <div className="text-sm text-slate-600 mt-1">
                Prime actuelle : <strong>{formatGNF(agentPrime)}</strong> par produit livré confirmé
              </div>
            </div>
          </div>

          {/* KPI principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500 uppercase font-semibold">Appels</span></div>
              <div className="text-3xl font-black text-slate-800">{totalCalls}</div>
              <div className="text-xs text-slate-400 mt-1">total enregistrés</div>
            </div>
            <div className="bg-white border-2 border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-600 uppercase font-semibold">Confirmés</span></div>
              <div className="text-3xl font-black text-emerald-600">{confirmedCalls}</div>
              <div className="text-xs text-emerald-500 mt-1">taux : {confirmationRate}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-sky-500" /><span className="text-xs text-slate-500 uppercase font-semibold">Livrés</span></div>
              <div className="text-3xl font-black text-sky-600">{deliveredFromAgent.length}</div>
              <div className="text-xs text-slate-400 mt-1">{productsDelivered} produit{productsDelivered > 1 ? "s" : ""}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4" /><span className="text-xs uppercase font-bold">Ma prime</span></div>
              <div className="text-2xl font-black">{formatGNF(totalPrime)}</div>
              <div className="text-xs opacity-90 mt-1">{productsDelivered} × {formatGNF(agentPrime)}</div>
            </div>
          </div>

          {/* Répartition des appels */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" /> Répartition de tes appels
            </h2>
            <div className="space-y-3">
              {[
                { label: "Confirmés",     val: confirmedCalls,   color: "bg-emerald-500" },
                { label: "Reportés",      val: reportedCalls,    color: "bg-sky-500" },
                { label: "PDR / Injoignable", val: injoignableCalls, color: "bg-amber-500" },
                { label: "Annulés",       val: cancelledCalls,   color: "bg-red-500" },
              ].map((s) => {
                const pct = totalCalls > 0 ? Math.round((s.val / totalCalls) * 100) : 0;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-semibold text-slate-700">{s.label}</span>
                      <span className="text-slate-500">{s.val} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Détail commandes confirmées (donnant droit à prime) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" /> Mes commandes confirmées sur la période ({validatedOrders.length})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seules les commandes <strong className="text-emerald-700">livrées</strong> génèrent une prime de {formatGNF(agentPrime)} par produit.
              </p>
            </div>
            {validatedOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Aucune commande confirmée sur cette période.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Commande</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Boutique</th>
                    <th className="px-4 py-3 text-right">Produits</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Confirmée le</th>
                    <th className="px-4 py-3 text-right">Prime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validatedOrders.map((o) => {
                    const qty = o.items.reduce((a, it) => a + it.quantity, 0);
                    const isLivre = o.status === "LIVRE";
                    const primeForThis = isLivre ? qty * agentPrime : 0;
                    return (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-sky-700">{o.code}</td>
                        <td className="px-4 py-3 text-slate-800">{o.customer.fullName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{o.boutique.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{qty}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatGNF(o.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            o.status === "LIVRE" ? "bg-emerald-100 text-emerald-700" :
                            o.status === "EN_LIVRAISON" ? "bg-sky-100 text-sky-700" :
                            o.status === "RETOURNE" ? "bg-red-100 text-red-700" :
                            o.status === "ANNULE" ? "bg-slate-100 text-slate-500" :
                            "bg-amber-100 text-amber-700"
                          }`}>{o.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{o.validatedAt ? formatDateTime(o.validatedAt) : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {primeForThis > 0 ? (
                            <span className="font-bold text-emerald-600">+{formatGNF(primeForThis)}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-emerald-200 bg-emerald-50">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-right font-bold text-emerald-800">TOTAL PRIME ({productsDelivered} produit{productsDelivered > 1 ? "s" : ""} livré{productsDelivered > 1 ? "s" : ""}) :</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-emerald-600">{formatGNF(totalPrime)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // PERFORMANCE LIVREUR
  // -----------------------------
  const livreurPrime = await getLivreurPrime();

  const deliveries = await prisma.delivery.findMany({
    where: {
      livreurId: userId,
      ...(dateFilter ? { updatedAt: dateFilter } : {}),
    },
    include: {
      order: {
        include: {
          items: { select: { quantity: true } },
          customer: { select: { fullName: true } },
          boutique: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const totalDeliv = deliveries.length;
  const livrees = deliveries.filter((d) => d.status === "LIVRE");
  const retournees = deliveries.filter((d) => d.status === "RETOURNE");
  const enCours = deliveries.filter((d) => d.status === "ASSIGNED");
  const livraisonRate = (livrees.length + retournees.length) > 0
    ? Math.round((livrees.length / (livrees.length + retournees.length)) * 100)
    : 0;

  const productsDelivered = livrees.reduce(
    (s, d) => s + d.order.items.reduce((a, it) => a + it.quantity, 0),
    0
  );
  const totalPrime = productsDelivered * livreurPrime;
  const caCollected = livrees.reduce((s, d) => s + (d.amountCollected ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Ma Performance"
        badges={[
          { label: periodLabel, color: "bg-sky-600 text-white" },
          { label: `${formatGNF(totalPrime)} de prime`, color: "bg-emerald-600 text-white" },
        ]}
      />
      <div className="p-6 space-y-6 max-w-6xl">

        <PeriodFilter basePath="/performance" period={period} from={from} to={to} day={day} />

        {/* En-tête livreur */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-black">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-amber-700 uppercase font-bold tracking-wider">Livreur</div>
            <div className="text-2xl font-black text-slate-900">{userName}</div>
            <div className="text-sm text-slate-600 mt-1">
              Prime actuelle : <strong>{formatGNF(livreurPrime)}</strong> par produit livré
            </div>
          </div>
        </div>

        {/* KPI principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500 uppercase font-semibold">Total</span></div>
            <div className="text-3xl font-black text-slate-800">{totalDeliv}</div>
            <div className="text-xs text-slate-400 mt-1">{enCours.length} en cours</div>
          </div>
          <div className="bg-white border-2 border-emerald-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-600 uppercase font-semibold">Livrées</span></div>
            <div className="text-3xl font-black text-emerald-600">{livrees.length}</div>
            <div className="text-xs text-emerald-500 mt-1">taux : {livraisonRate}%</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-sky-500" /><span className="text-xs text-slate-500 uppercase font-semibold">CA Encaissé</span></div>
            <div className="text-lg font-black text-sky-600">{formatGNF(caCollected)}</div>
            <div className="text-xs text-slate-400 mt-1">{productsDelivered} produit{productsDelivered > 1 ? "s" : ""}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4" /><span className="text-xs uppercase font-bold">Ma prime</span></div>
            <div className="text-2xl font-black">{formatGNF(totalPrime)}</div>
            <div className="text-xs opacity-90 mt-1">{productsDelivered} × {formatGNF(livreurPrime)}</div>
          </div>
        </div>

        {/* Détail livraisons */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" /> Mes livraisons sur la période ({totalDeliv})
            </h2>
          </div>
          {deliveries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Aucune livraison sur cette période.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Commande</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Boutique</th>
                  <th className="px-4 py-3 text-right">Produits</th>
                  <th className="px-4 py-3 text-right">Encaissé</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Prime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d) => {
                  const qty = d.order.items.reduce((a, it) => a + it.quantity, 0);
                  const isLivre = d.status === "LIVRE";
                  const primeForThis = isLivre ? qty * livreurPrime : 0;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-sky-700">{d.order.code}</td>
                      <td className="px-4 py-3 text-slate-800">{d.order.customer.fullName}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{d.order.boutique.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{qty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {isLivre ? formatGNF(d.amountCollected ?? 0) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          d.status === "LIVRE" ? "bg-emerald-100 text-emerald-700" :
                          d.status === "ASSIGNED" ? "bg-sky-100 text-sky-700" :
                          d.status === "RETOURNE" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {d.deliveredAt ? formatDateTime(d.deliveredAt) : formatDateTime(d.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {primeForThis > 0 ? (
                          <span className="font-bold text-emerald-600">+{formatGNF(primeForThis)}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-emerald-200 bg-emerald-50">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-right font-bold text-emerald-800">TOTAL PRIME ({productsDelivered} produit{productsDelivered > 1 ? "s" : ""}) :</td>
                  <td className="px-4 py-3 text-right text-lg font-black text-emerald-600">{formatGNF(totalPrime)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
