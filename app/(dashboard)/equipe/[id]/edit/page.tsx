import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { updateCollaboratorAction } from "./actions";
import { ArrowLeft, UserCog } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Superviseur",
  AGENT: "Agent de confirmation",
  LIVREUR: "Livreur",
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
  if (sessionRole !== "ADMIN") redirect("/equipe");

  const { id } = await params;
  const { error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/equipe");

  const errors: Record<string, string> = {
    missing: "Tous les champs obligatoires doivent être remplis.",
    "email-exists": "Cet email est déjà utilisé par un autre compte.",
    "password-short": "Le mot de passe doit contenir au moins 6 caractères.",
  };

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
              <p className="text-xs text-slate-400 mt-1">Laissez vide pour conserver le mot de passe actuel. Min. 6 caractères.</p>
            </div>

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
        </div>
      </div>
    </div>
  );
}
