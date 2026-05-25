import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Phone, Calendar, Clock, ChevronRight, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d.getTime() < today.getTime()) {
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    return `⏰ En retard — il y a ${diff} jour${diff > 1 ? "s" : ""}`;
  }
  if (d.getTime() === today.getTime()) return "📅 Aujourd'hui";
  if (d.getTime() === tomorrow.getTime()) return "📅 Demain";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default async function RappelsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const isAgent = userRole === "AGENT";

  // Toutes les commandes REPORTE avec une date de rappel, triées par date
  const orders = await prisma.order.findMany({
    where: {
      status: "REPORTE",
      reportDate: { not: null },
      ...(isAgent ? { assignedAgentId: userId } : {}),
    },
    include: {
      customer: { include: { city: true } },
      boutique: true,
      assignedAgent: true,
      city: true,
    },
    orderBy: { reportDate: "asc" },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Grouper par date (YYYY-MM-DD)
  const groups: Record<string, typeof orders> = {};
  for (const o of orders) {
    const key = o.reportDate!.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  }

  const overdueCount = orders.filter((o) => {
    const d = new Date(o.reportDate!.getFullYear(), o.reportDate!.getMonth(), o.reportDate!.getDate());
    return d.getTime() < today.getTime();
  }).length;

  const todayCount = orders.filter((o) => {
    const d = new Date(o.reportDate!.getFullYear(), o.reportDate!.getMonth(), o.reportDate!.getDate());
    return d.getTime() === today.getTime();
  }).length;

  return (
    <div>
      <PageHeader
        title="Calendrier des rappels"
        badges={[
          { label: `${orders.length} rappels`, color: "bg-slate-700 text-white" },
          ...(overdueCount > 0 ? [{ label: `${overdueCount} en retard`, color: "bg-red-500 text-white" }] : []),
          ...(todayCount > 0 ? [{ label: `${todayCount} aujourd'hui`, color: "bg-amber-500 text-white" }] : []),
        ]}
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-red-600">{overdueCount}</div>
            <div className="text-xs text-red-500 font-semibold mt-1">En retard</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-amber-600">{todayCount}</div>
            <div className="text-xs text-amber-500 font-semibold mt-1">Aujourd&apos;hui</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-blue-600">{orders.length - overdueCount - todayCount}</div>
            <div className="text-xs text-blue-500 font-semibold mt-1">À venir</div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="text-lg font-semibold">Aucun rappel planifié</div>
            <div className="text-sm mt-1">Les commandes reportées avec une date apparaîtront ici.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([dateKey, dayOrders]) => {
              const firstDate = dayOrders[0].reportDate!;
              const dayDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
              const isOverdue = dayDate.getTime() < today.getTime();
              const isToday = dayDate.getTime() === today.getTime();
              const label = formatDateLabel(firstDate);

              return (
                <div key={dateKey}>
                  {/* En-tête du groupe */}
                  <div className={`flex items-center gap-3 mb-3`}>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
                      isOverdue ? "bg-red-100 text-red-700" :
                      isToday ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {isOverdue && <AlertCircle className="w-4 h-4" />}
                      {isToday && <Clock className="w-4 h-4" />}
                      {!isOverdue && !isToday && <Calendar className="w-4 h-4" />}
                      {label}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isOverdue ? "bg-red-500 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {dayOrders.length} commande{dayOrders.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Cartes commandes */}
                  <div className="space-y-2">
                    {dayOrders.map((o) => (
                      <Link
                        key={o.id}
                        href={`/commandes/${o.id}`}
                        className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm hover:shadow-md transition group ${
                          isOverdue
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : isToday
                            ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {/* Heure */}
                        <div className="flex-shrink-0 text-center w-14">
                          <div className={`text-base font-black ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                            {o.reportDate!.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {isOverdue && <div className="text-[10px] text-red-500 font-bold">EN RETARD</div>}
                        </div>

                        {/* Séparateur vertical */}
                        <div className={`w-0.5 h-10 flex-shrink-0 rounded-full ${isOverdue ? "bg-red-300" : isToday ? "bg-amber-300" : "bg-slate-200"}`} />

                        {/* Info client */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 truncate">{o.customer.fullName}</span>
                            <span className="font-mono text-xs text-slate-400 flex-shrink-0">{o.code}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <a
                              href={`tel:${o.customer.phone}`}
                              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" /> {o.customer.phone}
                            </a>
                            {o.city?.name && (
                              <span className="text-xs text-slate-500">📍 {o.city.name}</span>
                            )}
                            <span className="text-xs text-emerald-600 font-semibold">{formatGNF(o.totalAmount)}</span>
                          </div>
                          {!isAgent && o.assignedAgent && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Agent : {o.assignedAgent.firstName} {o.assignedAgent.lastName}
                            </div>
                          )}
                        </div>

                        {/* Boutique */}
                        <div className="hidden sm:block flex-shrink-0 text-right">
                          <div className="text-xs text-slate-500">{o.boutique.name}</div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-slate-600 transition" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
