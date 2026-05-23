import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDateTime, statusBadge } from "@/lib/utils";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Search, Filter, Plus, ChevronRight, Phone, MapPin,
  Package, Clock, CheckCircle, XCircle, Truck,
  TrendingUp, AlertCircle
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { key: "all",        label: "Tous",         color: "text-slate-700" },
  { key: "NOUVEAU",    label: "Nouveau",       color: "text-blue-600" },
  { key: "CONFIRME",   label: "Confirmé",      color: "text-emerald-600" },
  { key: "EN_LIVRAISON", label: "En livraison", color: "text-sky-600" },
  { key: "LIVRE",      label: "Livré",         color: "text-green-700" },
  { key: "REPORTE",    label: "Reporté",       color: "text-amber-600" },
  { key: "INJOIGNABLE", label: "Injoignable",  color: "text-slate-500" },
  { key: "ANNULE",     label: "Annulé",        color: "text-red-600" },
  { key: "RETOURNE",   label: "Retourné",      color: "text-rose-600" },
];

export default async function ListePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; agentId?: string; livreurId?: string; city?: string; boutiqueId?: string; }>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  if (!can(role, "VIEW_ORDERS")) redirect("/");

  const { status = "all", q = "", agentId = "", livreurId = "", city = "", boutiqueId = "" } = await searchParams;

  const isAgent = role === "AGENT";

  const whereBase: Record<string, unknown> = {};
  if (isAgent) whereBase.assignedAgentId = userId;
  if (status !== "all") whereBase.status = status;
  if (boutiqueId) whereBase.boutiqueId = boutiqueId;
  if (agentId) whereBase.assignedAgentId = agentId;
  if (city) whereBase.city = { name: { contains: city } };
  if (q) {
    (whereBase as any).OR = [
      { code: { contains: q } },
      { customer: { fullName: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  const [orders, boutiques, agents, livreurs, counts] = await Promise.all([
    prisma.order.findMany({
      where: whereBase as any,
      include: {
        boutique: true,
        customer: true,
        city: true,
        items: { include: { product: true } },
        assignedAgent: { select: { firstName: true, lastName: true } },
        delivery: {
          include: {
            livreur: { select: { firstName: true, lastName: true } },
          },
        },
        invoice: { select: { reference: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.boutique.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: "AGENT", active: true },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.user.findMany({
      where: { role: "LIVREUR", active: true },
      select: { id: true, firstName: true, lastName: true },
    }),
    // Count per status for tabs
    prisma.order.groupBy({
      by: ["status"],
      where: isAgent ? { assignedAgentId: userId } : {},
      _count: { id: true },
    }),
  ]);

  const countMap: Record<string, number> = { all: 0 };
  counts.forEach((c) => {
    countMap[c.status] = c._count.id;
    countMap.all = (countMap.all || 0) + c._count.id;
  });

  // Stats
  const totalCA = orders.reduce((s, o) => s + o.totalAmount, 0);
  const confirmedCount = orders.filter((o) => ["CONFIRME", "EN_LIVRAISON", "LIVRE"].includes(o.status)).length;
  const livrésCount = orders.filter((o) => o.status === "LIVRE").length;
  const tauxConfirmation = orders.length > 0 ? Math.round((confirmedCount / orders.length) * 100) : 0;

  function buildHref(params: Record<string, string>) {
    const base = { status, q, agentId, livreurId, city, boutiqueId, ...params };
    const qs = Object.entries(base)
      .filter(([, v]) => v && v !== "all")
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `/commandes/liste${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="Gestion des commandes"
        badges={[
          { label: `${orders.length} commandes`, color: "bg-slate-700 text-white" },
          ...(livrésCount > 0 ? [{ label: `${livrésCount} livrées`, color: "bg-emerald-600 text-white" }] : []),
        ]}
        actions={
          <Link
            href="/commandes/nouvelle"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nouvelle commande
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* Mini KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Total commandes</div>
              <div className="text-xl font-black text-slate-800">{countMap.all}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Taux confirmation</div>
              <div className="text-xl font-black text-emerald-600">{tauxConfirmation}%</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Livrées</div>
              <div className="text-xl font-black text-green-700">{livrésCount}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">CA total</div>
              <div className="text-lg font-black text-sky-700">{formatGNF(totalCA)}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Filtres</span>
          </div>
          <form method="GET" action="/commandes/liste" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <input
                name="q"
                defaultValue={q}
                type="text"
                placeholder="Recherche (code, client, tel)"
                className="input pr-8 text-sm"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            <select name="boutiqueId" defaultValue={boutiqueId} className="input text-sm">
              <option value="">Toutes les boutiques</option>
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select name="agentId" defaultValue={agentId} className="input text-sm">
              <option value="">Tous les agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
            <select name="livreurId" defaultValue={livreurId} className="input text-sm">
              <option value="">Tous les livreurs</option>
              {livreurs.map((l) => (
                <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>
              ))}
            </select>
            <select name="status" defaultValue={status} className="input text-sm">
              <option value="all">Tous les statuts</option>
              {STATUS_TABS.filter((t) => t.key !== "all").map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-3 py-2 rounded-lg transition">
                Filtrer
              </button>
              <Link href="/commandes/liste" className="flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg transition">
                ✕
              </Link>
            </div>
          </form>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const cnt = countMap[tab.key] ?? 0;
            const active = status === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildHref({ status: tab.key })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-slate-800 text-white shadow"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>
                  {cnt}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-500">Aucune commande trouvée</div>
              {(q || status !== "all") && (
                <Link href="/commandes/liste" className="text-sky-500 text-sm mt-2 inline-block hover:underline">
                  Réinitialiser les filtres
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left w-6">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-3 py-3 text-left">Commande</th>
                    <th className="px-3 py-3 text-left">Client / Ville</th>
                    <th className="px-3 py-3 text-left">Produits</th>
                    <th className="px-3 py-3 text-right">Montant</th>
                    <th className="px-3 py-3 text-left">Statut</th>
                    <th className="px-3 py-3 text-left">Agent / Livreur</th>
                    <th className="px-3 py-3 text-left">Facture</th>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const badge = statusBadge(o.status);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/80 group">
                        <td className="px-3 py-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs font-bold text-sky-700">{o.code}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{o.boutique.name}</div>
                          {o.callCount > 0 && (
                            <div className="flex items-center gap-0.5 text-xs text-slate-500 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {o.callCount} appel{o.callCount > 1 ? "s" : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-800 text-sm">{o.customer.fullName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" /> {o.customer.phone}
                          </div>
                          {o.city && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" /> {o.city.name}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          {o.items.map((it, i) => (
                            <div key={i} className="text-xs text-slate-700 leading-snug truncate">
                              {it.product.name} ×{it.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="font-bold text-slate-800">{formatGNF(o.totalAmount)}</div>
                          {o.deliveryFee > 0 && (
                            <div className="text-xs text-slate-400">livraison: {formatGNF(o.deliveryFee)}</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`badge ${badge.color} text-xs`}>{badge.label}</span>
                          {o.reportDate && (
                            <div className="text-xs text-amber-600 mt-0.5">
                              📅 {formatDateTime(o.reportDate)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {o.assignedAgent && (
                            <div className="text-xs font-medium text-slate-700">
                              👤 {o.assignedAgent.firstName} {o.assignedAgent.lastName}
                            </div>
                          )}
                          {o.delivery?.livreur && (
                            <div className="text-xs text-sky-600 mt-0.5">
                              🚚 {o.delivery.livreur.firstName} {o.delivery.livreur.lastName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {o.invoice ? (
                            <div>
                              <span className="text-xs font-mono text-slate-700">{o.invoice.reference}</span>
                              <div className={`text-xs mt-0.5 font-semibold ${o.invoice.status === "PAYEE" ? "text-emerald-600" : "text-amber-600"}`}>
                                {o.invoice.status === "PAYEE" ? "✓ Payée" : "En attente"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <div className="text-slate-500 font-medium">{formatDateTime(o.createdAt)}</div>
                          {o.updatedAt.getTime() !== o.createdAt.getTime() && (
                            <div className="text-slate-400 mt-0.5">MAJ: {formatDateTime(o.updatedAt)}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Link
                            href={`/commandes/${o.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition group-hover:shadow"
                          >
                            Voir <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {orders.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>{orders.length} commande{orders.length > 1 ? "s" : ""} affichée{orders.length > 1 ? "s" : ""}</span>
              <span className="font-semibold text-slate-700">CA: {formatGNF(totalCA)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
