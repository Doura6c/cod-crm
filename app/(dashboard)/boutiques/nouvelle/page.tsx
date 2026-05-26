import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { createBoutiqueAction } from "./actions";
import { ArrowLeft, Store, Package, Truck, FileText, ShoppingBag } from "lucide-react";

export default async function NouvelleBoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(role)) redirect("/boutiques");
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Intégrer un e-commerçant"
        actions={
          <Link
            href="/boutiques"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        }
      />
      <div className="p-6 max-w-3xl space-y-6">

        {/* Entête */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 bg-sky-500 text-white rounded-xl flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-sky-900">Checklist d'onboarding e-commerçant</h2>
            <p className="text-sm text-sky-700 mt-0.5">
              Remplissez ce formulaire pour intégrer une nouvelle boutique dans le CRM COD.
              Une clé webhook sera générée automatiquement pour connecter sa boutique.
            </p>
          </div>
        </div>

        {error === "missing" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            Le nom de la boutique et le nom du vendeur sont obligatoires.
          </div>
        )}

        <form action={createBoutiqueAction} className="space-y-6">

          {/* SECTION 1 — Identité boutique */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1 pb-3 border-b border-slate-100">
              <ShoppingBag className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">1. Identité de la boutique</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom de la boutique <span className="text-red-500">*</span>
                </label>
                <input name="name" required placeholder="ex: HPSHOP Afrique" className="input" />
                <p className="text-xs text-slate-500 mt-1">Affiché sur les commandes et factures.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site web / URL boutique</label>
                <input name="website" type="url" placeholder="https://hpshop-afrique.vercel.app" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de produits vendus</label>
                <select name="productType" className="input">
                  <option value="">— Sélectionner —</option>
                  <option value="Électronique / High-tech">Électronique / High-tech</option>
                  <option value="Mode / Vêtements">Mode / Vêtements</option>
                  <option value="Beauté / Cosmétiques">Beauté / Cosmétiques</option>
                  <option value="Maison / Décoration">Maison / Décoration</option>
                  <option value="Alimentation / Épicerie">Alimentation / Épicerie</option>
                  <option value="Santé / Bien-être">Santé / Bien-être</option>
                  <option value="Sport / Fitness">Sport / Fitness</option>
                  <option value="Auto / Moto">Auto / Moto</option>
                  <option value="Bijoux / Accessoires">Bijoux / Accessoires</option>
                  <option value="Multi-catégories">Multi-catégories</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Volume estimé (commandes/mois)</label>
                <select name="volumeEstimate" className="input">
                  <option value="">— Sélectionner —</option>
                  <option value="Moins de 50">Moins de 50 commandes/mois</option>
                  <option value="50 à 200">50 à 200 commandes/mois</option>
                  <option value="200 à 500">200 à 500 commandes/mois</option>
                  <option value="500 à 1000">500 à 1 000 commandes/mois</option>
                  <option value="Plus de 1000">Plus de 1 000 commandes/mois</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2 — Contact vendeur */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1 pb-3 border-b border-slate-100">
              <FileText className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Contact vendeur / responsable</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom complet du vendeur <span className="text-red-500">*</span>
                </label>
                <input name="sellerName" required placeholder="Mamadou Diallo" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone principal</label>
                <input name="sellerPhone" type="tel" placeholder="224621881210" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input name="sellerEmail" type="email" placeholder="contact@boutique.gn" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp (si différent)</label>
                <input name="sellerWhatsapp" type="tel" placeholder="224620000000" className="input" />
              </div>
            </div>
          </div>

          {/* SECTION 3 — Livraison & COD */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1 pb-3 border-b border-slate-100">
              <Truck className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">3. Conditions de livraison & COD</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Zones de livraison</label>
                <select name="deliveryZone" className="input">
                  <option value="">— Sélectionner —</option>
                  <option value="Conakry uniquement">Conakry uniquement</option>
                  <option value="Guinée nationale">Guinée nationale</option>
                  <option value="Afrique de l'Ouest">Afrique de l'Ouest</option>
                  <option value="À définir">À définir avec HMP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Frais de livraison pris en charge par</label>
                <select name="deliveryPaidBy" className="input">
                  <option value="client">Le client (COD standard)</option>
                  <option value="vendeur">Le vendeur (livraison offerte)</option>
                  <option value="partage">Partagé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Délai de traitement souhaité</label>
                <select name="processingTime" className="input">
                  <option value="24h">Sous 24h</option>
                  <option value="48h">Sous 48h</option>
                  <option value="72h">Sous 72h</option>
                  <option value="5 jours">Sous 5 jours ouvrés</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Politique de retour</label>
                <select name="returnPolicy" className="input">
                  <option value="Aucun retour">Aucun retour accepté</option>
                  <option value="Échange uniquement">Échange uniquement</option>
                  <option value="Retour 7 jours">Retour sous 7 jours</option>
                  <option value="Retour 14 jours">Retour sous 14 jours</option>
                  <option value="À définir">À définir</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4 — Catalogue */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1 pb-3 border-b border-slate-100">
              <Package className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">4. Catalogue & stock</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de références produits</label>
                <select name="productCount" className="input">
                  <option value="">— Sélectionner —</option>
                  <option value="Moins de 10">Moins de 10 références</option>
                  <option value="10 à 50">10 à 50 références</option>
                  <option value="50 à 200">50 à 200 références</option>
                  <option value="Plus de 200">Plus de 200 références</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Intégration technique</label>
                <select name="integrationMethod" className="input">
                  <option value="Webhook automatique">Webhook automatique (recommandé)</option>
                  <option value="Import CSV/Excel">Import CSV / Excel manuel</option>
                  <option value="Saisie manuelle">Saisie manuelle par les agents</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Instructions particulières / notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Ex: Toujours vérifier la taille avant confirmation. Produits fragiles, emballer soigneusement..."
                  className="input resize-none"
                />
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-3 rounded-xl shadow-sm transition"
            >
              Créer la boutique & générer la clé webhook
            </button>
            <Link href="/boutiques" className="text-slate-600 hover:text-slate-800 px-4 py-3 text-sm">
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
