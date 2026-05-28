import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDate } from "@/lib/utils";
import {
  ArrowLeft, BarChart2, Package, Truck, CheckCircle,
  RotateCcw, TrendingUp, Receipt, Clock, AlertTriangle,
  RefreshCw, Globe, Phone, Mail
} from "lucide-react";
import Link from "next/link";
import { generateMerchantInvoicesAction } from "@/app/(dashboard)/factures/marchands/actions";
import { getHmpCommission } from "@/lib/settings";
import { DeleteBoutiqueButton } from "./DeleteBoutiqueButton";

export const dynamic = "force-dynamic";

export default async function BoutiqueProductionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const sessionUser = session?.user as any;
  if (!can(sessionUser?.role, "VIEW_BOUTIQUES")) redirect("/");
  const isSuperAdmin = sessionUser?.isSuperAdmin === true;

  const { id } = await params;
  const { period = "month" } = await searchParams;

  const boutique = await prisma.boutique.findUnique({
    where: { id },
    include: {
      products: { select: { id: true, name: true, stock: true, stockAlert: true } },
    },
  });
  if (!boutique) notFound();

  // Période
  const now = new Date();
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
    periodLabel = `Mois en cours`;
  }

  const HMP_FEE = await getHmpCommission();

  const [orders, deliveries, merchantInvoices] = await Promise.all([
    prisma.order.findMany({
      where: { boutiqueId: id, createdAt: { gte: start } },
      include: {
        items: { include: { product: true } },
        customer: true,
        city: true,
        delivery: { select: { status: true, amountCollected: true, deliveredAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.delivery.findMany({
      where: {
        status: "LIVRE",
        order: { boutiqueId: id },
        deliveredAt: { gte: start },
      },
      include: {
        order: { include: { items: true } },
      },
    }),
    prisma.merchantInvoice.findMany({
      where: { boutiqueId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const total = orders.length;
  const confirmed = orders.filter((o) => ["CONFIRME", "EN_LIVRAISON", "LIVRE", "RETOURNE"].includes(o.status)).length;
  const livre = orders.filter((o) => o.status === "LIVRE").length;
  const retourne = orders.filter((o) => o.status === "RETOURNE").length;
  const annule = orders.filter((o) => o.status === "ANNULE").length;
  const enLivraison = orders.filter((o) => o.status === "EN_LIVRAISON").length;

  const totalCollecte = deliveries.reduce((s, d) => s + (d.amountCollected ?? d.order.totalAmount), 0);
  const totalProducts = deliveries.reduce((s, d) => s + ((d.amountCollected ?? d.order.totalAmount) - d.order.deliveryFee), 0);
  const fraisHMP = livre * HMP_FEE;
  const netMarchand = Math.max(0, totalProducts - fraisHMP);

  const tauxConf = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const tauxLivr = confirmed > 0 ? Math.round((livre / confirmed) * 100) : 0;

  const lowStock = boutique.products.filter((p) => p.stock <= p.stockAlert).length;
  const totalStock = boutique.products.reduce((s, p) => s + p.stock, 0);

  const PERIODS = [
    { key: "week", label: "7 jours" },
    { key: "month", label: "Ce mois" },
    { key: "lastmonth", label: "Mois dernier" },
  ];

  return (
    <div>
      <PageHeader
        title={`Tableau de bord — ${boutique.name}`}
        badges={[
          { label: periodLabel, color: "bg-slate-700 text-white" },
          { label: boutique.active ? "Actif" : "Inactif", color: boutique.active ? "bg-emerald-600 text-white" : "bg-red-600 text-white" },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link href="/boutiques" className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Link>
            <Link href={`/boutiques/${id}/reglement`} className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded text-sm font-semibold">
              <Receipt className="w-4 h-4" /> Règlement
            </Link>
            {isSuperAdmin && (
              <DeleteBoutiqueButton
                boutiqueId={id}
                boutiqueName={boutique.name}
                orderCount={orders.length}
                productCount={boutique.products.length}
              />
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-6xl">
        {/* Infos boutique */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-start gap-6">
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Commerçant</div>
            <div className="font-bold text-slate-800 text-lg">{boutique.sellerName}</div>
            {boutique.sellerPhone && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                <Phone className="w-3.5 h-3.5" /> {boutique.sellerPhone}
              </div>
            )}
            {boutique.sellerEmail && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-0.5">
                <Mail className="w-3.5 h-3.5" /> {boutique.sellerEmail}
              </div>
            )}
            {boutique.website && (
              <div className="flex items-center gap-1.5 text-sm text-sky-600 mt-0.5">
                <Globe className="w-3.5 h-3.5" /> {boutique.website}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-slate-800">{boutique.products.length}</div>
              <div className="text-xs text-slate-500 mt-1">Produits</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-700">{totalStock}</div>
              <div className="text-xs text-slate-500 mt-1">Unités stock</div>
            </div>
            {lowStock > 0 && (
              <div className="text-center">
                <div className="text-3xl font-black text-orange-600">{lowStock}</div>
                <div className="text-xs text-orange-500 mt-1 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> Alertes
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sélecteur période */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/boutiques/${id}?period=${p.key}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                period === p.key
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* KPI Production */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5" /> Production — {periodLabel}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border-l-4 border-slate-500 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Commandes reçues</div>
              <div className="text-3xl font-black text-slate-800">{total}</div>
              <div className="text-xs text-slate-400 mt-1">Taux conf. <strong>{tauxConf}%</strong></div>
            </div>
            <div className="bg-white border-l-4 border-emerald-500 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Confirmées</div>
              <div className="text-3xl font-black text-emerald-700">{confirmed}</div>
              <div className="text-xs text-slate-400 mt-1">{enLivraison} en livraison</div>
            </div>
            <div className="bg-white border-l-4 border-green-500 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Livrées</div>
              <div className="text-3xl font-black text-green-700">{livre}</div>
              <div className="text-xs text-slate-400 mt-1">Taux livr. <strong>{tauxLivr}%</strong></div>
            </div>
            <div className="bg-white border-l-4 border-red-400 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Retours / Annulés</div>
              <div className="text-3xl font-black text-red-600">{retourne}</div>
              <div className="text-xs text-slate-400 mt-1">{annule} annulées</div>
            </div>
          </div>
        </div>

        {/* Récap financier marchand */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Finances marchand
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <div className="text-xs text-sky-700 uppercase font-semibold mb-1">Total collecté</div>
              <div className="text-lg font-black text-sky-800">{formatGNF(totalCollecte)}</div>
              <div className="text-xs text-sky-500 mt-1">Produits + livraison</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Montant produits</div>
              <div className="text-lg font-black text-slate-800">{formatGNF(totalProducts)}</div>
              <div className="text-xs text-slate-400 mt-1">Sans frais livraison</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-xs text-red-600 uppercase font-semibold mb-1">Frais HMP</div>
              <div className="text-lg font-black text-red-600">−{formatGNF(fraisHMP)}</div>
              <div className="text-xs text-red-400 mt-1">{formatGNF(HMP_FEE)} × {livre}</div>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4">
              <div className="text-xs text-emerald-700 uppercase font-semibold mb-1">Net marchand</div>
              <div className="text-xl font-black text-emerald-600">{formatGNF(netMarchand)}</div>
              <div className="text-xs text-emerald-500 mt-1">À percevoir</div>
            </div>
          </div>
        </div>

        {/* Factures marchandes récentes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5" /> Dernières factures marchandes
            </div>
            <div className="flex gap-2">
              <form action={generateMerchantInvoicesAction}>
                <button
                  type="submit"
                  className="text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Générer factures
                </button>
              </form>
              <Link
                href="/factures/marchands"
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition"
              >
                Voir toutes →
              </Link>
            </div>
          </div>

          {merchantInvoices.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-sm">
              Aucune facture marchand générée. Cliquez sur « Générer factures » ci-dessus.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Référence</th>
                    <th className="px-4 py-3 text-left">Période</th>
                    <th className="px-4 py-3 text-right">Commandes</th>
                    <th className="px-4 py-3 text-right">Net marchand</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {merchantInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{inv.reference}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDate(inv.periodStart)} → {formatDate(inv.periodEnd)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{inv.orderCount}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">{formatGNF(inv.netMarchand)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          inv.status === "PAYEE"      ? "bg-emerald-100 text-emerald-700" :
                          inv.status === "ANNULEE"    ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.status === "PAYEE" ? "✅ Payée" : inv.status === "ANNULEE" ? "❌ Annulée" : "⏳ En attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`/api/factures-marchands/${inv.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-semibold"
                        >
                          📄 PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Commandes récentes */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" /> Commandes récentes ({orders.slice(0, 10).length} / {orders.length})
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Aucune commande sur cette période.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2 text-left">Commande</th>
                    <th className="px-4 py-2 text-left">Client</th>
                    <th className="px-4 py-2 text-left">Produits</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                    <th className="px-4 py-2 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 15).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-sky-700">{o.code}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-700">{o.customer.fullName}</div>
                        <div className="text-xs text-slate-400">{o.city?.name}</div>
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        {o.items.map((it, i) => (
                          <div key={i} className="text-xs text-slate-600 truncate">
                            {it.product.name} ×{it.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                        {formatGNF(o.delivery?.amountCollected ?? o.totalAmount)}
                        {o.delivery?.amountCollected != null &&
                          o.delivery.amountCollected !== o.totalAmount && (
                          <div className="text-xs text-amber-500">
                            prévu: {formatGNF(o.totalAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          o.status === "LIVRE"      ? "bg-emerald-100 text-emerald-700" :
                          o.status === "RETOURNE"   ? "bg-red-100 text-red-600" :
                          o.status === "CONFIRME"   ? "bg-sky-100 text-sky-700" :
                          o.status === "EN_LIVRAISON" ? "bg-blue-100 text-blue-700" :
                          o.status === "ANNULE"     ? "bg-red-100 text-red-500" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {o.status === "LIVRE" ? "✓ Livré" :
                           o.status === "RETOURNE" ? "Retour" :
                           o.status === "CONFIRME" ? "Confirmé" :
                           o.status === "EN_LIVRAISON" ? "En livraison" :
                           o.status === "ANNULE" ? "Annulé" :
                           o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
