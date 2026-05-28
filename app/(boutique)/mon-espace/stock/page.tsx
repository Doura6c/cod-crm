import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatGNF } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonEspaceStockPage() {
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

  const products = await prisma.product.findMany({
    where: { boutiqueId },
    include: {
      stockMovements: true,
      boutique: { select: { name: true } },
    },
    orderBy: [
      { stock: "asc" }, // produits avec le moins de stock en premier
      { name: "asc" },
    ],
  });

  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowStock   = products.filter((p) => p.stock <= p.stockAlert);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mon-espace" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-800">Mon Stock</h1>
          <p className="text-sm text-slate-500">{products.length} produits · {totalUnits} unités</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-sky-600" />
            <span className="text-xs text-slate-500 uppercase font-semibold">Produits</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{products.length}</div>
          <div className="text-xs text-slate-400 mt-1">{totalUnits} unités en stock</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 uppercase font-semibold">Valeur stock</span>
          </div>
          <div className="text-xl font-black text-emerald-600">{formatGNF(totalValue)}</div>
          <div className="text-xs text-slate-400 mt-1">Valeur totale estimée</div>
        </div>
        {lowStock.length > 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-600 uppercase font-semibold">Alertes</span>
            </div>
            <div className="text-2xl font-black text-orange-600">{lowStock.length}</div>
            <div className="text-xs text-orange-400 mt-1">Produits sous le seuil</div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-emerald-600 uppercase font-semibold mb-1">Stock</div>
            <div className="text-2xl font-black text-emerald-600">✓ OK</div>
            <div className="text-xs text-emerald-400 mt-1">Aucune alerte</div>
          </div>
        )}
      </div>

      {/* Alerte produits faibles */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-bold text-orange-800">Produits à réapprovisionner</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span key={p.id} className="bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {p.name} — <strong>{p.stock}</strong> unités (seuil: {p.stockAlert})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Inventaire</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-left">Réf SKU</th>
                <th className="px-4 py-3 text-right">Qté initiale</th>
                <th className="px-4 py-3 text-right">Livrées</th>
                <th className="px-4 py-3 text-right">Endommagées</th>
                <th className="px-4 py-3 text-right">Restante</th>
                <th className="px-4 py-3 text-center">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p, i) => {
                const outMoves     = p.stockMovements.filter((m) => m.type === "OUT");
                const adjNeg       = p.stockMovements.filter((m) => m.type === "ADJUSTMENT" && m.quantity < 0);
                const totalOut     = outMoves.reduce((s, m) => s + m.quantity, 0);
                const totalDamaged = adjNeg.reduce((s, m) => s + Math.abs(m.quantity), 0);
                const initialQty   = p.stock + totalOut + totalDamaged;
                const isLow        = p.stock <= p.stockAlert;
                return (
                  <tr key={p.id} className={`hover:bg-slate-50 ${isLow ? "bg-orange-50/30" : ""}`}>
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{formatGNF(p.price)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{p.sku}</code>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{initialQty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-sky-700">{totalOut}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={totalDamaged > 0 ? "font-semibold text-red-600" : "text-slate-300"}>
                        {totalDamaged > 0 ? totalDamaged : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-lg font-black ${isLow ? "text-orange-600" : "text-emerald-600"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-semibold bg-orange-50 px-2 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Faible
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">✓ OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Aucun produit enregistré pour cette boutique.
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
