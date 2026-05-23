import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { can } from "@/lib/rbac";
import { createUserAction } from "./actions";
import { ArrowLeft, UserPlus } from "lucide-react";

export default async function NouveauMembrePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!can(role, "CREATE_USER")) redirect("/");
  const isAdmin = role === "ADMIN";
  const { error } = await searchParams;

  const errors: Record<string, string> = {
    missing: "Tous les champs marqués sont obligatoires.",
    "password-short": "Le mot de passe doit faire au moins 6 caractères.",
    "email-exists": "Un compte avec cet email existe déjà.",
    "forbidden-role": "Vous n'avez pas le droit de créer ce rôle.",
  };

  return (
    <div>
      <PageHeader
        title="Nouveau membre"
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
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Créer un membre de l&apos;équipe</h2>
              <p className="text-sm text-slate-500">
                Le membre pourra se connecter immédiatement avec l&apos;email et le mot de passe que vous définissez.
              </p>
            </div>
          </div>

          {error && errors[error] && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors[error]}
            </div>
          )}

          <form action={createUserAction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input name="firstName" required className="input" placeholder="Mamadou" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input name="lastName" required className="input" placeholder="Diallo" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                className="input"
                placeholder="mamadou@helpmeprocess.gn"
              />
              <p className="text-xs text-slate-500 mt-1">Servira d&apos;identifiant de connexion.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
              <input name="phone" type="tel" className="input" placeholder="224620000000" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <select name="role" required defaultValue="AGENT" className="input">
                  <option value="AGENT">Agent (téléopérateur)</option>
                  <option value="MANAGER">Superviseur</option>
                  <option value="LIVREUR">Livreur</option>
                  {isAdmin && <option value="ADMIN">Administrateur</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  name="password"
                  type="text"
                  required
                  minLength={6}
                  className="input font-mono"
                  placeholder="Au moins 6 caractères"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Communiquez-le au membre. Il pourra le changer ensuite.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <div className="font-semibold mb-1">Quel rôle choisir ?</div>
              <ul className="space-y-0.5">
                <li><strong>Agent</strong> — voit uniquement ses commandes affectées, peut confirmer/reporter/logger appels.</li>
                <li><strong>Superviseur</strong> — accès complet à la gestion : affectation commandes, factures, dépenses, statistiques.</li>
                <li><strong>Livreur</strong> — voit uniquement ses livraisons assignées (module mobile à venir).</li>
                {isAdmin && (
                  <li><strong>Administrateur</strong> — pouvoir total, y compris paramètres système et gestion des admins.</li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2.5 rounded-lg"
              >
                Créer le membre
              </button>
              <Link
                href="/equipe"
                className="text-slate-600 hover:text-slate-800 px-4 py-2.5 text-sm"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
