import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDate } from "@/lib/utils";
import {
  RefreshCw, Download, CheckCircle, Clock, XCircle,
  Receipt, TrendingUp, Package, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { generateMerchantInvoicesAction, updateMerchantInvoiceStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente",  color: "bg-amber-100 text-amber-700 border-amber-200",   icon: "⏳" },
  PAYEE:      { label: "Payée",       color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "✅" },
  ANNULEE:    { label: "Annulée",     color: "bg-red-100 text-red-600 border-red-200",          icon: "❌" },
};

export default async function MerchantInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ boutiqueId?: string; status?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "VIEW_BOUTIQUES")) redirect("/");

  const { boutiqueId = "", status = "all" } = await searchParams;

  const where: Record<string, unknown> = {};
  if (boutiqueId) where.boutiqueId = boutiqueId;
  if (status !== "all") where.status = status;

  const [invoices, boutiques, stats] = await Promise.all([
    prisma.merchantInvoice.findMany({
      where: where as any,
      include: { boutique: true },
      orderBy: { periodEnd: "desc" },
    }),
    prisma.boutique.findMany({ select: { id: true, name: true } }),
    prisma.merchantInvoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { netMarchand: true },
    }),
  ]);

  const totalPending = stats.find((s) => s.status === "EN_ATTENTE")?._sum.netMarchand ?? 0;
  const totalPaid = stats.find((s) => s.status === "PAYEE")?._sum.netMarchand ?? 0;
  const countPending = stats.find((s) => s.status === "EN_ATTENTE")?._count.id ?? 0;
  const countPaid = stats.find((s) => s.status === "PAYEE")?._count.id ?? 0;
  const countAll = stats.reduce((s, r) => s + r._count.id, 0);

  const isAdmin = role === "ADMIN" || role === "MANAGER";

  function buildHref(params: Record<string, string>) {
    const base = { boutiqueId, status, ...params };
    const qs = Object.entries(base)
      .filter(([, v]) => v && v !== "all")
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `/factures/marchands${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="Factures marchands"
        badges={[
          { label: `${countAll} factures`, color: "bg-slate-700 text-white" },
          { label: `${countPending} en attente`, color: "bg-amber-500 text-white" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/factures"
              className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Factures COD
            </Link>
            {isAdmin && (
              <form action={generateMerchantInvoicesAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-semibold"
                >
                  <RefreshCw className="w-4 h-4" /> Générer factures
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Total</div>
            </div>
            <div className="text-2xl font-black text-slate-800">{countAll}</div>
            <div className="text-xs text-slate-400 mt-1">factures marchandes</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xs text-amber-700 uppercase font-semibold">En attente</div>
            </div>
            <div className="text-xl font-black text-amber-700">{formatGNF(totalPending)}</div>
            <div className="text-xs text-amber-500 mt-1">{countPending} facture{countPending > 1 ? "s" : ""} à payer</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs text-emerald-700 uppercase font-semibold">Payées</div>
            </div>
            <div className="text-xl font-black text-emerald-700">{formatGNF(totalPaid)}</div>
            <div className="text-xs text-emerald-500 mt-1">{countPaid} facture{countPaid > 1 ? "s" : ""} versées</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Total à verser</div>
            </div>
            <div className="text-xl font-black text-sky-700">{formatGNF(totalPending + totalPaid)}</div>
            <div className="text-xs text-slate-400 mt-1">net marchands (total)</div>
          </div>
        </div>

        {/* Filtres + Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={boutiqueId}
            className="input text-sm"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              window.location.href = buildHref({ boutiqueId: e.target.value });
            }}
          >
            <option value="">Toutes les boutiques</option>
            {boutiques.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {["all", "EN_ATTENTE", "PAYEE", "ANNULEE"].map((s) => (
            <Link
              key={s}
              href={buildHref({ status: s })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                status === s
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "Toutes" : STATUS_CONFIG[s]?.label ?? s}
            </Link>
          ))}
        </div>

        {/* Table factures */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-500 font-medium">Aucune facture marchand</div>
              {isAdmin && (
                <div className="text-xs text-slate-400 mt-2">
                  Cliquez sur « Générer factures » pour créer les factures à partir des livraisons récentes.
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Référence</th>
                    <th className="px-4 py-3 text-left">Boutique / Commerçant</th>
                    <th className="px-4 py-3 text-left">Période</th>
                    <th className="px-4 py-3 text-right">Commandes</th>
                    <th className="px-4 py-3 text-right">Produits</th>
                    <th className="px-4 py-3 text-right">Total collecté</th>
                    <th className="px-4 py-3 text-right">Frais HMP</th>
                    <th className="px-4 py-3 text-right">Net marchand</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.EN_ATTENTE;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono font-bold text-slate-700">{inv.reference}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{inv.boutique.name}</div>
                          <div className="text-xs text-slate-400">{inv.boutique.sellerName}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <div className="font-medium">{formatDate(inv.periodStart)}</div>
                          <div className="text-slate-400">au {formatDate(inv.periodEnd)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">{inv.orderCount}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-sky-700 font-bold text-xs">
                            <Package className="w-3 h-3" /> {inv.productCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {formatGNF(inv.totalGross)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 font-semibold text-xs">
                          −{formatGNF(inv.fraisHMP)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-emerald-700 text-base">{formatGNF(inv.netMarchand)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {inv.paidAt && (
                            <div className="text-xs text-emerald-500 mt-0.5">{formatDate(inv.paidAt)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Télécharger PDF */}
                            <a
                              href={`/api/factures-marchands/${inv.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg font-semibold transition"
                              title="Télécharger / Imprimer"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>

                            {/* Admin: changer statut */}
                            {isAdmin && inv.status === "EN_ATTENTE" && (
                              <form action={updateMerchantInvoiceStatusAction}>
                                <input type="hidden" name="invoiceId" value={inv.id} />
                                <input type="hidden" name="status" value="PAYEE" />
                                <button
                                  type="submit"
                                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1.5 rounded-lg font-bold transition"
                                >
                                  ✅ Payé
                                </button>
                              </form>
                            )}
                            {isAdmin && inv.status === "PAYEE" && (
                              <form action={updateMerchantInvoiceStatusAction}>
                                <input type="hidden" name="invoiceId" value={inv.id} />
                                <input type="hidden" name="status" value="EN_ATTENTE" />
                                <button
                                  type="submit"
                                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1.5 rounded-lg font-semibold transition"
                                >
                                  ↩ En attente
                                </button>
                              </form>
                            )}
                            {isAdmin && inv.status !== "ANNULEE" && (
                              <form action={updateMerchantInvoiceStatusAction}>
                                <input type="hidden" name="invoiceId" value={inv.id} />
                                <input type="hidden" name="status" value="ANNULEE" />
                                <button
                                  type="submit"
                                  className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-2 py-1.5 rounded-lg font-semibold transition"
                                  title="Annuler"
                                >
                                  ✕
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-right font-bold text-slate-700">
                      TOTAL NET MARCHANDS
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700 text-lg">
                      {formatGNF(invoices.reduce((s, i) => s + i.netMarchand, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
