import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { Trophy, Medal, Award, Star, TrendingUp, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Stats agents du mois
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", active: true },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  });

  const agentStats = await Promise.all(
    agents.map(async (a) => {
      const [confirmed, total, callLogs] = await Promise.all([
        prisma.order.count({
          where: { validatedById: a.id, validatedAt: { gte: monthStart } },
        }),
        prisma.order.count({
          where: { assignedAgentId: a.id, createdAt: { gte: monthStart } },
        }),
        prisma.callLog.count({
          where: { agentId: a.id, createdAt: { gte: monthStart } },
        }),
      ]);
      return {
        ...a,
        confirmed,
        total,
        callLogs,
        rate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      };
    })
  );

  const sortedAgents = agentStats.sort((a, b) => b.confirmed - a.confirmed);

  // Stats livreurs du mois
  const livreurs = await prisma.user.findMany({
    where: { role: "LIVREUR", active: true },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, assignedCity: { select: { name: true } } },
  });

  const livreurStats = await Promise.all(
    livreurs.map(async (l) => {
      const [livres, total, ca] = await Promise.all([
        prisma.delivery.count({
          where: { livreurId: l.id, status: "LIVRE", updatedAt: { gte: monthStart } },
        }),
        prisma.delivery.count({
          where: { livreurId: l.id, createdAt: { gte: monthStart } },
        }),
        prisma.delivery.aggregate({
          where: { livreurId: l.id, status: "LIVRE", updatedAt: { gte: monthStart } },
          _sum: { amountCollected: true },
        }),
      ]);
      return {
        ...l,
        livres,
        total,
        rate: total > 0 ? Math.round((livres / total) * 100) : 0,
        ca: ca._sum.amountCollected ?? 0,
      };
    })
  );

  const sortedLivreurs = livreurStats.sort((a, b) => b.livres - a.livres);

  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeader
        title="Classement de l'équipe"
        badges={[{ label: `📅 ${monthLabel}`, color: "bg-amber-500 text-white" }]}
      />
      <div className="p-4 lg:p-6 space-y-8">

        {/* ── Agents de confirmation ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Agents de confirmation</h2>
          </div>

          {sortedAgents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-slate-400">Aucun agent ce mois-ci.</div>
          ) : (
            <div className="space-y-3">
              {sortedAgents.map((a, i) => (
                <div key={a.id} className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 flex items-center gap-4 shadow-sm transition hover:shadow-md ${
                  i === 0 ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20" :
                  i === 1 ? "border-slate-300" :
                  i === 2 ? "border-orange-200" :
                  "border-slate-100 dark:border-slate-700"
                }`}>
                  {/* Rang */}
                  <div className="w-10 text-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-2xl">{MEDAL[i]}</span>
                    ) : (
                      <span className="text-lg font-bold text-slate-400">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 font-bold text-sky-700">
                    {a.firstName.charAt(0)}{a.lastName.charAt(0)}
                  </div>

                  {/* Nom + stats */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-white">
                      {a.firstName} {a.lastName}
                      {i === 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">👑 Top du mois</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-emerald-600 font-semibold">{a.confirmed} confirmées</span>
                      <span className="text-xs text-slate-500">{a.total} traitées</span>
                      <span className="text-xs text-slate-500">{a.callLogs} appels</span>
                    </div>
                  </div>

                  {/* Taux */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-black ${a.rate >= 70 ? "text-emerald-600" : a.rate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {a.rate}%
                    </div>
                    <div className="text-xs text-slate-400">taux conf.</div>
                  </div>

                  {/* Barre de progression */}
                  <div className="hidden sm:block w-24">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${a.rate >= 70 ? "bg-emerald-500" : a.rate >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                        style={{ width: `${a.rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Livreurs ── */}
        {livreurs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-sky-500" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Livreurs</h2>
            </div>

            <div className="space-y-3">
              {sortedLivreurs.map((l, i) => (
                <div key={l.id} className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 flex items-center gap-4 shadow-sm ${
                  i === 0 ? "border-sky-300 bg-sky-50 dark:bg-sky-900/20" : "border-slate-100 dark:border-slate-700"
                }`}>
                  <div className="w-10 text-center flex-shrink-0">
                    {i < 3 ? <span className="text-2xl">{MEDAL[i]}</span> : <span className="text-lg font-bold text-slate-400">#{i + 1}</span>}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 font-bold text-sky-700">
                    {l.firstName.charAt(0)}{l.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-white">
                      {l.firstName} {l.lastName}
                      {l.assignedCity && <span className="ml-2 text-xs text-slate-500">📍 {l.assignedCity.name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-emerald-600 font-semibold">{l.livres} livrées</span>
                      <span className="text-xs text-slate-500">{l.total} assignées</span>
                      {l.ca > 0 && <span className="text-xs text-sky-600 font-semibold">{formatGNF(l.ca)} collectés</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-black ${l.rate >= 70 ? "text-emerald-600" : l.rate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {l.rate}%
                    </div>
                    <div className="text-xs text-slate-400">taux livr.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
