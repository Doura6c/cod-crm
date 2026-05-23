"use client";

import { Printer } from "lucide-react";
import { formatGNF } from "@/lib/utils";

type Order = {
  code: string;
  customerName: string;
  city: string;
  items: { name: string; qty: number; price: number }[];
  totalAmount: number;
  deliveryFee: number;
  deliveredAt: Date | null;
};

type Summary = {
  totalCollecte: number;
  fraisHMP: number;
  montantAVirer: number;
  retours: number;
};

export function ReglementPrint({
  boutique,
  period,
  orders,
  summary,
  hmpFee = 70000,
}: {
  boutique: { name: string; sellerName: string };
  period: string;
  orders: Order[];
  summary: Summary;
  hmpFee?: number;
}) {
  function print() {
    const win = window.open("", "_blank");
    if (!win) return;

    const rows = orders.map((o) => {
      const prodAmount = o.totalAmount - o.deliveryFee;
      const net = prodAmount - hmpFee;
      const date = o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString("fr-FR") : "—";
      return `
        <tr>
          <td>${o.code}</td>
          <td>${o.customerName}<br/><small>${o.city}</small></td>
          <td>${o.items.map((it) => `${it.name} ×${it.qty}`).join("<br/>")}</td>
          <td style="text-align:right">${Math.round(prodAmount).toLocaleString("fr-FR")} GNF</td>
          <td style="text-align:right;color:#dc2626">−${Math.round(hmpFee).toLocaleString("fr-FR")} GNF</td>
          <td style="text-align:right;font-weight:700;color:#059669">${Math.max(0, Math.round(net)).toLocaleString("fr-FR")} GNF</td>
          <td style="text-align:center">${date}</td>
        </tr>`;
    }).join("");

    win.document.write(`
      <html><head><title>Règlement ${boutique.name} — ${period}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0f172a; }
        .logo { font-size: 18px; font-weight: 900; color: #0f172a; }
        .logo span { color: #0ea5e9; }
        .title { font-size: 14px; color: #64748b; margin-top: 4px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .kpi-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
        .kpi-value { font-size: 16px; font-weight: 900; }
        .kpi-virer { border-color: #34d399; background: #f0fdf4; }
        .kpi-virer .kpi-value { color: #059669; }
        .kpi-frais .kpi-value { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        tfoot td { background: #f8fafc; font-weight: 700; border-top: 2px solid #e2e8f0; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <div class="header">
        <div>
          <div class="logo">HelpMe<span>Process</span> COD</div>
          <div class="title">Règlement marchand — ${period}</div>
          <div style="margin-top:8px">
            <strong>${boutique.name}</strong> · ${boutique.sellerName}<br/>
            <small style="color:#94a3b8">Généré le ${new Date().toLocaleDateString("fr-FR")}</small>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:900;color:#059669">${Math.round(summary.montantAVirer).toLocaleString("fr-FR")} GNF</div>
          <div style="font-size:12px;color:#64748b">Montant à virer</div>
        </div>
      </div>

      <div class="summary">
        <div class="kpi">
          <div class="kpi-label">Commandes livrées</div>
          <div class="kpi-value">${orders.length}</div>
          <div style="font-size:11px;color:#ef4444;margin-top:2px">${summary.retours} retour(s)</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Total collecté clients</div>
          <div class="kpi-value">${Math.round(summary.totalCollecte).toLocaleString("fr-FR")} GNF</div>
        </div>
        <div class="kpi kpi-frais">
          <div class="kpi-label">Frais HelpMeProcess</div>
          <div class="kpi-value">−${Math.round(summary.fraisHMP).toLocaleString("fr-FR")} GNF</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${Math.round(hmpFee).toLocaleString("fr-FR")} × ${orders.length}</div>
        </div>
        <div class="kpi kpi-virer">
          <div class="kpi-label">À virer au marchand</div>
          <div class="kpi-value">${Math.round(summary.montantAVirer).toLocaleString("fr-FR")} GNF</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Commande</th><th>Client / Ville</th><th>Produits</th>
            <th style="text-align:right">Montant produits</th>
            <th style="text-align:right">Frais HMP</th>
            <th style="text-align:right">Net marchand</th>
            <th style="text-align:center">Date livraison</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">TOTAUX (${orders.length} commandes)</td>
            <td style="text-align:right">${Math.round(summary.totalCollecte).toLocaleString("fr-FR")} GNF</td>
            <td style="text-align:right;color:#dc2626">−${Math.round(summary.fraisHMP).toLocaleString("fr-FR")} GNF</td>
            <td style="text-align:right;color:#059669">${Math.round(summary.montantAVirer).toLocaleString("fr-FR")} GNF</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <div>HelpMeProcess COD Manager · helpmeprocess.gn</div>
        <div>Document généré automatiquement — ${new Date().toLocaleString("fr-FR")}</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <button
      onClick={print}
      className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
    >
      <Printer className="w-4 h-4" /> Imprimer le règlement
    </button>
  );
}
