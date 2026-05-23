import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDateTime, statusBadge } from "@/lib/utils";
import { logCallAction, assignDeliveryAction, reassignAgentAction } from "./actions";
import {
  Phone,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Calendar,
  User,
  Store,
  FileText,
  PhoneCall,
  Truck,
  MessageCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  ANSWERED: { label: "Répondu", color: "bg-emerald-100 text-emerald-700" },
  NO_ANSWER: { label: "Pas de réponse", color: "bg-amber-100 text-amber-700" },
  BUSY: { label: "Occupé", color: "bg-orange-100 text-orange-700" },
  REPORTED: { label: "Reporté", color: "bg-purple-100 text-purple-700" },
  CONFIRMED: { label: "Confirmé", color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700" },
  INJOIGNABLE: { label: "Injoignable", color: "bg-slate-200 text-slate-700" },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  const canAssignDelivery = can(userRole, "ASSIGN_DELIVERY");
  const canReassignAgent = userRole === "ADMIN" || userRole === "MANAGER";

  const [order, livreurs, agentsList] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        boutique: true,
        customer: { include: { city: true } },
        city: true,
        items: { include: { product: true } },
        assignedAgent: true,
        validatedBy: true,
        delivery: { include: { livreur: true } },
        invoice: true,
        callLogs: { include: { agent: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    canAssignDelivery
      ? prisma.user.findMany({ where: { role: "LIVREUR" }, orderBy: { firstName: "asc" } })
      : Promise.resolve([]),
    canReassignAgent
      ? prisma.user.findMany({ where: { role: "AGENT", active: true }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } })
      : Promise.resolve([]),
  ]);

  if (!order) notFound();

  // Si AGENT, vérifier que la commande lui est affectée
  if (userRole === "AGENT" && order.assignedAgentId !== userId) {
    redirect("/commandes/confirmation");
  }

  const badge = statusBadge(order.status);

  return (
    <div>
      <PageHeader
        title={`Commande ${order.code}`}
        badges={[badge]}
        actions={
          <Link
            href="/commandes/confirmation"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        }
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Infos client */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Client destinataire
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Nom complet</div>
                <div className="font-semibold text-slate-800">{order.customer.fullName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Téléphone</div>
                <a href={`tel:${order.customer.phone}`} className="inline-flex items-center gap-1 text-sky-600 hover:underline font-semibold">
                  <Phone className="w-3.5 h-3.5" /> {order.customer.phone}
                </a>
                {order.customer.altPhone && (
                  <div className="text-xs text-slate-600 mt-0.5">Alt : {order.customer.altPhone}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500">Ville</div>
                <div className="text-slate-800">{order.city?.name ?? order.customer.city?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Commune</div>
                <div className="text-slate-800">{order.customer.commune ?? "—"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500">Adresse</div>
                <div className="text-slate-800 inline-flex items-center gap-1">
                  {order.customer.address && <MapPin className="w-3.5 h-3.5 text-slate-400" />}
                  {order.customer.address ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Produits commandés
            </h2>
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase">
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-semibold">SKU</th>
                  <th className="text-left py-2 font-semibold">Produit</th>
                  <th className="text-right py-2 font-semibold">Qté</th>
                  <th className="text-right py-2 font-semibold">PU</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 font-mono text-xs text-slate-600">{it.product.sku}</td>
                    <td className="py-2.5 text-slate-800">{it.product.name}</td>
                    <td className="py-2.5 text-right font-semibold">{it.quantity}</td>
                    <td className="py-2.5 text-right text-slate-600">{formatGNF(it.unitPrice)}</td>
                    <td className="py-2.5 text-right font-semibold">{formatGNF(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-2 text-right text-slate-600">Sous-total</td>
                  <td className="py-2 text-right font-semibold">{formatGNF(order.totalAmount - order.deliveryFee)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-1 text-right text-slate-600">Livraison</td>
                  <td className="py-1 text-right text-slate-600">{formatGNF(order.deliveryFee)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-2 text-right font-bold text-slate-800">TOTAL</td>
                  <td className="py-2 text-right font-bold text-emerald-600 text-base">{formatGNF(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Call log + form */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <PhoneCall className="w-4 h-4" /> Historique des appels ({order.callLogs.length})
            </h2>

            {/* Formulaire nouvel appel */}
            <form action={logCallAction} className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Résultat de l&apos;appel</label>
                  <select name="outcome" required defaultValue="ANSWERED" className="input">
                    <option value="ANSWERED">Client a répondu</option>
                    <option value="NO_ANSWER">Pas de réponse</option>
                    <option value="BUSY">Occupé</option>
                    <option value="INJOIGNABLE">Injoignable</option>
                    <option value="REPORTED">À reporter</option>
                    <option value="CONFIRMED">✓ Confirmé — valider la commande</option>
                    <option value="CANCELLED">✗ Annulé par client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Si reporté, date de rappel</label>
                  <input type="datetime-local" name="reportDate" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Ex: Client demande livraison demain matin"
                  className="input resize-none"
                />
              </div>
              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                Enregistrer l&apos;appel
              </button>
            </form>

            {/* Liste des appels */}
            {order.callLogs.length === 0 ? (
              <div className="text-center text-slate-500 py-6 text-sm">
                Aucun appel enregistré.
              </div>
            ) : (
              <div className="space-y-2">
                {order.callLogs.map((c) => {
                  const out = OUTCOME_LABELS[c.outcome] ?? { label: c.outcome, color: "bg-slate-100" };
                  return (
                    <div key={c.id} className="border border-slate-200 rounded p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${out.color}`}>{out.label}</span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(c.createdAt)} — {c.agent.firstName} {c.agent.lastName}
                        </span>
                      </div>
                      {c.note && <div className="text-slate-700 text-sm mt-1">{c.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Méta */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Informations
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Code</dt>
                <dd className="font-mono font-semibold text-slate-800">{order.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 flex items-center gap-1"><Store className="w-3 h-3" /> Boutique</dt>
                <dd className="text-slate-800">{order.boutique.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date de création</dt>
                <dd className="text-slate-800">{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Source</dt>
                <dd>
                  <span className="badge bg-slate-100 text-slate-700">{order.source}</span>
                  {order.externalRef && (
                    <span className="text-xs text-slate-500 ml-1">({order.externalRef})</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Agent affecté</dt>
                <dd className="text-slate-800">
                  {order.assignedAgent
                    ? `${order.assignedAgent.firstName} ${order.assignedAgent.lastName}`
                    : <span className="text-amber-600 font-semibold">Non affecté</span>}
                </dd>
              </div>

              {/* Réaffecter / désaffecter — ADMIN & MANAGER uniquement */}
              {canReassignAgent && !["EN_LIVRAISON", "LIVRE", "RETOURNE", "ANNULE"].includes(order.status) && (
                <div className="pt-3 border-t border-slate-100">
                  <dt className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> Changer l&apos;agent
                  </dt>
                  <form action={reassignAgentAction} className="flex gap-2 items-center">
                    <input type="hidden" name="orderId" value={order.id} />
                    <select
                      name="agentId"
                      defaultValue={order.assignedAgentId ?? ""}
                      className="input text-xs py-1.5 flex-1"
                    >
                      <option value="">— Désaffecter —</option>
                      {agentsList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.firstName} {a.lastName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                    >
                      Valider
                    </button>
                  </form>
                </div>
              )}
              {order.validatedBy && (
                <div>
                  <dt className="text-xs text-slate-500">Validée par</dt>
                  <dd className="text-slate-800">
                    {order.validatedBy.firstName} {order.validatedBy.lastName}
                    <div className="text-xs text-slate-500">{formatDateTime(order.validatedAt)}</div>
                  </dd>
                </div>
              )}
              {order.reportDate && (
                <div>
                  <dt className="text-xs text-slate-500">Rappel prévu</dt>
                  <dd className="text-slate-800 font-semibold">{formatDateTime(order.reportDate)}</dd>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <dt className="text-xs text-slate-500">Nombre d&apos;appels</dt>
                <dd className="text-lg font-bold text-sky-600">{order.callCount}</dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-amber-800 uppercase mb-1">Note</div>
              <div className="text-sm text-amber-900">{order.notes}</div>
            </div>
          )}

          {/* Raccourcis contact */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Contact rapide</div>
            <a
              href={`tel:${order.customer.phone}`}
              className="flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-2 rounded-lg transition"
            >
              <Phone className="w-4 h-4" /> Appeler {order.customer.phone}
            </a>
            <a
              href={`https://wa.me/${order.customer.phone}?text=${encodeURIComponent(
                `Bonjour ${order.customer.fullName}, nous vous contactons concernant votre commande ${order.code} passée sur notre boutique. Pouvez-vous nous confirmer votre commande ? Merci !`
              )}`}
              target="_blank"
              className="flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-sm font-semibold px-3 py-2 rounded-lg transition"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp — confirmation
            </a>
            {order.status === "INJOIGNABLE" && (
              <a
                href={`https://wa.me/${order.customer.phone}?text=${encodeURIComponent(
                  `Bonjour ${order.customer.fullName}, nous n'avons pas pu vous joindre pour votre commande ${order.code}. Merci de nous rappeler ou de répondre à ce message pour confirmer. Merci !`
                )}`}
                target="_blank"
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg transition"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp — injoignable
              </a>
            )}
          </div>

          {/* Affecter à un livreur */}
          {canAssignDelivery && order.status === "CONFIRME" && (
            <div className="bg-white border-2 border-emerald-200 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-emerald-700 uppercase mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Affecter à un livreur
              </h2>
              {livreurs.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun livreur disponible. <Link href="/equipe" className="text-sky-600 underline">Créer un livreur</Link></p>
              ) : (
                <form action={assignDeliveryAction} className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Livreur</label>
                    <select name="livreurId" required className="input">
                      <option value="">— Sélectionner —</option>
                      {livreurs.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.firstName} {l.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions (optionnel)</label>
                    <textarea name="notes" rows={2} placeholder="Ex: Livrer le matin avant 10h" className="input resize-none" />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" /> Envoyer en livraison
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Livraison */}
          {order.delivery && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Livraison
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Statut</dt>
                  <dd>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                      order.delivery.status === "LIVRE" ? "bg-emerald-100 text-emerald-700" :
                      order.delivery.status === "RETOURNE" ? "bg-red-100 text-red-700" :
                      "bg-sky-100 text-sky-700"
                    }`}>
                      {order.delivery.status === "LIVRE" ? "Livré" :
                       order.delivery.status === "RETOURNE" ? "Retourné" : "À livrer"}
                    </span>
                  </dd>
                </div>
                {order.delivery.livreur && (
                  <div>
                    <dt className="text-xs text-slate-500">Livreur</dt>
                    <dd className="text-slate-800 font-medium">
                      {order.delivery.livreur.firstName} {order.delivery.livreur.lastName}
                    </dd>
                  </div>
                )}
                {order.delivery.notes && (
                  <div>
                    <dt className="text-xs text-slate-500">Instructions</dt>
                    <dd className="text-slate-700 text-xs">{order.delivery.notes}</dd>
                  </div>
                )}
                {order.delivery.deliveredAt && (
                  <div>
                    <dt className="text-xs text-slate-500">Livré le</dt>
                    <dd className="text-slate-800">{formatDateTime(order.delivery.deliveredAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
