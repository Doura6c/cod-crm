import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const HMP_FEE = 70_000;

function fmt(n: number) {
  return Math.round(n).toLocaleString("fr-FR") + " GNF";
}
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.merchantInvoice.findUnique({
    where: { id },
    include: {
      boutique: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Récupérer les commandes livrées sur cette période pour le détail
  const deliveries = await prisma.delivery.findMany({
    where: {
      status: "LIVRE",
      order: { boutiqueId: invoice.boutiqueId },
      deliveredAt: {
        gte: invoice.periodStart,
        lte: invoice.periodEnd,
      },
    },
    include: {
      order: {
        include: {
          customer: true,
          city: true,
          items: { include: { product: true } },
        },
      },
    },
    orderBy: { deliveredAt: "asc" },
  });

  const rows = deliveries
    .map((d) => {
      const amount = d.amountCollected ?? d.order.totalAmount;
      const produits = amount - d.order.deliveryFee;
      const net = Math.max(0, produits - HMP_FEE);
      return `
      <tr>
        <td>${d.order.code}</td>
        <td>${d.order.customer.fullName}<br/><small style="color:#64748b">${d.order.city?.name ?? "—"}</small></td>
        <td>${d.order.items.map((it) => `${it.product.name} ×${it.quantity}`).join("<br/>")}</td>
        <td style="text-align:right">${fmt(produits)}</td>
        <td style="text-align:right;color:#dc2626">−${fmt(HMP_FEE)}</td>
        <td style="text-align:right;font-weight:700;color:#059669">${fmt(net)}</td>
        <td style="text-align:center">${fmtDate(d.deliveredAt)}</td>
        ${amount !== d.order.totalAmount ? `<td style="text-align:right;color:#d97706">${fmt(amount)}<br/><small style="color:#94a3b8">prévu: ${fmt(d.order.totalAmount)}</small></td>` : `<td style="text-align:right">${fmt(amount)}</td>`}
      </tr>`;
    })
    .join("");

  const statusBadge =
    invoice.status === "PAYEE"
      ? `<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px">✅ Payée${invoice.paidAt ? ` le ${fmtDate(invoice.paidAt)}` : ""}</span>`
      : invoice.status === "ANNULEE"
      ? `<span style="background:#fee2e2;color:#dc2626;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px">❌ Annulée</span>`
      : `<span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px">⏳ En attente de paiement</span>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Facture Marchand ${invoice.reference}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; padding: 36px; color: #1e293b; font-size: 13px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #0f172a; }
    .logo { font-size: 22px; font-weight: 900; color: #0f172a; }
    .logo span { color: #0ea5e9; }
    .logo-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .ref { font-size: 13px; color: #475569; margin-top: 6px; }
    .net-amount { font-size: 36px; font-weight: 900; color: #059669; }
    .net-label { font-size: 12px; color: #64748b; }
    .merchant-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .info-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 4px; letter-spacing: .05em; }
    .info-val { font-size: 14px; font-weight: 700; color: #1e293b; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }
    .kpi-val { font-size: 18px; font-weight: 900; }
    .kpi.green { border-color: #34d399; background: #f0fdf4; }
    .kpi.green .kpi-val { color: #059669; }
    .kpi.red .kpi-val { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f8fafc; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 12px; }
    tfoot td { background: #f8fafc; font-weight: 700; border-top: 2px solid #e2e8f0; font-size: 13px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">HelpMe<span>Process</span> COD</div>
      <div class="logo-sub">Gestionnaire COD — helpmeprocess.gn</div>
      <div class="ref">Facture Marchand : <strong>${invoice.reference}</strong></div>
      <div class="ref">Générée le ${fmtDate(new Date())}</div>
      <div style="margin-top:12px">${statusBadge}</div>
    </div>
    <div style="text-align:right">
      <div class="net-amount">${fmt(invoice.netMarchand)}</div>
      <div class="net-label">Net à verser au marchand</div>
    </div>
  </div>

  <div class="merchant-box">
    <div>
      <div class="info-label">Commerçant / Boutique</div>
      <div class="info-val">${invoice.boutique.name}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px">${invoice.boutique.sellerName}</div>
      ${invoice.boutique.sellerPhone ? `<div style="color:#64748b;font-size:12px">${invoice.boutique.sellerPhone}</div>` : ""}
    </div>
    <div>
      <div class="info-label">Période de vente</div>
      <div class="info-val">${fmtDate(invoice.periodStart)}</div>
      <div style="color:#64748b;font-size:12px">au ${fmtDate(invoice.periodEnd)}</div>
    </div>
    <div>
      <div class="info-label">Résumé</div>
      <div style="font-size:12px;color:#475569"><strong>${invoice.orderCount}</strong> commandes livrées</div>
      <div style="font-size:12px;color:#475569"><strong>${invoice.productCount}</strong> produits expédiés</div>
    </div>
  </div>

  <div class="summary">
    <div class="kpi">
      <div class="kpi-label">Commandes</div>
      <div class="kpi-val">${invoice.orderCount}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px">${invoice.productCount} produits</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total collecté</div>
      <div class="kpi-val" style="color:#0ea5e9">${fmt(invoice.totalGross)}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px">Produits + livraison</div>
    </div>
    <div class="kpi red">
      <div class="kpi-label">Frais HelpMeProcess</div>
      <div class="kpi-val">−${fmt(invoice.fraisHMP)}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px">${fmt(HMP_FEE)} × ${invoice.orderCount}</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">Net marchand</div>
      <div class="kpi-val">${fmt(invoice.netMarchand)}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px">Montant à percevoir</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Commande</th>
        <th>Client / Ville</th>
        <th>Produits</th>
        <th style="text-align:right">Montant produits</th>
        <th style="text-align:right">Frais HMP</th>
        <th style="text-align:right">Net marchand</th>
        <th style="text-align:center">Date livraison</th>
        <th style="text-align:right">Encaissé réel</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">TOTAUX (${invoice.orderCount} commandes · ${invoice.productCount} produits)</td>
        <td style="text-align:right">${fmt(invoice.totalProducts)}</td>
        <td style="text-align:right;color:#dc2626">−${fmt(invoice.fraisHMP)}</td>
        <td style="text-align:right;color:#059669">${fmt(invoice.netMarchand)}</td>
        <td></td>
        <td style="text-align:right">${fmt(invoice.totalGross)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div>HelpMeProcess COD Manager · helpmeprocess.gn</div>
    <div>Document généré automatiquement — ${new Date().toLocaleString("fr-FR")}</div>
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${invoice.reference}.html"`,
    },
  });
}
