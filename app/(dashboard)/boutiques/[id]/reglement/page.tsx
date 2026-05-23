import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { ReglementPrint } from "./ReglementPrint";

export const dynamic = "force-dynamic";

const HMP_FEE = 70_000; // frais COD par commande livrée

function getPeriodRange(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, label: "7 derniers jours" };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now, label: `Mois de ${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` };
  }
  if (period === "lastmonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end, label: `Mois de ${start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` };
  }
  // default: ce mois
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now, label: `Mois en cours` };
}

export default async function ReglementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_BOUTIQUES")) redirect("/");

  const { id } = await params;
  const { period = "month" } = await searchParams;
  const { start, end, label } = getPeriodRange(period);

  const boutique = await prisma.boutique.findUnique({ where: { id } });
  if (!boutique) notFound();

  const orders = await prisma.order.findMany({
    where: {
      boutiqueId: id,
      status: "LIVRE",
      updatedAt: { gte: start, lte: end },
    },
    include: {
      customer: true,
      city: true,
      items: { include: { product: true } },
      delivery: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const retours = await prisma.order.count({
    where: {
      boutiqueId: id,
      status: "RETOURNE",
      updatedAt: { gte: start, lte: end },
    },
  });

  const totalCollecte = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalProduits = orders.reduce((s, o) => s + (o.totalAmount - o.deliveryFee), 0);
  const fraisHMP = HMP_FEE * orders.length;
  const montantAVirer = totalProduits - fraisHMP;

  const PERIODS = [
    { key: "week", label: "7 jours" },
    { key: "month", label: "Ce mois" },
    { key: "lastmonth", label: "Mois dernier" },
  ];

  return (
    <div>
      <PageHeader
        title={`Règlement — ${boutique.name}`}
        badges={[
          { label: `${orders.length} livrées`, color: "bg-emerald-600 text-white" },
          { label, color: "bg-slate-700 text-white" },
        ]}
        actions={
          <Link
            href="/boutiques"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        }
      />
      <div className="p-6 space-y-6 max-w-5xl">

        {/* Sélecteur période */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/boutiques/${id}/reglement?period=${p.key}`}
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

        {/* Résumé financier */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Commandes livrées</div>
            <div className="text-3xl font-black text-slate-800">{orders.length}</div>
            <div className="text-xs text-red-500 mt-1">{retours} retour{retours > 1 ? "s" : ""}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Total collecté client</div>
            <div className="text-xl font-black text-slate-800">{formatGNF(totalCollecte)}</div>
            <div className="text-xs text-slate-400 mt-1">Produits + livraison</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-xs text-red-600 uppercase font-semibold mb-1">Frais HelpMeProcess</div>
            <div className="text-xl font-black text-red-600">{formatGNF(fraisHMP)}</div>
            <div className="text-xs text-red-400 mt-1">{formatGNF(HMP_FEE)} × {orders.length} commandes</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
            <div className="text-xs text-emerald-700 uppercase font-semibold mb-1">À virer au marchand</div>
            <div className="text-xl font-black text-emerald-600">{formatGNF(Math.max(0, montantAVirer))}</div>
            <div className="text-xs text-emerald-500 mt-1">Produits − frais HMP</div>
          </div>
        </div>

        {/* Tableau commandes + bouton imprimer */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Détail des commandes livrées</h2>
            <ReglementPrint
              boutique={{ name: boutique.name, sellerName: boutique.sellerName }}
              period={label}
              orders={orders.map((o) => ({
                code: o.code,
                customerName: o.customer.fullName,
                city: o.city?.name ?? "—",
                items: o.items.map((it) => ({ name: it.product.name, qty: it.quantity, price: it.subtotal })),
                totalAmount: o.totalAmount,
                deliveryFee: o.deliveryFee,
                deliveredAt: o.delivery?.deliveredAt ?? o.updatedAt,
              }))}
              summary={{
                totalCollecte,
                fraisHMP,
                montantAVirer: Math.max(0, montantAVirer),
                retours,
              }}
            />
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Aucune commande livrée sur cette période.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Commande</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Ville</th>
                  <th className="px-4 py-3 text-left">Produits</th>
                  <th className="px-4 py-3 text-right">Montant produits</th>
                  <th className="px-4 py-3 text-right">Frais HMP</th>
                  <th className="px-4 py-3 text-right">Net marchand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const prodAmount = o.totalAmount - o.deliveryFee;
                  const net = prodAmount - HMP_FEE;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-sky-700">{o.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{o.customer.fullName}</div>
                        <div className="text-xs text-slate-400">{formatDate(o.delivery?.deliveredAt ?? o.updatedAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{o.city?.name ?? "—"}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {o.items.map((it, i) => (
                          <div key={i} className="text-xs text-slate-600 truncate">
                            {it.product.name} ×{it.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatGNF(prodAmount)}</td>
                      <td className="px-4 py-3 text-right text-red-500 font-semibold">−{formatGNF(HMP_FEE)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatGNF(Math.max(0, net))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-bold text-slate-700 text-right">TOTAUX</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{formatGNF(totalProduits)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">−{formatGNF(fraisHMP)}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600 text-base">{formatGNF(Math.max(0, montantAVirer))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
