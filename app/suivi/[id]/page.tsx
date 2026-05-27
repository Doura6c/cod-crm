import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatGNF } from "@/lib/utils";
import { Package, MapPin, Phone, CheckCircle, Clock, Truck, XCircle, RotateCcw, AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Étapes du parcours commande
const STEPS = [
  { key: "NOUVEAU",       label: "Commande reçue",      icon: Package,      color: "text-blue-600",    bg: "bg-blue-100" },
  { key: "CONFIRME",      label: "Confirmée",            icon: CheckCircle,  color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "EN_LIVRAISON",  label: "En cours de livraison",icon: Truck,        color: "text-sky-600",     bg: "bg-sky-100" },
  { key: "LIVRE",         label: "Livrée ✓",             icon: CheckCircle,  color: "text-green-600",   bg: "bg-green-100" },
];

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; icon: any; desc: string }> = {
  NOUVEAU:      { label: "Reçue",           color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: Package,      desc: "Votre commande a été reçue et est en attente de confirmation." },
  REPORTE:      { label: "Rappel prévu",    color: "text-purple-700", bg: "bg-purple-50 border-purple-200",icon: Clock,        desc: "Notre équipe vous rappellera prochainement pour confirmer votre commande." },
  PDR:          { label: "En attente",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: Clock,        desc: "Nous essayons de vous joindre pour confirmer votre commande." },
  INJOIGNABLE:  { label: "Injoignable",     color: "text-slate-700",  bg: "bg-slate-50 border-slate-200",  icon: Phone,        desc: "Nous n'avons pas pu vous joindre. Veuillez nous rappeler pour confirmer." },
  CONFIRME:     { label: "Confirmée",       color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",icon: CheckCircle,  desc: "Votre commande est confirmée et sera bientôt envoyée en livraison." },
  EN_LIVRAISON: { label: "En livraison",    color: "text-sky-700",    bg: "bg-sky-50 border-sky-200",      icon: Truck,        desc: "Votre commande est en route ! Le livreur se dirige vers vous." },
  LIVRE:        { label: "Livrée",          color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: CheckCircle,  desc: "Votre commande a été livrée avec succès. Merci pour votre achat !" },
  ANNULE:       { label: "Annulée",         color: "text-red-700",    bg: "bg-red-50 border-red-200",      icon: XCircle,      desc: "Cette commande a été annulée." },
  RETOURNE:     { label: "Retournée",       color: "text-rose-700",   bg: "bg-rose-50 border-rose-200",    icon: RotateCcw,    desc: "Le livreur n'a pas pu vous livrer. Veuillez nous contacter pour reprogrammer." },
};

function getStepIndex(status: string): number {
  if (["ANNULE", "RETOURNE"].includes(status)) return -1;
  const keys = STEPS.map((s) => s.key);
  const idx = keys.indexOf(status);
  if (idx !== -1) return idx;
  // REPORTE, PDR, INJOIGNABLE → step 0 (reçue)
  return 0;
}

export default async function SuiviDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      boutique: true,
      city: true,
      items: { include: { product: true } },
      delivery: { include: { livreur: { select: { firstName: true, lastName: true, phone: true } } } },
    },
  });

  if (!order) notFound();

  const statusInfo = STATUS_INFO[order.status] ?? STATUS_INFO.NOUVEAU;
  const StatusIcon = statusInfo.icon;
  const stepIdx = getStepIndex(order.status);
  const isTerminal = ["ANNULE", "RETOURNE"].includes(order.status);
  const isLivre = order.status === "LIVRE";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shadow-lg flex-shrink-0">
              <img src="/logo.jpeg" alt="HelpMeProcess" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">{order.boutique.name}</div>
              <div className="text-sky-200 text-xs">Suivi de commande</div>
            </div>
          </div>
          <div className="text-2xl font-black">{order.code}</div>
          <div className="text-sky-200 text-sm mt-1">
            Commandé le {order.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Statut actuel */}
        <div className={`border-2 rounded-2xl p-5 ${statusInfo.bg}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isLivre ? "bg-green-500" : isTerminal ? "bg-red-100" : "bg-white shadow"}`}>
              <StatusIcon className={`w-6 h-6 ${isLivre ? "text-white" : statusInfo.color}`} />
            </div>
            <div>
              <div className={`text-xl font-black ${statusInfo.color}`}>{statusInfo.label}</div>
              <div className="text-slate-600 text-sm mt-1">{statusInfo.desc}</div>
              {order.reportDate && order.status === "REPORTE" && (
                <div className="mt-2 text-sm font-semibold text-purple-700 bg-purple-100 inline-block px-3 py-1 rounded-full">
                  📅 Rappel prévu : {order.reportDate.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        {!isTerminal && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-4">Progression</div>
            <div className="flex items-center gap-1">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const done = i <= stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        done ? (current ? "bg-sky-600 ring-4 ring-sky-100" : "bg-emerald-500") : "bg-slate-200"
                      }`}>
                        <StepIcon className={`w-4 h-4 ${done ? "text-white" : "text-slate-400"}`} />
                      </div>
                      <div className={`text-[10px] font-semibold mt-1.5 text-center leading-tight max-w-[60px] ${done ? "text-slate-700" : "text-slate-400"}`}>
                        {step.label}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 rounded-full mb-5 ${i < stepIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Livreur info — si en livraison */}
        {order.status === "EN_LIVRAISON" && order.delivery?.livreur && (
          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sky-800 text-sm">Votre livreur</div>
              <div className="font-black text-slate-800">{order.delivery.livreur.firstName} {order.delivery.livreur.lastName}</div>
            </div>
            {order.delivery.livreur.phone && (
              <a
                href={`tel:${order.delivery.livreur.phone}`}
                className="bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-sky-700 transition"
              >
                <Phone className="w-4 h-4" /> Appeler
              </a>
            )}
          </div>
        )}

        {/* Produits */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700 text-sm">Votre commande</span>
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{item.product.name}</div>
                  <div className="text-xs text-slate-500">Quantité : {item.quantity}</div>
                </div>
                <div className="font-bold text-slate-700">{formatGNF(item.subtotal)}</div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">Total</span>
            <span className="text-lg font-black text-emerald-600">{formatGNF(order.totalAmount)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="px-5 py-2 bg-slate-50 flex justify-between items-center border-t border-slate-100">
              <span className="text-xs text-slate-500">dont frais de livraison</span>
              <span className="text-xs font-semibold text-slate-600">{formatGNF(order.deliveryFee)}</span>
            </div>
          )}
        </div>

        {/* Adresse de livraison */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700 text-sm">Adresse de livraison</span>
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div className="font-semibold">{order.customer.fullName}</div>
            {order.city && <div>📍 {order.city.name}</div>}
            {order.customer.commune && <div>{order.customer.commune}</div>}
            {order.customer.address && <div>{order.customer.address}</div>}
          </div>
          {order.city?.estimatedDays && !isLivre && !isTerminal && (
            <div className="mt-3 text-xs text-sky-700 bg-sky-50 px-3 py-2 rounded-lg font-semibold">
              🚚 Délai estimé : {order.city.estimatedDays} jour{order.city.estimatedDays > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Injoignable — CTA appeler */}
        {["INJOIGNABLE", "PDR"].includes(order.status) && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-center">
            <div className="text-amber-800 font-bold mb-2">📞 Nous n&apos;avons pas pu vous joindre</div>
            <p className="text-sm text-amber-700 mb-4">
              Appelez-nous pour confirmer votre commande et éviter l&apos;annulation.
            </p>
            <a
              href={`https://wa.me/${order.boutique.sellerPhone ?? ""}`}
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da950] text-white font-bold px-5 py-3 rounded-xl transition"
            >
              💬 Contacter sur WhatsApp
            </a>
          </div>
        )}

        {/* Livré — message de remerciement */}
        {isLivre && (
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-center text-white shadow-lg">
            <div className="text-4xl mb-3">🎉</div>
            <div className="text-xl font-black mb-1">Merci pour votre achat !</div>
            <div className="text-emerald-100 text-sm">
              Votre commande a été livrée avec succès. Nous espérons vous revoir bientôt.
            </div>
          </div>
        )}

        {/* Retourner à la recherche */}
        <div className="text-center pt-2">
          <Link
            href="/suivi"
            className="text-sm text-slate-500 hover:text-sky-600 underline transition"
          >
            ← Suivre une autre commande
          </Link>
        </div>

      </div>
    </div>
  );
}
