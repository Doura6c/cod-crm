import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, Copy, ExternalLink, Globe, Key, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const boutique = await prisma.boutique.findUnique({ where: { id } });
  if (!boutique) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3002";
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const webhookUrl = `${protocol}://${host}/api/webhook/order`;

  const exampleBody = JSON.stringify(
    {
      externalRef: "ORDER-12345",
      customer: {
        fullName: "Mamadou Diallo",
        phone: "224621881210",
        address: "Quartier Almamya, immeuble 6",
        city: "Conakry",
        commune: "Kaloum",
      },
      items: [
        {
          sku: "MASQUE-MOTO-01",
          name: "Masque Moto Polyvalent",
          price: 170000,
          quantity: 1,
        },
      ],
      deliveryFee: 20000,
      notes: "Livrer le matin SVP",
    },
    null,
    2
  );

  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Key: ${boutique.webhookKey}" \\
  -d '${exampleBody.replace(/\n/g, "")}'`;

  const jsExample = `// Côté boutique e-commerce, après validation du panier
async function envoyerCommande(commande) {
  const res = await fetch("${webhookUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Key": "${boutique.webhookKey}"
    },
    body: JSON.stringify({
      externalRef: commande.id,
      customer: {
        fullName: commande.client.nom,
        phone: commande.client.telephone,
        address: commande.adresse,
        city: commande.ville,
      },
      items: commande.produits.map(p => ({
        sku: p.sku,
        name: p.nom,
        price: p.prix,
        quantity: p.quantite
      })),
      deliveryFee: commande.fraisLivraison,
      notes: commande.note
    })
  });
  return res.json();
}`;

  return (
    <div>
      <PageHeader
        title="Boutique créée"
        badges={[{ label: "ACTIVE", color: "bg-emerald-500 text-white" }]}
        actions={
          <Link
            href="/boutiques"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Toutes les boutiques
          </Link>
        }
      />
      <div className="p-6 max-w-4xl space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-emerald-900">Boutique &laquo; {boutique.name} &raquo; créée avec succès</div>
            <div className="text-sm text-emerald-700 mt-0.5">
              Conservez précieusement la clé webhook ci-dessous. Elle servira au e-commerçant pour envoyer ses commandes vers votre CRM.
            </div>
          </div>
        </div>

        {/* Informations */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Informations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Nom</div>
              <div className="font-medium text-slate-800">{boutique.name}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Slug</div>
              <code className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{boutique.slug}</code>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Vendeur</div>
              <div className="text-slate-800">{boutique.sellerName}</div>
            </div>
            {boutique.sellerPhone && (
              <div>
                <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Téléphone</div>
                <div className="text-slate-800">{boutique.sellerPhone}</div>
              </div>
            )}
            {boutique.website && (
              <div className="md:col-span-2">
                <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Site web</div>
                <a href={boutique.website} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-1">
                  {boutique.website} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Identifiants webhook */}
        <div className="bg-white border-2 border-amber-300 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-800">Identifiants d&apos;intégration</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            À copier dans le système e-commerce du vendeur.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 uppercase">URL Webhook</label>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <code className="flex-1 font-mono text-xs bg-slate-100 px-3 py-2.5 rounded select-all break-all">
                  {webhookUrl}
                </code>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 uppercase">Clé Webhook (X-Webhook-Key)</label>
              </div>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <code className="flex-1 font-mono text-xs bg-amber-50 border border-amber-200 px-3 py-2.5 rounded select-all break-all">
                  {boutique.webhookKey}
                </code>
              </div>
              <p className="text-xs text-red-600 mt-1.5">
                ⚠️ Cette clé donne accès à votre CRM. Ne la partagez qu&apos;avec le vendeur autorisé.
              </p>
            </div>
          </div>
        </div>

        {/* Exemple curl */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Tester l&apos;envoi d&apos;une commande (curl)</h2>
          <p className="text-sm text-slate-600 mb-3">
            Ouvrez un terminal et collez cette commande pour simuler une commande venant de la boutique :
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto font-mono">
            {curlExample}
          </pre>
        </div>

        {/* Exemple JS */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Code JavaScript à intégrer côté boutique</h2>
          <p className="text-sm text-slate-600 mb-3">
            À ajouter sur la page de paiement de la boutique, après que le client a validé sa commande COD :
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
            {jsExample}
          </pre>
        </div>

        {/* Format attendu */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Format JSON attendu</h2>
          <p className="text-sm text-slate-600 mb-3">
            Champs obligatoires : <code className="bg-slate-100 px-1.5 py-0.5 rounded">customer.phone</code> et au moins un <code className="bg-slate-100 px-1.5 py-0.5 rounded">item</code>.
            Le <code className="bg-slate-100 px-1.5 py-0.5 rounded">externalRef</code> évite les doublons.
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
            {exampleBody}
          </pre>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/boutiques/nouvelle"
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg"
          >
            + Créer une autre boutique
          </Link>
          <Link
            href="/boutiques"
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-lg"
          >
            Voir toutes les boutiques
          </Link>
        </div>
      </div>
    </div>
  );
}
