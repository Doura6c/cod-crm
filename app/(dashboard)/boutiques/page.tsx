import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Globe, Key as KeyIcon, Power, Settings2 } from "lucide-react";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function BoutiquesPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_BOUTIQUES")) redirect("/");
  const boutiques = await prisma.boutique.findMany({
    include: { orders: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Boutiques (sellers)"
        badges={[{ label: `${boutiques.length} boutiques`, color: "bg-slate-700 text-white" }]}
        actions={
          <Link
            href="/boutiques/nouvelle"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nouvelle boutique
          </Link>
        }
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boutiques.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-lg text-slate-800">{b.name}</div>
                  <div className="text-xs text-slate-500">slug: {b.slug}</div>
                </div>
                <span className={`badge ${b.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {b.active ? "Actif" : "Inactif"}
                </span>
              </div>

              <div className="text-sm text-slate-700 mb-1"><span className="text-slate-500">Vendeur :</span> {b.sellerName}</div>
              {b.sellerPhone && <div className="text-sm text-slate-700"><span className="text-slate-500">Tél :</span> {b.sellerPhone}</div>}
              {b.website && (
                <div className="text-sm text-sky-600 mt-1 inline-flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {b.website}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Clé webhook</div>
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded flex-1 truncate">
                    {b.webhookKey.slice(0, 20)}...
                  </code>
                  <Link
                    href={`/boutiques/${b.id}/integration`}
                    className="inline-flex items-center gap-1 text-xs bg-sky-500 hover:bg-sky-600 text-white px-2 py-1 rounded transition"
                  >
                    <KeyIcon className="w-3 h-3" /> Voir
                  </Link>
                </div>
                <Link
                  href={`/boutiques/${b.id}/integration`}
                  className="text-xs text-sky-600 hover:underline mt-1.5 inline-flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3" /> Voir l&apos;intégration complète
                </Link>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <div>
                  <div className="text-slate-500 text-xs">Commandes</div>
                  <div className="font-bold text-slate-800">{b.orders.length}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Livrées</div>
                  <div className="font-bold text-emerald-600">
                    {b.orders.filter((o) => o.status === "LIVRE").length}
                  </div>
                </div>
                <button className="ml-auto text-slate-400 hover:text-red-600"><Power className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {boutiques.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
              Aucune boutique enregistrée.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
