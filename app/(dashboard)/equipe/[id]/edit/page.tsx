import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { updateCollaboratorAction } from "./actions";
import { DeleteMemberButton } from "./DeleteMemberButton";
import { ArrowLeft, UserCog } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Superviseur",
  AGENT: "Agent de confirmation",
  LIVREUR: "Livreur",
  BOUTIQUE_OWNER: "Client Boutique",
};

export default async function EditCollaboratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const sessionRole = (session?.user as any)?.role;
  const sessionUserId = (session?.user as any)?.id;
  if (sessionRole !== "ADMIN") redirect("/equipe");

  const { id } = await params;
  const { error } = await searchParams;

  const [user, cities, boutiques] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.boutique.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!user) redirect("/equipe");

  const isLivreur = user.role === "LIVREUR";

  const errors: Record<string, string> = {
    missing: "Tous les champs obligatoires doivent être remplis.",
    "email-exists": "Cet email est déjà utilisé par un autre compte.",
    "password-short": "Le mot de passe doit contenir au moins 8 caractères.",
    "boutique-required": "Un Client Boutique doit être rattaché à une boutique.",
    "delete-superadmin": "Impossible de supprimer un compte super-administrateur.",
    "delete-self": "Vous ne pouvez pas supprimer votre propre compte.",
    "forbidden-role": "Rôle invalide.",
  };

  const canDelete = !user.isSuperAdmin && user.id !== sessionUserId;

  return (
    <div>
      <PageHeader
        title={`Modifier — ${user.firstName} ${user.lastName}`}
        actions={
          <Link
            href="/equipe"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        }
      />
      <div className="p-6 max-w-2xl">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-white">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role] ?? user.role} · {user.email}</div>
            </div>
            <UserCog className="ml-auto w-5 h-5 text-slate-400" />
          </div>

          {error && errors[error] && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              ❌ {errors[error]}
            </div>
          )}

          <form action={updateCollaboratorAction} className="px-6 py-6 space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input name="firstName" defaultValue={user.firstName} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input name="lastName" defaultValue={user.lastName} required className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="email" type="email" defaultValue={user.email} required className="input" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Téléphone
              </label>
              <input name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" placeholder="224620000000" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <select name="role" defaultValue={user.role} required className="input">
                  <option value="AGENT">Agent de confirmation</option>
                  <option value="MANAGER">Superviseur</option>
                  <option value="LIVREUR">Livreur</option>
                  <option value="BOUTIQUE_OWNER">Client Boutique</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Statut
                </label>
                <select name="active" defaultValue={user.active ? "true" : "false"} className="input">
                  <option value="true">✅ Actif</option>
                  <option value="false">🔴 Inactif</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nouveau mot de passe
              </label>
              <input
                name="password"
                type="text"
                className="input font-mono"
                placeholder="Laisser vide pour ne pas modifier"
              />
              <p className="text-xs text-slate-400 mt-1">Laissez vide pour conserver le mot de passe actuel. Min. 8 caractères.</p>
            </div>

            {/* Boutique associée — clients boutique. Toujours rendu pour conserver le lien si rôle inchangé */}
            <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700/40 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wide">🏪 Boutique associée (rôle Client Boutique)</p>
              <select name="boutiqueId" defaultValue={user.boutiqueId ?? ""} className="input border-sky-300">
                <option value="">— Aucune boutique —</option>
                {boutiques.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="text-xs text-sky-600 dark:text-sky-400">
                Obligatoire si le rôle est « Client Boutique ». Le client accède alors à son portail dédié <code>/mon-espace</code>.
              </p>
            </div>

            {/* Zone d'affectation — livreurs uniquement */}
            {(isLivreur || user.role === "LIVREUR") && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">📍 Zone d'affectation livreur</p>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ville / Zone de livraison</label>
                  <select name="assignedCityId" defaultValue={user.assignedCityId ?? ""} className="input">
                    <option value="">— Non assigné —</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sous-zone / Commune <span className="text-xs font-normal text-slate-400">(Conakry uniquement)</span>
                  </label>
                  <input
                    name="subZone"
                    defaultValue={user.subZone ?? ""}
                    className="input"
                    placeholder="Ex: Ratoma, Kaloum, Matam..."
                  />
                  <p className="text-xs text-slate-400 mt-1">Le livreur peut aussi renseigner ce champ depuis son profil.</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl transition"
              >
                💾 Enregistrer les modifications
              </button>
              <Link href="/equipe" className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2.5">
                Annuler
              </Link>
            </div>
          </form>

          {canDelete && (
            <div className="px-6 py-5 border-t border-red-100 dark:border-red-900/30 bg-red-50/40 dark:bg-red-900/10">
              <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-3">
                Zone dangereuse
              </p>
              <DeleteMemberButton userId={user.id} fullName={`${user.firstName} ${user.lastName}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
