import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { Plus, AlertTriangle, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ProduitsPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_PRODUCTS")) redirect("/");
  const products = await prisma.product.findMany({
    include: { boutique: true },
    orderBy: { createdAt: "desc" },
  });

  const lowStock = products.filter((p) => p.stock <= p.stockAlert).length;
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);

  return (
    <div>
      <PageHeader
        title="Produits et stock"
        badges={[
          { label: `${products.length} produits`, color: "bg-slate-700 text-white" },
          ...(lowStock > 0 ? [{ label: `${lowStock} en alerte stock`, color: "bg-orange-500 text-white" }] : []),
        ]}
        actions={
          <Link
            href="/produits/nouveau"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nouveau produit
          </Link>
        }
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-500">Total produits</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{products.length}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-500">Valeur stock</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{formatGNF(totalValue)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-500">Alerte stock</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{lowStock}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">Nom</th>
                <th className="px-4 py-3 text-left font-semibold">Boutique</th>
                <th className="px-4 py-3 text-right font-semibold">Prix</th>
                <th className="px-4 py-3 text-right font-semibold">Stock</th>
                <th className="px-4 py-3 text-center font-semibold">État</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const low = p.stock <= p.stockAlert;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-500">{p.description.slice(0, 60)}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.boutique?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatGNF(p.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${low ? "text-orange-600" : "text-slate-800"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Faible
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-semibold">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/produits/${p.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button className="inline-flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Aucun produit enregistré.
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
