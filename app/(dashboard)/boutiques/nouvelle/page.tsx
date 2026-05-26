import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { createBoutiqueAction } from "./actions";
import {
  ArrowLeft, Store, Package, Truck, FileText,
  ShoppingBag, Megaphone, Users, MessageSquare, TrendingUp
} from "lucide-react";

export default async function NouvelleBoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; phone?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(role)) redirect("/boutiques");
  const { error, phone } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Intégrer un e-commerçant"
        badges={[{ label: "Étape 1 / 3", color: "bg-sky-500 text-white" }]}
        actions={
          <Link href="/boutiques" className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        }
      />

      {/* Stepper */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-0 max-w-3xl">
          {[
            { n: 1, label: "Boutique & Stratégie", active: true },
            { n: 2, label: "Catalogue produits", active: false },
            { n: 3, label: "Webhook & Go Live", active: false },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${s.active ? "text-sky-600" : "text-slate-400"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.active ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {s.n}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {/* Erreurs */}
        {error === "missing" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ Le nom de la boutique et le nom du vendeur sont obligatoires.
          </div>
        )}
        {error === "duplicate" && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ Un client avec le téléphone <strong>{phone}</strong> existe déjà.
          </div>
        )}

        <form action={createBoutiqueAction} className="space-y-6">

          {/* ── SECTION 1 : Identité boutique ── */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="font-bold text-sky-900 text-sm">Identité de la boutique</h3>
                <p className="text-xs text-sky-600">Informations de base et contact du vendeur</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nom de la boutique <span className="text-red-500">*</span>
                  </label>
                  <input name="name" required placeholder="ex: HPSHOP Afrique" className="input" />
                  <p className="text-xs text-slate-400 mt-1">Affiché sur les commandes et factures.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Site web</label>
                  <input name="website" type="url" placeholder="https://hpshop-afrique.vercel.app" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nom du responsable <span className="text-red-500">*</span>
                  </label>
                  <input name="sellerName" required placeholder="Mamadou Diallo" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
                  <input name="sellerPhone" type="tel" placeholder="224621881210" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input name="sellerEmail" type="email" placeholder="contact@boutique.gn" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp Business</label>
                  <input name="sellerWhatsapp" type="tel" placeholder="224621881210" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de produits</label>
                  <select name="productType" className="input">
                    <option value="">— Sélectionner —</option>
                    <option value="Électronique / High-tech">Électronique / High-tech</option>
                    <option value="Mode / Vêtements">Mode / Vêtements</option>
                    <option value="Beauté / Cosmétiques">Beauté / Cosmétiques</option>
                    <option value="Maison / Décoration">Maison / Décoration</option>
                    <option value="Santé / Bien-être">Santé / Bien-être</option>
                    <option value="Sport / Fitness">Sport / Fitness</option>
                    <option value="Auto / Moto">Auto / Moto</option>
                    <option value="Bijoux / Accessoires">Bijoux / Accessoires</option>
                    <option value="Multi-catégories">Multi-catégories</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
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
              </div>
            </div>
          </div>

          {/* ── SECTION 2 : Stratégie COD ── */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-emerald-900 text-sm">Stratégie COD</h3>
                <p className="text-xs text-emerald-600">Ces données permettent de calibrer les agents et fixer les objectifs de performance</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ticket moyen estimé (GNF)
                  </label>
                  <input name="avgOrderValue" type="number" placeholder="150000" className="input" />
                  <p className="text-xs text-slate-400 mt-1">Valeur moyenne d'une commande. Guide les agents sur le profil client.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Volume estimé (commandes/mois)
                  </label>
                  <select name="volumeEstimate" className="input">
                    <option value="">— Sélectionner —</option>
                    <option value="Moins de 50">Moins de 50 / mois</option>
                    <option value="50 à 200">50 à 200 / mois</option>
                    <option value="200 à 500">200 à 500 / mois</option>
                    <option value="500 à 1000">500 à 1 000 / mois</option>
                    <option value="Plus de 1000">Plus de 1 000 / mois</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Taux de confirmation cible (%)
                  </label>
                  <select name="confirmationTarget" className="input">
                    <option value="60">60% (marché difficile)</option>
                    <option value="70" selected>70% (standard COD Guinée)</option>
                    <option value="75">75% (bon niveau)</option>
                    <option value="80">80% (excellent)</option>
                    <option value="85">85% + (produit très demandé)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Objectif minimum acceptable. En dessous = révision stratégie.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Délai de traitement souhaité</label>
                  <select name="processingTime" className="input">
                    <option value="24h">Sous 24h (prioritaire)</option>
                    <option value="48h" selected>Sous 48h (standard)</option>
                    <option value="72h">Sous 72h</option>
                    <option value="5 jours">Sous 5 jours ouvrés</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Zones de livraison</label>
                  <select name="deliveryZone" className="input">
                    <option value="Conakry uniquement">Conakry uniquement</option>
                    <option value="Guinée nationale">Guinée nationale</option>
                    <option value="Afrique de l'Ouest">Afrique de l'Ouest</option>
                    <option value="À définir">À définir avec HMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Frais de livraison</label>
                  <select name="deliveryPaidBy" className="input">
                    <option value="client">À la charge du client (COD standard)</option>
                    <option value="vendeur">Offerts par le vendeur</option>
                    <option value="partage">Partagés</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Politique de retour</label>
                  <select name="returnPolicy" className="input">
                    <option value="Aucun retour">Aucun retour accepté</option>
                    <option value="Échange uniquement">Échange uniquement</option>
                    <option value="Retour 7 jours">Retour sous 7 jours</option>
                    <option value="Retour 14 jours">Retour sous 14 jours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre max de tentatives d'appel</label>
                  <select name="maxCallAttempts" className="input">
                    <option value="2">2 tentatives</option>
                    <option value="3" selected>3 tentatives (recommandé)</option>
                    <option value="4">4 tentatives</option>
                    <option value="5">5 tentatives</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 3 : Marketing digital ── */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="font-bold text-purple-900 text-sm">Marketing digital & acquisition</h3>
                <p className="text-xs text-purple-600">Comprendre la source du trafic pour mieux qualifier les leads et adapter le discours agent</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Source de trafic principale</label>
                  <select name="trafficSource" className="input">
                    <option value="">— Sélectionner —</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Instagram Ads">Instagram Ads</option>
                    <option value="WhatsApp / Groupes">WhatsApp / Groupes</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Organique / Bouche-à-oreille">Organique / Bouche-à-oreille</option>
                    <option value="Multi-canaux">Multi-canaux</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Un lead venant de TikTok n'est pas traité comme un lead Facebook.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Budget pub mensuel (GNF)</label>
                  <input name="adBudget" type="number" placeholder="500000" className="input" />
                  <p className="text-xs text-slate-400 mt-1">Pour calculer le coût par commande confirmée.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Pixel Facebook</label>
                  <input name="fbPixelId" placeholder="ex: 1234567890123456" className="input" />
                  <p className="text-xs text-slate-400 mt-1">Pour le suivi des conversions et le retargeting.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Offre / Promotion en cours</label>
                  <input name="currentPromo" placeholder="ex: -20% sur tout, livraison offerte..." className="input" />
                  <p className="text-xs text-slate-400 mt-1">Les agents utilisent ça comme argument de clôture.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Profil de la cible client</label>
                  <input name="targetAudience" placeholder="ex: Femmes 25-45 ans, Conakry, intéressées beauté et bien-être" className="input" />
                  <p className="text-xs text-slate-400 mt-1">Aide les agents à personnaliser leur approche.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 4 : Script agents ── */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Script agents & arguments de vente</h3>
                <p className="text-xs text-amber-600">Ces infos sont affichées aux agents pendant les appels de confirmation</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Arguments de vente clés
                    <span className="ml-2 text-xs font-normal text-slate-400">(affichés à l'agent pendant l'appel)</span>
                  </label>
                  <textarea
                    name="salesArguments"
                    rows={3}
                    placeholder="ex: Produit certifié, livraison rapide 24h, satisfait ou remboursé, seul distributeur officiel en Guinée..."
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Objections fréquentes & réponses
                    <span className="ml-2 text-xs font-normal text-slate-400">(guide pour les agents)</span>
                  </label>
                  <textarea
                    name="salesObjections"
                    rows={3}
                    placeholder="ex: 'C'est trop cher' → rappeler la promo en cours + garantie. 'Je veux voir avant de payer' → expliquer le COD (on paie à la livraison)..."
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Instructions particulières
                    <span className="ml-2 text-xs font-normal text-slate-400">(consignes spéciales)</span>
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="ex: Toujours vérifier la taille avant confirmation. Ne jamais promettre avant J+1. Produits fragiles, signaler au livreur..."
                    className="input resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bouton */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-8 py-3 rounded-xl shadow-sm transition inline-flex items-center gap-2"
            >
              Créer la boutique → Étape 2
            </button>
            <Link href="/boutiques" className="text-slate-500 hover:text-slate-700 px-4 py-3 text-sm">
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
