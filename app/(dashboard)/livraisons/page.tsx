import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { updateDeliveryStatusAction } from "./actions";
import { ReturnButton } from "./ReturnButton";
import { MapPin, Phone, Package, CheckCircle, Truck, Clock, TrendingUp, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-sky-100 text-sky-700",
  LIVRE: "bg-emerald-100 text-emerald-700",
  RETOURNE: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "À livrer",
  LIVRE: "Livré",
  RETOURNE: "Retourné",
};

export default async function LivraisonsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.name ?? "";

  if (!can(role, "VIEW_DELIVERIES")) redirect("/");

  const isLivreur = role === "LIVREUR";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deliveries = await prisma.delivery.findMany({
    where: isLivreur ? { livreurId: userId } : undefined,
    include: {
      order: {
        include: {
          customer: true,
          boutique: true,
          city: true,
          items: { include: { product: true } },
        },
      },
      livreur: true,
      city: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = deliveries.filter((d) => d.status === "ASSIGNED");
  const done = deliveries.filter((d) => d.status !== "ASSIGNED");
  const livreesToday = done.filter((d) => d.status === "LIVRE" && d.deliveredAt && new Date(d.deliveredAt) >= today);
  const retournesToday = done.filter((d) => d.status === "RETOURNE" && d.updatedAt && new Date(d.updatedAt) >= today);
  const caToday = livreesToday.reduce((s, d) => s + (d.amountCollected ?? 0), 0);
  const totalDone = done.filter((d) => d.status === "LIVRE").length;
  const totalRetourne = done.filter((d) => d.status === "RETOURNE").length;
  const livraisonRate = totalDone + totalRetourne > 0
    ? Math.round((totalDone / (totalDone + totalRetourne)) * 100)
    : null;

  return (
    <div>
      <PageHeader
        title={isLivreur ? "Mes livraisons" : "Livraisons"}
        badges={[
          { label: `${pending.length} à livrer`, color: "bg-sky-600 text-white" },
          { label: `${done.length} terminées`, color: "bg-slate-700 text-white" },
        ]}
      />
      <div className="p-6 space-y-6">

        {/* Stats livreur du jour */}
        {isLivreur && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-xl p-4 shadow-sm">
              <Truck className="w-6 h-6 opacity-80 mb-2" />
              <div className="text-2xl font-black">{pending.length}</div>
              <div className="text-xs opacity-90 mt-1">En attente</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow-sm">
              <CheckCircle className="w-6 h-6 opacity-80 mb-2" />
              <div className="text-2xl font-black">{livreesToday.length}</div>
              <div className="text-xs opacity-90 mt-1">Livrées aujourd'hui</div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-sm">
              <RotateCcw className="w-6 h-6 opacity-80 mb-2" />
              <div className="text-2xl font-black">{retournesToday.length}</div>
              <div className="text-xs opacity-90 mt-1">Retours aujourd'hui</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-4 shadow-sm">
              <TrendingUp className="w-6 h-6 opacity-80 mb-2" />
              <div className="text-lg font-black">{formatGNF(caToday)}</div>
              <div className="text-xs opacity-90 mt-1">CA collecté</div>
            </div>
          </div>
        )}

        {/* Stats manager */}
        {!isLivreur && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <Truck className="w-8 h-8 text-sky-500" />
              <div>
                <div className="text-xs text-slate-500">En cours</div>
                <div className="text-2xl font-bold">{pending.length}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div>
                <div className="text-xs text-slate-500">Livrées</div>
                <div className="text-2xl font-bold">{totalDone}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <RotateCcw className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-xs text-slate-500">Retours</div>
                <div className="text-2xl font-bold">{totalRetourne}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-xs text-slate-500">Taux livraison</div>
                <div className="text-2xl font-bold">{livraisonRate !== null ? `${livraisonRate}%` : "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Livraisons en attente */}
        {pending.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500">
            <Truck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Aucune livraison en attente</p>
            {isLivreur && <p className="text-sm mt-1 text-slate-400">Le superviseur vous affectera bientôt des commandes.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500" /> À livrer ({pending.length})
            </h2>
            {pending.map((d) => (
              <DeliveryCard key={d.id} delivery={d} isLivreur={isLivreur} />
            ))}
          </div>
        )}

        {/* Historique */}
        {done.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Historique ({done.length})
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Commande</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Ville</th>
                    {!isLivreur && <th className="px-4 py-3 text-left">Livreur</th>}
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {done.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{d.order.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{d.order.customer?.fullName}</div>
                        <div className="text-xs text-slate-500">{d.order.customer?.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.order.city?.name ?? "—"}</td>
                      {!isLivreur && (
                        <td className="px-4 py-3 text-slate-600">
                          {d.livreur ? `${d.livreur.firstName} ${d.livreur.lastName}` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatGNF(d.order.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[d.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[d.status] ?? d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryCard({ delivery, isLivreur }: { delivery: any; isLivreur: boolean }) {
  const order = delivery.order;
  const customer = order.customer;
  const items = order.items;

  return (
    <div className="bg-white border-2 border-sky-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-50 to-sky-100 px-5 py-3 flex items-center justify-between border-b border-sky-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-800 font-mono text-sm">{order.code}</div>
            <div className="text-xs text-sky-600 font-semibold">{order.boutique?.name}</div>
          </div>
          <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full font-semibold ml-1">À livrer</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-emerald-600">{formatGNF(order.totalAmount)}</div>
          <div className="text-xs text-slate-500">à encaisser</div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Infos client */}
        <div className="space-y-3">
          {/* Client */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1.5">👤 Destinataire</div>
            <div className="font-bold text-slate-800 text-base">{customer?.fullName}</div>
            <div className="text-sm text-slate-600 mt-0.5">{customer?.phone}</div>
          </div>

          {/* Adresse */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />Adresse de livraison
            </div>
            <div className="text-sm font-semibold text-sky-700">{order.city?.name ?? delivery.city?.name ?? "Ville non précisée"}</div>
            {customer?.address && <div className="text-sm text-slate-600 mt-0.5">{customer.address}</div>}
          </div>

          {/* Boutons contact */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:+${customer?.phone}`}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-3 py-2.5 rounded-lg transition"
            >
              <Phone className="w-4 h-4" /> Appeler
            </a>
            <a
              href={`https://wa.me/${customer?.phone}?text=${encodeURIComponent(
                `Bonjour ${customer?.fullName}, je suis votre livreur HelpMeProcess. Je serai chez vous bientôt pour déposer votre commande ${order.code}. Montant à préparer : ${Math.round(order.totalAmount).toLocaleString("fr-FR")} GNF. Merci !`
              )}`}
              target="_blank"
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-bold px-3 py-2.5 rounded-lg transition"
            >
              <svg fill="white" viewBox="0 0 24 24" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* Produits */}
        <div>
          <div className="text-xs text-slate-400 uppercase font-semibold mb-2 flex items-center gap-1">
            <Package className="w-3 h-3" /> Produits à remettre
          </div>
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                <div className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate pr-2">
                  {item.product?.name}
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0 text-right">
                  <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-xs">×{item.quantity}</span>
                  <div className="mt-0.5 font-semibold">{formatGNF(item.subtotal)}</div>
                </div>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <span className="text-base">📝</span>
              <span>{order.notes}</span>
            </div>
          )}
          {!isLivreur && delivery.livreur && (
            <div className="mt-3 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 text-xs text-sky-700 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5" />
              Livreur : <span className="font-bold">{delivery.livreur.firstName} {delivery.livreur.lastName}</span>
            </div>
          )}
          {delivery.notes && (
            <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700 flex items-start gap-2">
              <span>📋</span> {delivery.notes}
            </div>
          )}
        </div>
      </div>

      {/* Actions livreur */}
      {isLivreur && (
        <div className="border-t-2 border-slate-100 px-5 py-4 bg-slate-50">
          <div className="text-xs text-slate-500 font-semibold uppercase mb-3 text-center">
            La commande a-t-elle été remise au client ?
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <form action={updateDeliveryStatusAction} className="flex-1">
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value="LIVRE" />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold px-4 py-3.5 rounded-xl transition text-sm shadow-sm"
              >
                <CheckCircle className="w-5 h-5" /> Oui — Livraison effectuée ✅
              </button>
            </form>
            <ReturnButton deliveryId={delivery.id} orderId={order.id} />
          </div>
        </div>
      )}
    </div>
  );
}
