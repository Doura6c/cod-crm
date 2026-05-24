import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { can } from "@/lib/rbac";
import { CityTable } from "./CityTable";
import { UserCheck, UserX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LivraisonPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_DELIVERY_SETTINGS")) redirect("/");

  const [cities, livreurs] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "LIVREUR" }, orderBy: { firstName: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Paramètres Livraison"
        badges={[
          { label: `${cities.length} villes`, color: "bg-slate-700 text-white" },
          { label: `${livreurs.length} livreurs`, color: "bg-amber-500 text-white" },
        ]}
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ─── Villes ─── */}
        <div>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-3">Villes et zones de livraison</h2>
          <CityTable cities={cities} />
        </div>

        {/* ─── Livreurs ─── */}
        <div>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-3">Livreurs</h2>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
                  <th className="px-4 py-3 text-center font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {livreurs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--acc-500)" }}>
                          {l.firstName.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {l.firstName} {l.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{l.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        l.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      }`}>
                        {l.active
                          ? <><UserCheck className="w-3 h-3" /> Actif</>
                          : <><UserX className="w-3 h-3" /> Inactif</>
                        }
                      </span>
                    </td>
                  </tr>
                ))}
                {livreurs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Aucun livreur enregistré.
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
