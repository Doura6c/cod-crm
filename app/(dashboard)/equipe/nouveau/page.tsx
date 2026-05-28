import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { can } from "@/lib/rbac";
import { createUserAction } from "./actions";
import { requestCreateAgentAction } from "../demandes/actions";
import { ArrowLeft, UserPlus, Send } from "lucide-react";

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

  // Boutiques pour le rôle BOUTIQUE_OWNER
  const boutiques = isAdmin
    ? await prisma.boutique.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

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
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAdmin ? "bg-sky-100 text-sky-600" : "bg-amber-100 text-amber-600"}`}>
              {isAdmin ? <UserPlus className="w-6 h-6" /> : <Send className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isAdmin ? "Créer un membre de l'équipe" : "Demander la création d'un agent"}
              </h2>
              <p className="text-sm text-slate-500">
                {isAdmin
                  ? "Le membre pourra se connecter immédiatement."
                  : "Votre demande sera soumise à l'administrateur pour validation avant création."}
              </p>
            </div>
          </div>

          {!isAdmin && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="text-lg">⏳</span>
              <div>
                <strong>Demande soumise à validation</strong>
                <p className="text-xs mt-0.5 text-amber-700">L&apos;administrateur recevra votre demande et devra l&apos;approuver. Le compte sera créé uniquement après validation.</p>
              </div>
            </div>
          )}

          {error && errors[error] && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors[error]}
            </div>
          )}

          <form action={isAdmin ? createUserAction : requestCreateAgentAction} className="space-y-4">
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
                <select name="role" required defaultValue="AGENT" className="input" disabled={!isAdmin} id="roleSelect">
                  <option value="AGENT">Agent (téléopérateur)</option>
                  {isAdmin && <option value="MANAGER">Superviseur</option>}
                  {isAdmin && <option value="LIVREUR">Livreur</option>}
                  {isAdmin && <option value="BOUTIQUE_OWNER">Client Boutique</option>}
                  {isAdmin && <option value="ADMIN">Administrateur</option>}
                </select>
                {!isAdmin && <p className="text-xs text-slate-400 mt-1">Les superviseurs peuvent uniquement demander la création d&apos;agents.</p>}
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

            {/* Sélection boutique pour BOUTIQUE_OWNER (admin seulement) */}
            {isAdmin && boutiques.length > 0 && (
              <div id="boutiqueSection" className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                <label className="block text-sm font-semibold text-sky-800 mb-2">
                  🏪 Boutique associée <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-sky-600 ml-2">(obligatoire si rôle = Client Boutique)</span>
                </label>
                <select name="boutiqueId" className="input border-sky-300">
                  <option value="">— Aucune (pas un client boutique) —</option>
                  {boutiques.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <p className="text-xs text-sky-600 mt-1.5">
                  Le client se connectera avec son email/mot de passe et accédera uniquement à son tableau de bord boutique.
                </p>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <div className="font-semibold mb-1">Quel rôle choisir ?</div>
              <ul className="space-y-0.5">
                <li><strong>Agent</strong> — voit uniquement ses commandes affectées, peut confirmer/reporter/logger appels.</li>
                <li><strong>Superviseur</strong> — accès complet à la gestion : affectation commandes, factures, dépenses, statistiques.</li>
                <li><strong>Livreur</strong> — voit uniquement ses livraisons assignées.</li>
                {isAdmin && (
                  <li><strong>Client Boutique</strong> — portail dédié : ses commandes, son stock, ses finances. Accès lecture seule.</li>
                )}
                {isAdmin && (
                  <li><strong>Administrateur</strong> — pouvoir total, y compris paramètres système et gestion des admins.</li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-2 text-white font-semibold px-6 py-2.5 rounded-lg transition"
                style={{ backgroundColor: isAdmin ? "var(--acc-500)" : "#f59e0b" }}
              >
                {isAdmin ? <><UserPlus className="w-4 h-4" /> Créer le membre</> : <><Send className="w-4 h-4" /> Envoyer la demande</>}
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
