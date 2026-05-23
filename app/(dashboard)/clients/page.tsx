import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { Phone, MapPin, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const customers = await prisma.customer.findMany({
    include: {
      city: true,
      orders: { select: { id: true, totalAmount: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Clients (acheteurs)"
        badges={[{ label: `${customers.length} clients`, color: "bg-slate-700 text-white" }]}
      />
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nom complet</th>
                <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
                <th className="px-4 py-3 text-left font-semibold">Ville</th>
                <th className="px-4 py-3 text-left font-semibold">Adresse</th>
                <th className="px-4 py-3 text-center font-semibold">Commandes</th>
                <th className="px-4 py-3 text-right font-semibold">Total dépensé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => {
                const livre = c.orders.filter((o) => o.status === "LIVRE");
                const totalSpent = livre.reduce((s, o) => s + o.totalAmount, 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{c.fullName}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-sky-500" /> {c.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.city?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">
                      {c.address ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.address}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <ShoppingBag className="w-3.5 h-3.5 text-sky-500" /> {c.orders.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatGNF(totalSpent)}</td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">Aucun client enregistré.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
