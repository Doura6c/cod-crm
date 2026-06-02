import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { Plus, AlertTriangle, Edit, ExternalLink, Package, TrendingDown, TrendingUp, BarChart2 } from "lucide-react";
import Link from "next/link";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ boutiqueId?: string }>;
}) {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_PRODUCTS")) redirect("/");

  const params = await searchParams;
  const boutiqueFilter = params.boutiqueId ?? "";

  const [products, boutiques] = await Promise.all([
    prisma.product.findMany({
      where: boutiqueFilter ? { boutiqueId: boutiqueFilter } : {},
      include: {
        boutique: true,
        stockMovements: true,
        orderItems: {
          include: {
            order: { select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.boutique.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const lowStock = products.filter((p) => p.stock <= p.stockAlert).length;
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);

  const selectedBoutique = boutiques.find((b) => b.id === boutiqueFilter);

  return (
    <div>
      <PageHeader
        title="Stock & Produits"
        badges={[
          { label: `${products.length} produits`, color: "bg-slate-700 text-white" },
          ...(boutiqueFilter && selectedBoutique
            ? [{ label: `🏪 ${selectedBoutique.name}`, color: "bg-sky-600 text-white" }]
            : []),
          ...(lowStock > 0
            ? [{ label: `${lowStock} en alerte`, color: "bg-orange-500 text-white" }]
            : []),
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

      <div className="p-6 space-y-6">

        {/* Filtre par boutique */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/produits"
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
              !boutiqueFilter
                ? "bg-slate-800 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Toutes les boutiques
          </a>
          {boutiques.map((b) => (
            <a
              key={b.id}
              href={`/produits?boutiqueId=${b.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                boutiqueFilter === b.id
                  ? "bg-sky-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {b.name}
            </a>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Produits</div>
            </div>
            <div className="text-3xl font-black text-slate-800">{products.length}</div>
            <div className="text-xs text-slate-400 mt-1">{totalUnits} unités en stock</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Valeur stock</div>
            </div>
            <div className="text-xl font-black text-emerald-600">{formatGNF(totalValue)}</div>
            <div className="text-xs text-slate-400 mt-1">Valeur totale</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Livrés (total)</div>
            </div>
            <div className="text-3xl font-black text-red-600">
              {products.reduce((s, p) => s + p.stockMovements.filter((m) => m.type === "OUT").reduce((a, m) => a + m.quantity, 0), 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1">Unités expédiées</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-xs text-orange-600 uppercase font-semibold">Alertes stock</div>
            </div>
            <div className="text-3xl font-black text-orange-600">{lowStock}</div>
            <div className="text-xs text-orange-400 mt-1">Sous le seuil d'alerte</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Inventaire détaillé</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Client / Boutique</th>
                  <th className="px-4 py-3 text-left">Titre</th>
                  <th className="px-4 py-3 text-left">Réf</th>
                  <th className="px-4 py-3 text-right">Qté Initiale</th>
                  <th className="px-4 py-3 text-right">Endommagées</th>
                  <th className="px-4 py-3 text-right">Livrées</th>
                  <th className="px-4 py-3 text-right">Restante</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-center">État</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p, i) => {
                  const outMoves = p.stockMovements.filter((m) => m.type === "OUT");
                  const inMoves = p.stockMovements.filter((m) => m.type === "IN");
                  const adjMoves = p.stockMovements.filter((m) => m.type === "ADJUSTMENT" && m.quantity < 0);
                  const totalOut = outMoves.reduce((s, m) => s + m.quantity, 0);
                  const totalIn = inMoves.reduce((s, m) => s + m.quantity, 0);
                  const totalDamaged = adjMoves.reduce((s, m) => s + Math.abs(m.quantity), 0);
                  const initialQty = p.stock + totalOut + totalDamaged; // reconstruct initial
                  const isLow = p.stock <= p.stockAlert;
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 ${isLow ? "bg-orange-50/30" : ""}`}>
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 text-sm">{p.boutique?.name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500">{formatGNF(p.price)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{p.sku}</code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-slate-700">{initialQty}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${totalDamaged > 0 ? "text-red-600" : "text-slate-400"}`}>
                          {totalDamaged > 0 ? totalDamaged : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-sky-700">{totalOut}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-lg font-black ${isLow ? "text-orange-600" : "text-emerald-600"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {p.description ? (
                          <span className="text-xs text-slate-500 line-clamp-2">{p.description}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-semibold bg-orange-50 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Faible
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                            ✓ OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/produits/${p.id}`}
                            className="inline-flex items-center justify-center w-7 h-7 bg-sky-500 hover:bg-sky-600 text-white rounded transition"
                            aria-label="Modifier le produit"
                          >
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                          </Link>
                          {p.imageUrl && (
                            <a
                              href={p.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded transition"
                              aria-label="Voir l'image du produit"
                            >
                              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                      Aucun produit enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
