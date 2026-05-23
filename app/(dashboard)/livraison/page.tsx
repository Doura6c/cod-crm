import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { Plus, MapPin, Edit } from "lucide-react";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function LivraisonPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_DELIVERY_SETTINGS")) redirect("/");
  const [cities, livreurs] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "LIVREUR" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Paramètres Livraison"
        badges={[
          { label: `${cities.length} villes`, color: "bg-slate-700 text-white" },
          { label: `${livreurs.length} livreurs`, color: "bg-amber-500 text-white" },
        ]}
        actions={
          <button className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium">
            <Plus className="w-4 h-4" /> Nouvelle ville
          </button>
        }
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Villes et zones</h2>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Ville</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Frais</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Délai</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatGNF(c.deliveryFee)}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{c.estimatedDays}j</td>
                    <td className="px-4 py-2.5 text-center">
                      <button className="text-sky-600 hover:text-sky-800"><Edit className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {cities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucune ville configurée.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Livreurs</h2>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Nom</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Téléphone</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {livreurs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{l.firstName} {l.lastName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{l.phone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`badge ${l.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {l.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                ))}
                {livreurs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">Aucun livreur enregistré.</td>
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
