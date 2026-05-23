import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDate } from "@/lib/utils";
import { can } from "@/lib/rbac";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { FacturesTable } from "./FacturesTable";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_INVOICES")) redirect("/");

  const [invoices, totalAmount, paidAmount] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        order: {
          include: {
            customer: true,
            boutique: true,
            city: true,
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.invoice.aggregate({ _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: "PAYEE" }, _sum: { total: true } }),
  ]);

  const total = totalAmount._sum.total ?? 0;
  const paid = paidAmount._sum.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Factures et Dépenses"
        badges={[{ label: `${invoices.length} factures`, color: "bg-slate-700 text-white" }]}
        actions={
          <Link
            href="/depenses"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            <Receipt className="w-4 h-4" /> Dépenses
          </Link>
        }
      />
      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Total facturé</div>
            <div className="text-2xl font-bold text-slate-800">{formatGNF(total)}</div>
            <div className="text-xs text-slate-400 mt-1">{invoices.length} facture{invoices.length > 1 ? "s" : ""}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <div className="text-xs text-emerald-700 uppercase font-semibold mb-1">Encaissé (COD livré)</div>
            <div className="text-2xl font-bold text-emerald-600">{formatGNF(paid)}</div>
            <div className="text-xs text-emerald-500 mt-1">
              {total > 0 ? Math.round((paid / total) * 100) : 0}% du total
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <div className="text-xs text-amber-700 uppercase font-semibold mb-1">En attente</div>
            <div className="text-2xl font-bold text-amber-600">{formatGNF(total - paid)}</div>
            <div className="text-xs text-amber-500 mt-1">Non encore encaissé</div>
          </div>
        </div>

        {/* Table avec détail produits */}
        <FacturesTable invoices={invoices as any} />
      </div>
    </div>
  );
}
