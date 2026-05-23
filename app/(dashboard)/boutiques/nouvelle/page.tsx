import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { createBoutiqueAction } from "./actions";
import { ArrowLeft, Store } from "lucide-react";

export default async function NouvelleBoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(role)) {
    redirect("/boutiques");
  }
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Nouvelle boutique"
        actions={
          <Link
            href="/boutiques"
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
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Enregistrer un e-commerçant</h2>
              <p className="text-sm text-slate-500">
                Une clé webhook sera générée automatiquement pour connecter sa boutique à votre CRM.
              </p>
            </div>
          </div>

          {error === "missing" && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              Le nom de la boutique et le nom du vendeur sont obligatoires.
            </div>
          )}

          <form action={createBoutiqueAction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom de la boutique <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="ex: AFRISHOP"
                  className="input"
                />
                <p className="text-xs text-slate-500 mt-1">Sera affiché sur les commandes.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Site web
                </label>
                <input
                  name="website"
                  type="url"
                  placeholder="https://afrishop.gn"
                  className="input"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact vendeur</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nom du vendeur <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="sellerName"
                    required
                    placeholder="Mamadou Diop"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Téléphone
                  </label>
                  <input
                    name="sellerPhone"
                    type="tel"
                    placeholder="224620000000"
                    className="input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    name="sellerEmail"
                    type="email"
                    placeholder="contact@boutique.gn"
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm"
              >
                Créer la boutique
              </button>
              <Link
                href="/boutiques"
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
