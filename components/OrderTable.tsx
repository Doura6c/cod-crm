"use client";

import Link from "next/link";
import { Edit, Printer, Trash2, Check, Copy } from "lucide-react";
import { formatGNF, formatDateTime, statusBadge } from "@/lib/utils";

// Génère une couleur déterministe à partir du nom de la boutique
function boutiquePalette(name: string): { bg: string; text: string; border: string } {
  const palettes = [
    { bg: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-200" },
    { bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200" },
    { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
    { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200" },
    { bg: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-200" },
    { bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200" },
    { bg: "bg-teal-100",    text: "text-teal-700",    border: "border-teal-200" },
    { bg: "bg-indigo-100",  text: "text-indigo-700",  border: "border-indigo-200" },
  ];
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function BoutiqueBadge({ name }: { name: string }) {
  const { bg, text, border } = boutiquePalette(name);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-semibold ${bg} ${text} ${border}`}>
      <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-black">
        {initials}
      </span>
      <span className="truncate max-w-[90px]">{name}</span>
    </div>
  );
}

type Order = {
  id: string;
  code: string;
  boutique: { name: string };
  customer: { fullName: string; phone: string; address?: string | null };
  city?: { name: string } | null;
  items: { quantity: number; product: { name: string } }[];
  totalAmount: number;
  status: string;
  subStatus?: string | null;
  notes?: string | null;
  callCount: number;
  assignedAgent?: { firstName: string; lastName: string } | null;
  createdAt: Date;
  updatedAt: Date;
  reportDate?: Date | null;
};

export function OrderTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
        Aucune commande à afficher.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 text-left w-8">
                <input type="checkbox" />
              </th>
              <th className="px-3 py-3 text-left font-semibold">Appel direct</th>
              <th className="px-3 py-3 text-left font-semibold">Client</th>
              <th className="px-3 py-3 text-left font-semibold">Produits</th>
              <th className="px-3 py-3 text-left font-semibold">Prix</th>
              <th className="px-3 py-3 text-left font-semibold">État</th>
              <th className="px-3 py-3 text-left font-semibold">Note</th>
              <th className="px-3 py-3 text-left font-semibold">Boutique</th>
              <th className="px-3 py-3 text-left font-semibold">Date</th>
              <th className="px-3 py-3 text-center font-semibold">Valider</th>
              <th className="px-3 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => {
              const badge = statusBadge(o.status);
              return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <input type="checkbox" data-order-id={o.id} />
                  </td>
                  <td className="px-3 py-3">
                    <a
                      href={`tel:${o.customer.phone}`}
                      className="inline-flex items-center gap-1 text-sky-600 hover:underline font-semibold text-sm"
                      title="Appeler"
                    >
                      📞 {o.customer.phone}
                    </a>
                  </td>
                  <td className="px-3 py-3 max-w-[180px]">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs font-semibold text-slate-700">{o.code}</span>
                      <button className="text-slate-400 hover:text-slate-600" aria-label="Copier le code">
                        <Copy className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="font-medium text-slate-800 mt-1">{o.customer.fullName}</div>
                    <div className="text-xs text-slate-600">{o.customer.phone}</div>
                    {o.customer.address && (
                      <div className="text-xs text-slate-500 truncate">{o.customer.address}</div>
                    )}
                    {o.city && <div className="text-xs text-slate-500">{o.city.name}</div>}
                  </td>
                  <td className="px-3 py-3 max-w-[220px]">
                    {o.items.map((it, i) => (
                      <div key={i} className="text-xs text-slate-700 leading-snug">
                        {it.product.name} x {it.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-800">
                    {formatGNF(o.totalAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`badge ${badge.color}`}>{badge.label}</span>
                    {o.reportDate && (
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDateTime(o.reportDate)}
                      </div>
                    )}
                    {o.callCount > 0 && (
                      <div className="text-xs text-slate-600 mt-1 font-medium">
                        {o.callCount} appel{o.callCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 max-w-[160px]">
                    {o.assignedAgent && (
                      <div className="text-xs font-medium text-slate-700">
                        {o.assignedAgent.firstName} {o.assignedAgent.lastName}
                      </div>
                    )}
                    {o.notes && <div className="text-xs text-slate-500 mt-0.5">{o.notes}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <BoutiqueBadge name={o.boutique.name} />
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="text-slate-600">
                      <span className="font-semibold">Ajout:</span> {formatDateTime(o.createdAt)}
                    </div>
                    <div className="text-slate-600 mt-1">
                      <span className="font-semibold">MAJ:</span> {formatDateTime(o.updatedAt)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {o.status === "NOUVEAU" && (
                      <form action={`/api/orders/${o.id}/validate`} method="POST">
                        <button
                          className="inline-flex items-center justify-center w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition"
                          aria-label="Valider la commande"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/commandes/${o.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded"
                        aria-label="Éditer la commande"
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </Link>
                      <button className="inline-flex items-center justify-center w-8 h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded" aria-label="Imprimer la commande">
                        <Printer className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button className="inline-flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded" aria-label="Supprimer la commande">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
