"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Activity, CheckCircle, Clock, Users } from "lucide-react";

type AgentActivity = {
  id: string;
  name: string;
  online: boolean;
  lastAction?: string;
  lastActionAt?: string;
  todayConfirmed: number;
  todayNoAnswer: number;
  todayReported: number;
  todayCancelled: number;
  todayTotal: number;
};

type QueueSummary = {
  NOUVEAU: number;
  REPORTE: number;
  PDR: number;
  INJOIGNABLE: number;
  totalPending: number;
};

type RecentCall = {
  orderId: string;
  orderCode: string;
  agentName: string;
  outcome: string;
  customerName: string;
  boutiqueName: string;
  at: string;
};

interface Props {
  agents: AgentActivity[];
  queue: QueueSummary;
  recentCalls: RecentCall[];
  totalToday: number;
  confirmedToday: number;
  deliveredToday: number;
}

const OUTCOME_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  CONFIRMED:   { label: "Confirmé",      color: "text-emerald-600", icon: "✅" },
  REPORTED:    { label: "Reporté",       color: "text-purple-600",  icon: "📅" },
  NO_ANSWER:   { label: "Pas de réponse",color: "text-amber-600",   icon: "📵" },
  BUSY:        { label: "Occupé",        color: "text-orange-600",  icon: "🔄" },
  INJOIGNABLE: { label: "Injoignable",   color: "text-red-600",     icon: "❌" },
  CANCELLED:   { label: "Annulé",        color: "text-slate-600",   icon: "🚫" },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  return `${Math.floor(diff / 3600)} h`;
}

export function SupervisorExpressView({
  agents,
  queue,
  recentCalls: initialCalls,
  totalToday,
  confirmedToday,
  deliveredToday,
}: Props) {
  const [calls, setCalls] = useState(initialCalls);
  const [now, setNow] = useState(new Date());

  // Rafraîchir l'affichage "il y a X min" toutes les 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const tauxConf = totalToday > 0 ? Math.round((confirmedToday / totalToday) * 100) : 0;
  const onlineAgents = agents.filter((a) => a.online).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-lg">
        <Link href="/commandes/confirmation" className="p-1.5 rounded-lg hover:bg-white/10 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Activity className="w-5 h-5 text-yellow-400" />
        <span className="font-bold text-sm flex-1">Supervision — Mode Express</span>
        <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
          {onlineAgents} agent{onlineAgents > 1 ? "s" : ""} en ligne
        </span>
        <span className="text-xs text-slate-400">
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* KPI globaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-400 font-semibold uppercase">File d&apos;attente</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{queue.totalPending}</div>
            <div className="text-xs text-slate-400 mt-1 space-x-1">
              <span className="bg-slate-100 px-1.5 rounded">{queue.NOUVEAU} new</span>
              <span className="bg-purple-100 text-purple-700 px-1.5 rounded">{queue.REPORTE} rep.</span>
              <span className="bg-amber-100 text-amber-700 px-1.5 rounded">{queue.PDR} pdr</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-sky-500" />
              <span className="text-xs text-slate-400 font-semibold uppercase">Traités aujourd&apos;hui</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{totalToday}</div>
            <div className="text-xs text-slate-400 mt-1">appels loggés</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-400 font-semibold uppercase">Confirmés auj.</span>
            </div>
            <div className="text-3xl font-black text-emerald-600">{confirmedToday}</div>
            <div className="text-xs text-slate-400 mt-1">Taux : {tauxConf}%</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-slate-400 font-semibold uppercase">Agents actifs</span>
            </div>
            <div className="text-3xl font-black text-violet-600">{onlineAgents}</div>
            <div className="text-xs text-slate-400 mt-1">sur {agents.length} total</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Colonne 1 & 2 : Performance agents */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Performance agents — Aujourd&apos;hui
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Agent</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">✅ Conf.</th>
                    <th className="px-4 py-3 text-center">📵 NR</th>
                    <th className="px-4 py-3 text-center">📅 Rep.</th>
                    <th className="px-4 py-3 text-center">🚫 Ann.</th>
                    <th className="px-4 py-3 text-center">Taux conf.</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                        Aucun agent enregistré.
                      </td>
                    </tr>
                  ) : (
                    agents.sort((a, b) => b.todayTotal - a.todayTotal).map((agent) => {
                      const taux = agent.todayTotal > 0
                        ? Math.round((agent.todayConfirmed / agent.todayTotal) * 100)
                        : 0;
                      return (
                        <tr key={agent.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.online ? "bg-emerald-500" : "bg-slate-300"}`} />
                              <span className="font-semibold text-slate-800">{agent.name}</span>
                            </div>
                            {agent.lastActionAt && (
                              <div className="text-xs text-slate-400 mt-0.5 ml-4">
                                Dernière action : {timeAgo(agent.lastActionAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">{agent.todayTotal}</td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">{agent.todayConfirmed}</td>
                          <td className="px-4 py-3 text-center font-semibold text-amber-600">{agent.todayNoAnswer}</td>
                          <td className="px-4 py-3 text-center font-semibold text-purple-600">{agent.todayReported}</td>
                          <td className="px-4 py-3 text-center font-semibold text-red-500">{agent.todayCancelled}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${taux}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${taux >= 70 ? "text-emerald-600" : taux >= 40 ? "text-amber-600" : "text-red-500"}`}>
                                {taux}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              agent.online
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {agent.online ? "● En ligne" : "Hors ligne"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Colonne 3 : Flux appels récents */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Flux en temps réel
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {calls.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun appel loggé aujourd&apos;hui.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                  {calls.map((call, i) => {
                    const o = OUTCOME_LABELS[call.outcome] ?? { label: call.outcome, color: "text-slate-600", icon: "📞" };
                    return (
                      <div key={i} className="px-4 py-3 hover:bg-slate-50 transition">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{o.icon}</span>
                            <span className={`text-xs font-bold ${o.color}`}>{o.label}</span>
                          </div>
                          <span className="text-xs text-slate-300">{timeAgo(call.at)}</span>
                        </div>
                        <div className="mt-1">
                          <div className="text-xs font-semibold text-slate-700">{call.customerName}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="font-mono">{call.orderCode}</span>
                            <span>·</span>
                            <span>{call.boutiqueName}</span>
                          </div>
                          <div className="text-xs text-slate-400">par {call.agentName}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liens actions rapides */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/commandes/confirmation"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la liste de confirmation
          </Link>
          <Link
            href="/commandes/attente"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <CheckCircle className="w-4 h-4" /> En attente de livraison ({deliveredToday})
          </Link>
        </div>
      </div>
    </div>
  );
}
