import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDate } from "@/lib/utils";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DepensesPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_INVOICES")) redirect("/");
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 100 }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dépenses"
        badges={[{ label: formatGNF(total._sum.amount ?? 0), color: "bg-red-500 text-white" }]}
      />
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Réf.</th>
                <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold">Bénéficiaire</th>
                <th className="px-4 py-3 text-right font-semibold">Montant</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{e.reference}</td>
                  <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-700">{e.category}</span></td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 text-slate-600">{e.paidTo ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">-{formatGNF(e.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(e.date)}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Aucune dépense enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
