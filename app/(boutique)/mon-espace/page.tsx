import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatGNF } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingUp, Package, Truck, CheckCircle, XCircle,
  Clock, RotateCcw, AlertTriangle, Receipt, Phone, Mail, Globe,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOUVEAU:       { label: "Nouveau",      color: "bg-slate-100 text-slate-700" },
  REPORTE:       { label: "Reporté",      color: "bg-purple-100 text-purple-700" },
  INJOIGNABLE:   { label: "Injoignable",  color: "bg-red-100 text-red-600" },
  PDR:           { label: "PDR",          color: "bg-amber-100 text-amber-700" },
  CONFIRME:      { label: "Confirmé",     color: "bg-sky-100 text-sky-700" },
  EN_LIVRAISON:  { label: "En livraison", color: "bg-blue-100 text-blue-700" },
  LIVRE:         { label: "Livré ✓",      color: "bg-emerald-100 text-emerald-700" },
  RETOURNE:      { label: "Retour",       color: "bg-orange-100 text-orange-700" },
  ANNULE:        { label: "Annulé",       color: "bg-red-100 text-red-500" },
};

function StatCard({
  label, value, sub, color = "emerald", icon: Icon,
}: {
  label: string; value: string | number; sub?: string;
  color?: "emerald" | "sky" | "amber" | "red" | "slate"; icon: any;
}) {
  const colors = {
    emerald: "border-l-emerald-500 text-emerald-700",
    sky:     "border-l-sky-500 text-sky-700",
    amber:   "border-l-amber-500 text-amber-700",
    red:     "border-l-red-500 text-red-600",
    slate:   "border-l-slate-500 text-slate-700",
  };
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${colors[color].split(" ")[0]} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${colors[color].split(" ")[1]}`} />
        <span className="text-xs text-slate-500 uppercase font-semibold tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-black ${colors[color].split(" ")[1]}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default async function MonEspacePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole   = (session.user as any).role;
  const boutiqueId = (session.user as any).boutiqueId as string | null;

  if (userRole !== "BOUTIQUE_OWNER" && userRole !== "ADMIN" && userRole !== "MANAGER") {
    redirect("/");
  }
  if (!boutiqueId && userRole === "BOUTIQUE_OWNER") {
    return (
      <div className="text-center py-20 text-slate-400">
        Aucune boutique n&apos;est liée à votre compte. Contactez l&apos;administrateur.
      </div>
    );
  }

  const params = await searchParams;
  const period  = params.period ?? "month";

  const boutique = boutiqueId
    ? await prisma.boutique.findUnique({
        where: { id: boutiqueId },
        select: {
          id: true, name: true, sellerName: true, sellerPhone: true,
          sellerEmail: true, website: true, active: true,
          products: { select: { id: true, name: true, stock: true, stockAlert: true } },
        },
      })
    : null;

  if (!boutique && boutiqueId) redirect("/mon-espace");

  // Période
  const now  = new Date();
  let start: Date;
  let periodLabel: string;
  if (period === "week") {
    start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0);
    periodLabel = "7 derniers jours";
  } else if (period === "lastmonth") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    periodLabel = `Mois de ${start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = "Ce mois";
  }

  const bId = boutiqueId!;

  const [orders, deliveries, merchantInvoices] = await Promise.all([
    prisma.order.findMany({
      where: { boutiqueId: bId, createdAt: { gte: start } },
      include: {
        items: { include: { product: { select: { name: true } } } },
        customer: { select: { fullName: true, phone: true } },
        city: { select: { name: true } },
        delivery: { select: { status: true, amountCollected: true, deliveredAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.delivery.findMany({
      where: { status: "LIVRE", order: { boutiqueId: bId }, deliveredAt: { gte: start } },
      include: { order: { include: { items: true } } },
    }),
    prisma.merchantInvoice.findMany({
      where: { boutiqueId: bId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const total       = orders.length;
  const confirmed   = orders.filter((o) => ["CONFIRME","EN_LIVRAISON","LIVRE","RETOURNE"].includes(o.status)).length;
  const livre       = orders.filter((o) => o.status === "LIVRE").length;
  const enLivraison = orders.filter((o) => o.status === "EN_LIVRAISON").length;
  const retourne    = orders.filter((o) => o.status === "RETOURNE").length;
  const annule      = orders.filter((o) => o.status === "ANNULE").length;

  const totalCollecte  = deliveries.reduce((s, d) => s + (d.amountCollected ?? d.order.totalAmount), 0);
  const totalProducts  = deliveries.reduce((s, d) => s + ((d.amountCollected ?? d.order.totalAmount) - d.order.deliveryFee), 0);
  const fraisHMP       = livre * 70000;
  const netMarchand    = Math.max(0, totalProducts - fraisHMP);

  const tauxConf  = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const tauxLivr  = confirmed > 0 ? Math.round((livre / confirmed) * 100) : 0;

  const lowStock = boutique?.products.filter((p) => p.stock <= p.stockAlert) ?? [];
  const totalStock = boutique?.products.reduce((s, p) => s + p.stock, 0) ?? 0;

  const PERIODS = [
    { key: "week",      label: "7 jours" },
    { key: "month",     label: "Ce mois" },
    { key: "lastmonth", label: "Mois dernier" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{boutique?.name ?? "Mon Espace"}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {boutique?.sellerName && <span className="font-medium">{boutique.sellerName}</span>}
            {" · "}
            <span className={boutique?.active ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
              {boutique?.active ? "● Actif" : "● Inactif"}
            </span>
          </p>
        </div>
        {/* Contacts */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {boutique?.sellerPhone && (
            <a href={`tel:${boutique.sellerPhone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-sky-600 transition">
              <Phone className="w-4 h-4" /> {boutique.sellerPhone}
            </a>
          )}
          {boutique?.website && (
            <a href={boutique.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-600 hover:underline">
              <Globe className="w-4 h-4" /> Site
            </a>
          )}
        </div>
      </div>

      {/* Période */}
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/mon-espace?period=${p.key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              period === p.key
                ? "bg-slate-800 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <span className="text-xs text-slate-400 ml-2">{periodLabel}</span>
      </div>

      {/* KPI Commandes */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Production — {periodLabel}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Commandes reçues" value={total}    sub={`Taux confirmation : ${tauxConf}%`} color="slate"   icon={ClipboardList} />
          <StatCard label="Confirmées"        value={confirmed} sub={`${enLivraison} en livraison`}   color="sky"     icon={CheckCircle} />
          <StatCard label="Livrées"           value={livre}   sub={`Taux livraison : ${tauxLivr}%`}  color="emerald" icon={Truck} />
          <StatCard label="Retours / Annulés" value={retourne} sub={`${annule} annulées`}             color="red"     icon={XCircle} />
        </div>
      </div>

      {/* KPI Finances */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Finances — {periodLabel}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-sky-600 uppercase font-semibold mb-1">Total collecté</div>
            <div className="text-xl font-black text-sky-800">{formatGNF(totalCollecte)}</div>
            <div className="text-xs text-sky-400 mt-1">Produits + livraison</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Montant produits</div>
            <div className="text-xl font-black text-slate-700">{formatGNF(totalProducts)}</div>
            <div className="text-xs text-slate-400 mt-1">Hors frais livraison</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-red-600 uppercase font-semibold mb-1">Frais HPCOD</div>
            <div className="text-xl font-black text-red-600">−{formatGNF(fraisHMP)}</div>
            <div className="text-xs text-red-400 mt-1">70 000 × {livre} livraisons</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-emerald-700 uppercase font-semibold mb-1">Net à percevoir</div>
            <div className="text-2xl font-black text-emerald-600">{formatGNF(netMarchand)}</div>
            <div className="text-xs text-emerald-500 mt-1">Après déduction HPCOD</div>
          </div>
        </div>
      </div>

      {/* Alertes stock */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-bold text-orange-800">{lowStock.length} produit{lowStock.length > 1 ? "s" : ""} en alerte stock</span>
            <Link href="/mon-espace/stock" className="ml-auto text-xs text-orange-600 hover:underline font-semibold">Voir le stock →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span key={p.id} className="bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                {p.name} — {p.stock} unités
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Factures marchandes */}
      {merchantInvoices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5" /> Derniers règlements
            </h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-left">Période</th>
                  <th className="px-4 py-3 text-right">Commandes</th>
                  <th className="px-4 py-3 text-right">Net marchand</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {merchantInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{inv.reference}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(inv.periodStart).toLocaleDateString("fr-FR")} → {new Date(inv.periodEnd).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{inv.orderCount}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">{formatGNF(inv.netMarchand)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        inv.status === "PAYEE"   ? "bg-emerald-100 text-emerald-700" :
                        inv.status === "ANNULEE" ? "bg-red-100 text-red-600" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {inv.status === "PAYEE" ? "✅ Payée" : inv.status === "ANNULEE" ? "❌ Annulée" : "⏳ En attente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commandes récentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Commandes récentes ({Math.min(orders.length, 10)} / {orders.length})
          </h2>
          <Link href="/mon-espace/commandes" className="text-xs text-sky-600 hover:underline font-semibold">
            Voir tout →
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400">
            Aucune commande sur cette période.
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 10).map((o) => {
                    const s = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-bold text-sky-700">{o.code}</div>
                          <div className="text-xs text-slate-400">{o.city?.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-700 text-sm">{o.customer.fullName}</div>
                          <a href={`tel:${o.customer.phone}`} className="text-xs text-sky-600 hover:underline">{o.customer.phone}</a>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {o.items.map((it, i) => (
                            <div key={i} className="text-xs text-slate-600 truncate">
                              {it.product.name} ×{it.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {formatGNF(o.delivery?.amountCollected ?? o.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ClipboardList({ className }: { className?: string }) {
  return <Package className={className} />;
}
