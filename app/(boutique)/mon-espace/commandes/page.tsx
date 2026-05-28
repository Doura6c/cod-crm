import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatGNF } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Phone, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOUVEAU:      { label: "Nouveau",      color: "bg-slate-100 text-slate-700" },
  REPORTE:      { label: "Reporté",      color: "bg-purple-100 text-purple-700" },
  INJOIGNABLE:  { label: "Injoignable",  color: "bg-red-100 text-red-600" },
  PDR:          { label: "PDR",          color: "bg-amber-100 text-amber-700" },
  CONFIRME:     { label: "Confirmé",     color: "bg-sky-100 text-sky-700" },
  EN_LIVRAISON: { label: "En livraison", color: "bg-blue-100 text-blue-700" },
  LIVRE:        { label: "Livré ✓",      color: "bg-emerald-100 text-emerald-700" },
  RETOURNE:     { label: "Retour",       color: "bg-orange-100 text-orange-700" },
  ANNULE:       { label: "Annulé",       color: "bg-red-100 text-red-500" },
};

export default async function MonEspaceCommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole   = (session.user as any).role;
  const boutiqueId = (session.user as any).boutiqueId as string | null;

  if (userRole !== "BOUTIQUE_OWNER" && userRole !== "ADMIN" && userRole !== "MANAGER") {
    redirect("/");
  }
  if (!boutiqueId) {
    return (
      <div className="text-center py-20 text-slate-400">Aucune boutique liée à votre compte.</div>
    );
  }

  const params  = await searchParams;
  const status  = params.status ?? "";
  const q       = params.q ?? "";
  const page    = Math.max(1, parseInt(params.page ?? "1"));
  const perPage = 25;

  const where: any = { boutiqueId };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { customer: { fullName: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  const [total, orders, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true } } } },
        customer: { select: { fullName: true, phone: true } },
        city: { select: { name: true } },
        delivery: { select: { status: true, amountCollected: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    // compteurs par statut
    prisma.order.groupBy({
      by: ["status"],
      where: { boutiqueId },
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  const STATUS_TABS = [
    { key: "",             label: "Toutes",       color: "bg-slate-700" },
    { key: "NOUVEAU",      label: "Nouveau",      color: "bg-slate-500" },
    { key: "CONFIRME",     label: "Confirmé",     color: "bg-sky-500" },
    { key: "EN_LIVRAISON", label: "En livraison", color: "bg-blue-500" },
    { key: "LIVRE",        label: "Livré",        color: "bg-emerald-600" },
    { key: "RETOURNE",     label: "Retour",       color: "bg-orange-500" },
    { key: "ANNULE",       label: "Annulé",       color: "bg-red-500" },
    { key: "REPORTE",      label: "Reporté",      color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mon-espace" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-800">Mes Commandes</h1>
          <p className="text-sm text-slate-500">{total} commande{total > 1 ? "s" : ""} au total</p>
        </div>
      </div>

      {/* Tabs statut */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(({ key, label, color }) => {
          const count = key === "" ? Object.values(countMap).reduce((a, b) => a + b, 0) : (countMap[key] ?? 0);
          const isActive = status === key;
          return (
            <a
              key={key}
              href={`/mon-espace/commandes?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                isActive
                  ? `${color} text-white shadow-sm`
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`${isActive ? "bg-white/20" : "bg-slate-100"} px-1.5 py-0.5 rounded-full text-[10px] font-black`}>
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Recherche */}
      <form method="GET" action="/mon-espace/commandes" className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Code, client, téléphone…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 bg-white"
          />
        </div>
        <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          Filtrer
        </button>
        {q && (
          <a href={`/mon-espace/commandes?status=${status}`} className="flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg transition">
            ✕
          </a>
        )}
      </form>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400">
          Aucune commande pour ces critères.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Commande</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Produits</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const s = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-sky-700">{o.code}</div>
                        <div className="text-xs text-slate-400">{o.city?.name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{o.customer.fullName}</div>
                        <a href={`tel:${o.customer.phone}`} className="flex items-center gap-1 text-xs text-sky-500 hover:underline mt-0.5">
                          <Phone className="w-3 h-3" /> {o.customer.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {o.items.map((it, i) => (
                          <div key={i} className="text-xs text-slate-600 truncate">
                            {it.product.name} ×{it.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-slate-700">
                          {formatGNF(o.delivery?.amountCollected ?? o.totalAmount)}
                        </div>
                        {o.delivery?.amountCollected != null && o.delivery.amountCollected !== o.totalAmount && (
                          <div className="text-xs text-amber-500">prévu: {formatGNF(o.totalAmount)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Page {page} / {totalPages} · {total} commandes
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a href={`/mon-espace/commandes?status=${status}&q=${q}&page=${page - 1}`}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition font-semibold">
                    ← Précédent
                  </a>
                )}
                {page < totalPages && (
                  <a href={`/mon-espace/commandes?status=${status}&q=${q}&page=${page + 1}`}
                    className="text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition font-semibold">
                    Suivant →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
