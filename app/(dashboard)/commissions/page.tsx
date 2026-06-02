import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { getHmpCommission, getAgentPrime, getLivreurPrime } from "@/lib/settings";
import { Users, Truck, TrendingUp, Award } from "lucide-react";

export const dynamic = "force-dynamic";

type Period = "week" | "month" | "all";

function getPeriodRange(period: Period): { start: Date | null; label: string } {
  const now = new Date();
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, label: "7 derniers jours" };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, label: "Ce mois-ci" };
  }
  return { start: null, label: "Tout le temps" };
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/");

  const params = await searchParams;
  const period: Period = (params.period as Period) || "month";
  const { start, label } = getPeriodRange(period);

  const [hmpCommission, COMMISSION_AGENT_PER_CONFIRM, COMMISSION_LIVREUR_PER_DELIVERY] = await Promise.all([
    getHmpCommission(),
    getAgentPrime(),
    getLivreurPrime(),
  ]);

  const dateFilter = start ? { gte: start } : undefined;

  // ── Commissions agents : basées sur les commandes confirmées ───────────
  const agentConfirms = await prisma.callLog.groupBy({
    by: ["agentId"],
    where: {
      outcome: "CONFIRMED",
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    _count: { id: true },
  });

  const agentIds = agentConfirms.map((a) => a.agentId);
  const agents = agentIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  }) : [];

  // Récupérer aussi le total d'appels pour calculer le taux
  const agentTotalCalls = await prisma.callLog.groupBy({
    by: ["agentId"],
    where: {
      agentId: { in: agentIds },
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    _count: { id: true },
  });
  const callsMap: Record<string, number> = {};
  agentTotalCalls.forEach((r) => { callsMap[r.agentId] = r._count.id; });

  // Commission agent : taux configurable depuis Paramètres

  const agentRows = agentConfirms
    .map((a) => {
      const u = agents.find((x) => x.id === a.agentId);
      const confirmees = a._count.id;
      const appels = callsMap[a.agentId] ?? 0;
      const taux = appels > 0 ? Math.round((confirmees / appels) * 100) : 0;
      const commission = confirmees * COMMISSION_AGENT_PER_CONFIRM;
      return {
        id: a.agentId,
        name: u ? `${u.firstName} ${u.lastName}` : "—",
        phone: u?.phone ?? null,
        confirmees,
        appels,
        taux,
        commission,
      };
    })
    .sort((a, b) => b.commission - a.commission);

  // ── Commissions livreurs : par livraison effectuée ──────────────────────
  const livreurDeliveries = await prisma.delivery.groupBy({
    by: ["livreurId"],
    where: {
      status: "LIVRE",
      ...(dateFilter ? { deliveredAt: dateFilter } : {}),
    },
    _count: { id: true },
    _sum: { amountCollected: true },
  });

  const livreurIds = livreurDeliveries.map((l) => l.livreurId).filter(Boolean) as string[];
  const livreurs = livreurIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: livreurIds } },
    select: { id: true, firstName: true, lastName: true, phone: true, assignedCity: { select: { name: true } } },
  }) : [];

  const livreurRetours = await prisma.delivery.groupBy({
    by: ["livreurId"],
    where: {
      status: "RETOURNE",
      livreurId: { in: livreurIds },
      ...(dateFilter ? { updatedAt: dateFilter } : {}), // retours sans deliveredAt : updatedAt comme proxy
    },
    _count: { id: true },
  });
  const retoursMap: Record<string, number> = {};
  livreurRetours.forEach((r) => { if (r.livreurId) retoursMap[r.livreurId] = r._count.id; });

  // Commission livreur : taux configurable depuis Paramètres

  const livreurRows = livreurDeliveries
    .map((l) => {
      const u = livreurs.find((x) => x.id === l.livreurId);
      const livrees = l._count.id;
      const retours = retoursMap[l.livreurId ?? ""] ?? 0;
      const caCollecte = l._sum.amountCollected ?? 0;
      const commission = livrees * COMMISSION_LIVREUR_PER_DELIVERY;
      const tauxLivraison = (livrees + retours) > 0
        ? Math.round((livrees / (livrees + retours)) * 100)
        : 100;
      return {
        id: l.livreurId ?? "",
        name: u ? `${u.firstName} ${u.lastName}` : "—",
        phone: u?.phone ?? null,
        city: (u as any)?.assignedCity?.name ?? "—",
        livrees,
        retours,
        tauxLivraison,
        caCollecte,
        commission,
      };
    })
    .sort((a, b) => b.commission - a.commission);

  const totalCommissionsAgents = agentRows.reduce((s, a) => s + a.commission, 0);
  const totalCommissionsLivreurs = livreurRows.reduce((s, l) => s + l.commission, 0);
  const totalCommissions = totalCommissionsAgents + totalCommissionsLivreurs;

  return (
    <div>
      <PageHeader
        title="Commissions & Performance"
        badges={[
          { label, color: "bg-sky-600 text-white" },
          { label: `Total : ${formatGNF(totalCommissions)}`, color: "bg-amber-500 text-white" },
        ]}
      />

      {/* Filtres */}
      <div className="px-6 pt-4 flex gap-2">
        {(["week", "month", "all"] as Period[]).map((p) => (
          <a
            key={p}
            href={`/commissions?period=${p}`}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              period === p
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p === "week" ? "7 jours" : p === "month" ? "Ce mois" : "Tout"}
          </a>
        ))}
      </div>

      <div className="p-6 space-y-6">

        {/* ── Totaux ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-2xl p-5">
            <Users className="w-6 h-6 opacity-80 mb-3" />
            <div className="text-2xl font-black">{formatGNF(totalCommissionsAgents)}</div>
            <div className="text-xs opacity-80 mt-1">Commissions agents ({agentRows.length} agents)</div>
            <div className="text-xs opacity-60 mt-0.5">{COMMISSION_AGENT_PER_CONFIRM.toLocaleString("fr-FR")} GNF / confirmation</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5">
            <Truck className="w-6 h-6 opacity-80 mb-3" />
            <div className="text-2xl font-black">{formatGNF(totalCommissionsLivreurs)}</div>
            <div className="text-xs opacity-80 mt-1">Commissions livreurs ({livreurRows.length} livreurs)</div>
            <div className="text-xs opacity-60 mt-0.5">{COMMISSION_LIVREUR_PER_DELIVERY.toLocaleString("fr-FR")} GNF / livraison</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5">
            <TrendingUp className="w-6 h-6 opacity-80 mb-3" />
            <div className="text-2xl font-black">{formatGNF(totalCommissions)}</div>
            <div className="text-xs opacity-80 mt-1">Total à payer ({label})</div>
            <div className="text-xs opacity-60 mt-0.5">Agents + Livreurs</div>
          </div>
        </div>

        {/* ── Table Agents ───────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" />
            <h3 className="font-bold text-slate-800">Commissions Agents de confirmation</h3>
          </div>
          {agentRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Aucune donnée sur cette période</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Agent</th>
                    <th className="px-4 py-3 text-right">Appels</th>
                    <th className="px-4 py-3 text-right">Confirmées</th>
                    <th className="px-4 py-3 text-right">Taux</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentRows.map((a, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-lg">{medal}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{a.name}</div>
                          {a.phone && (
                            <a href={`tel:${a.phone}`} className="text-xs text-sky-600 hover:underline">{a.phone}</a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{a.appels}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{a.confirmees}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            a.taux >= 70 ? "bg-emerald-100 text-emerald-700" :
                            a.taux >= 40 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {a.taux}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-700 text-base">
                          {formatGNF(a.commission)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded-full">
                            À payer
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-bold text-slate-700 text-right">TOTAL</td>
                    <td className="px-4 py-3 text-right font-black text-amber-700 text-base">
                      {formatGNF(totalCommissionsAgents)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Table Livreurs ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-slate-800">Commissions Livreurs</h3>
          </div>
          {livreurRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Aucune livraison sur cette période</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Livreur</th>
                    <th className="px-4 py-3 text-left">Zone</th>
                    <th className="px-4 py-3 text-right">Livrées</th>
                    <th className="px-4 py-3 text-right">Retours</th>
                    <th className="px-4 py-3 text-right">Taux</th>
                    <th className="px-4 py-3 text-right">CA encaissé</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {livreurRows.map((l, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-lg">{medal}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{l.name}</div>
                          {l.phone && (
                            <a href={`tel:${l.phone}`} className="text-xs text-sky-600 hover:underline">{l.phone}</a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{l.city}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{l.livrees}</td>
                        <td className="px-4 py-3 text-right text-red-500">{l.retours}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            l.tauxLivraison >= 80 ? "bg-emerald-100 text-emerald-700" :
                            l.tauxLivraison >= 60 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {l.tauxLivraison}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {formatGNF(l.caCollecte)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-700 text-base">
                          {formatGNF(l.commission)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 font-bold text-slate-700 text-right">TOTAL</td>
                    <td className="px-4 py-3 text-right font-black text-amber-700 text-base">
                      {formatGNF(totalCommissionsLivreurs)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Note sur les taux */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <Award className="w-4 h-4 inline mr-2" />
          <strong>Taux de commission configurables</strong> — Actuellement :
          5 000 GNF/confirmation pour les agents,
          3 000 GNF/livraison pour les livreurs.
          Modifiables dans les paramètres du CRM.
        </div>
      </div>
    </div>
  );
}
