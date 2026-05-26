import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { getSetting, getHmpCommission, getAgentPrime, getLivreurPrime } from "@/lib/settings";
import { formatGNF } from "@/lib/utils";
import { saveSettingsAction, savePrimesAction } from "./actions";
import { BadgeDollarSign, Building2, AlertTriangle, Trophy, Truck, Trash2 } from "lucide-react";
import ResetDataButton from "./ResetDataButton";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_SETTINGS")) redirect("/");

  const [hmpCommission, agentPrime, livreurPrime, companyName, currency] = await Promise.all([
    getHmpCommission(),
    getAgentPrime(),
    getLivreurPrime(),
    getSetting("company_name", "HelpMeProcess COD"),
    getSetting("currency", "GNF"),
  ]);

  return (
    <div>
      <PageHeader title="Paramètres" />
      <div className="p-6 max-w-2xl space-y-6">

        {/* Commission HMP */}
        <div className="bg-white border-2 border-sky-300 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-sky-50 px-6 py-4 border-b border-sky-200 flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
              <BadgeDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sky-900">Commission HelpMeProcess</div>
              <div className="text-xs text-sky-600">Déduite du prix de vente après chaque livraison — se met à jour partout</div>
            </div>
          </div>

          <form action={saveSettingsAction} className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <strong>Valeur actuelle :</strong> {formatGNF(hmpCommission)} / commande livrée.<br />
                Ce montant est déduit du tarif de vente validé. C&apos;est la rémunération HelpMeProcess (confirmation + livraison).
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Montant de la commission (GNF)
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  name="hmp_commission"
                  defaultValue={hmpCommission}
                  min={0}
                  step={1000}
                  className="input text-lg font-bold max-w-[200px]"
                />
                <span className="text-sm text-slate-500">GNF / commande livrée</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ex : prix vente validé 500 000 GNF → net marchand = 500 000 − {formatGNF(hmpCommission)} = {formatGNF(500000 - hmpCommission)} GNF
              </p>
            </div>

            <input type="hidden" name="company_name" value={companyName} />
            <input type="hidden" name="currency" value={currency} />

            <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl transition">
              💾 Enregistrer la commission
            </button>
          </form>
        </div>

        {/* Bloc Primes — Agents & Livreurs */}
        <div className="bg-white border-2 border-emerald-300 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-200 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-emerald-900">Primes équipe</div>
              <div className="text-xs text-emerald-600">Versées par produit livré — calcul automatique dans la page Performance</div>
            </div>
          </div>

          <form action={savePrimesAction} className="px-6 py-5 space-y-5">

            {/* Prime Agent */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div className="font-semibold text-slate-800">Agent de confirmation</div>
              </div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Prime par produit livré (GNF)
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  name="agent_prime"
                  defaultValue={agentPrime}
                  min={0}
                  step={500}
                  className="input text-lg font-bold max-w-[200px]"
                />
                <span className="text-sm text-slate-500">GNF / produit livré</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Actuellement <strong>{formatGNF(agentPrime)}</strong> — versé à l&apos;agent ayant confirmé la commande, uniquement si elle est livrée.
              </p>
            </div>

            {/* Prime Livreur */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <div className="font-semibold text-slate-800">Livreur</div>
              </div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Prime par produit livré (GNF)
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  name="livreur_prime"
                  defaultValue={livreurPrime}
                  min={0}
                  step={500}
                  className="input text-lg font-bold max-w-[200px]"
                />
                <span className="text-sm text-slate-500">GNF / produit livré</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Actuellement <strong>{formatGNF(livreurPrime)}</strong> — versé au livreur ayant effectué la livraison.
              </p>
            </div>

            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl transition">
              💾 Enregistrer les primes
            </button>
          </form>
        </div>

        {/* Infos entreprise */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-800">Informations entreprise</span>
          </div>
          <form action={saveSettingsAction} className="px-6 py-5 space-y-4">
            <input type="hidden" name="hmp_commission" value={hmpCommission} />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de l&apos;entreprise</label>
              <input name="company_name" className="input" defaultValue={companyName} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Devise</label>
              <select name="currency" className="input" defaultValue={currency}>
                <option value="GNF">GNF — Franc guinéen</option>
                <option value="XOF">XOF — Franc CFA</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dollar</option>
              </select>
            </div>
            <button type="submit" className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-lg transition">
              Enregistrer
            </button>
          </form>
        </div>

        {/* Zone de danger — Reset données fictives */}
        <div className="bg-white border-2 border-red-300 rounded-2xl overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-red-900">Zone de danger — Réinitialisation</div>
              <div className="text-xs text-red-600">Supprime toutes les données fictives / de test. Réservé à l&apos;administrateur.</div>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-800">
              <strong>⚠️ Action irréversible.</strong> Cela supprimera toutes les commandes, clients, produits et boutiques.<br />
              Les comptes utilisateurs et les villes seront conservés.
            </div>
            <ResetDataButton />
          </div>
        </div>

      </div>
    </div>
  );
}
