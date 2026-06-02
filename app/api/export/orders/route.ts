import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const STATUS_FR: Record<string, string> = {
  NOUVEAU: "Nouveau",
  REPORTE: "Reporté",
  PDR: "PDR",
  INJOIGNABLE: "Injoignable",
  CONFIRME: "Confirmé",
  ANNULE: "Annulé",
  EN_LIVRAISON: "En livraison",
  LIVRE: "Livré",
  RETOURNE: "Retourné",
};

export async function GET(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status") ?? "";
  const from     = searchParams.get("from") ?? "";
  const to       = searchParams.get("to") ?? "";
  const boutiqueId = searchParams.get("boutiqueId") ?? "";

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (boutiqueId) where.boutiqueId = boutiqueId;
  if (from || to) {
    // K2 — Valider les dates avant usage (new Date("invalid") = Invalid Date silencieux)
    const gte = from ? new Date(from) : null;
    const lte = to   ? new Date(to + "T23:59:59") : null;
    if (gte && isNaN(gte.getTime())) {
      return NextResponse.json({ error: "Date 'from' invalide" }, { status: 400 });
    }
    if (lte && isNaN(lte.getTime())) {
      return NextResponse.json({ error: "Date 'to' invalide" }, { status: 400 });
    }
    where.createdAt = {};
    if (gte) where.createdAt.gte = gte;
    if (lte) where.createdAt.lte = lte;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { include: { city: true } },
      boutique: { select: { name: true } },
      city: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
      assignedAgent: { select: { firstName: true, lastName: true } },
      delivery: { select: { status: true, livreur: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const rows = orders.map((o) => ({
    "Code": o.code,
    "Date": new Date(o.createdAt).toLocaleDateString("fr-FR"),
    "Heure": new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    "Statut": STATUS_FR[o.status] ?? o.status,
    "Client": o.customer.fullName,
    "Téléphone": o.customer.phone,
    "Téléphone Alt": o.customer.altPhone ?? "",
    "Ville": o.city?.name ?? o.customer.city?.name ?? "",
    "Adresse": o.customer.address ?? "",
    "Commune": o.customer.commune ?? "",
    "Boutique": o.boutique.name,
    "Produits": o.items.map((i) => `${i.product.name} ×${i.quantity}`).join(" | "),
    "Montant total": o.totalAmount,
    "Frais livraison": o.deliveryFee,
    "Appels": o.callCount,
    "Agent": o.assignedAgent ? `${o.assignedAgent.firstName} ${o.assignedAgent.lastName}` : "",
    "Livreur": o.delivery?.livreur ? `${o.delivery.livreur.firstName} ${o.delivery.livreur.lastName}` : "",
    "Notes": o.notes ?? "",
    "Source": o.source,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Largeurs colonnes
  ws["!cols"] = [
    { wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 22 },
    { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
    { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Commandes");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `commandes_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
