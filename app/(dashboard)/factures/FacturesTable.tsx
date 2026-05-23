"use client";

import { useState } from "react";
import { formatGNF, formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Printer } from "lucide-react";

type InvoiceRow = {
  id: string;
  reference: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  order: {
    code: string;
    customer: { fullName: string; phone: string; address?: string | null };
    boutique: { name: string };
    city?: { name: string } | null;
    items: { id: string; quantity: number; unitPrice: number; subtotal: number; product: { name: string; sku: string } }[];
  };
};

const STATUS_STYLE: Record<string, string> = {
  PAYEE: "bg-emerald-100 text-emerald-700",
  EMISE: "bg-amber-100 text-amber-700",
  ANNULEE: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  PAYEE: "Payée",
  EMISE: "Émise",
  ANNULEE: "Annulée",
};

export function FacturesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function printInvoice(inv: InvoiceRow) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Facture ${inv.reference}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
        h1 { font-size: 20px; margin: 0; }
        .ref { color: #64748b; font-size: 14px; margin-top: 4px; }
        .info { margin: 24px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .total-row td { font-weight: 700; border-top: 2px solid #e2e8f0; background: #f8fafc; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #d1fae5; color: #065f46; }
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1>HelpMeProcess COD</h1>
          <div class="ref">Facture : <strong>${inv.reference}</strong></div>
          <div class="ref">Date : ${formatDate(inv.createdAt)}</div>
        </div>
        <div class="badge">${STATUS_LABEL[inv.status] ?? inv.status}</div>
      </div>
      <div class="info">
        <div>
          <div class="label">Client</div>
          <div style="font-weight:600">${inv.order.customer.fullName}</div>
          <div style="color:#64748b">${inv.order.customer.phone}</div>
          ${inv.order.customer.address ? `<div style="color:#64748b">${inv.order.customer.address}</div>` : ""}
          ${inv.order.city ? `<div style="color:#64748b">${inv.order.city.name}</div>` : ""}
        </div>
        <div>
          <div class="label">Commande</div>
          <div style="font-family:monospace;font-weight:600">${inv.order.code}</div>
          <div style="color:#64748b">${inv.order.boutique.name}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Produit</th><th>SKU</th><th style="text-align:right">Qté</th><th style="text-align:right">PU</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${inv.order.items.map((it) => `
            <tr>
              <td>${it.product.name}</td>
              <td style="font-family:monospace;color:#64748b">${it.product.sku}</td>
              <td style="text-align:right">${it.quantity}</td>
              <td style="text-align:right">${Math.round(it.unitPrice).toLocaleString("fr-FR")} GNF</td>
              <td style="text-align:right;font-weight:600">${Math.round(it.subtotal).toLocaleString("fr-FR")} GNF</td>
            </tr>`).join("")}
          <tr><td colspan="4" style="text-align:right;color:#64748b">Sous-total</td><td style="text-align:right">${Math.round(inv.subtotal).toLocaleString("fr-FR")} GNF</td></tr>
          <tr><td colspan="4" style="text-align:right;color:#64748b">Livraison</td><td style="text-align:right">${Math.round(inv.deliveryFee).toLocaleString("fr-FR")} GNF</td></tr>
        </tbody>
        <tfoot><tr class="total-row"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right">${Math.round(inv.total).toLocaleString("fr-FR")} GNF</td></tr></tfoot>
      </table>
      ${inv.paidAt ? `<p style="margin-top:24px;color:#059669;font-weight:600">✓ Payée le ${formatDate(inv.paidAt)} (paiement à la livraison)</p>` : ""}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
        Aucune facture. Elles sont générées automatiquement à chaque livraison réussie.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
          <tr>
            <th className="px-4 py-3 w-8" />
            <th className="px-4 py-3 text-left">Référence</th>
            <th className="px-4 py-3 text-left">Commande</th>
            <th className="px-4 py-3 text-left">Client</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-center">Statut</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const open = expanded.has(inv.id);
            return (
              <>
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50 cursor-pointer border-t border-slate-100"
                  onClick={() => toggle(inv.id)}
                >
                  <td className="px-4 py-3 text-slate-400">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{inv.reference}</td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-700">{inv.order.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{inv.order.customer.fullName}</div>
                    <div className="text-xs text-slate-500">{inv.order.customer.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{formatGNF(inv.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${STATUS_STYLE[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(inv.createdAt)}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => printInvoice(inv)}
                      className="w-8 h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded inline-flex items-center justify-center"
                      title="Imprimer la facture"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr key={`${inv.id}-detail`} className="bg-slate-50 border-t border-slate-100">
                    <td colSpan={8} className="px-8 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Produits */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Produits</div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-200">
                                <th className="text-left py-1 font-semibold">Produit</th>
                                <th className="text-right py-1 font-semibold">Qté</th>
                                <th className="text-right py-1 font-semibold">PU</th>
                                <th className="text-right py-1 font-semibold">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inv.order.items.map((it) => (
                                <tr key={it.id} className="border-b border-slate-100">
                                  <td className="py-1.5 text-slate-700 font-medium">{it.product.name}</td>
                                  <td className="py-1.5 text-right text-slate-600">{it.quantity}</td>
                                  <td className="py-1.5 text-right text-slate-600">{formatGNF(it.unitPrice)}</td>
                                  <td className="py-1.5 text-right font-semibold">{formatGNF(it.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Récapitulatif */}
                        <div className="space-y-1.5 text-sm">
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Récapitulatif</div>
                          <div className="flex justify-between text-slate-600">
                            <span>Sous-total</span><span>{formatGNF(inv.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Frais de livraison</span><span>{formatGNF(inv.deliveryFee)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5 mt-1.5">
                            <span>TOTAL</span><span className="text-emerald-600">{formatGNF(inv.total)}</span>
                          </div>
                          {inv.paidAt && (
                            <div className="text-xs text-emerald-600 font-semibold pt-1">
                              ✓ Payée le {formatDate(inv.paidAt)}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            Boutique : {inv.order.boutique.name}
                            {inv.order.city && ` · ${inv.order.city.name}`}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
