import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET — retourne les compteurs pour chaque catégorie
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!session?.user || user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const [
    commandes,
    orderItems,
    callLogs,
    invoices,
    merchantInvoices,
    clients,
    produits,
    stockMovements,
    boutiques,
    livraisons,
    notifications,
    teamRequests,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.callLog.count(),
    prisma.invoice.count(),
    prisma.merchantInvoice.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.stockMovement.count(),
    prisma.boutique.count(),
    prisma.delivery.count(),
    prisma.notification.count(),
    prisma.teamRequest.count(),
  ]);

  return NextResponse.json({
    commandes: { orders: commandes, items: orderItems, logs: callLogs, invoices, merchantInvoices },
    clients: { customers: clients },
    produits: { products: produits, movements: stockMovements },
    boutiques: { boutiques },
    livraisons: { deliveries: livraisons },
    autres: { notifications, teamRequests },
  });
}

// DELETE — supprime les catégories sélectionnées
export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!session?.user || user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const confirm = req.headers.get("x-confirm-reset");
  if (confirm !== "RESET_CONFIRMED") {
    return NextResponse.json({ error: "Header de confirmation manquant" }, { status: 400 });
  }

  const body = await req.json();
  const { commandes, clients, produits, boutiques, livraisons } = body as {
    commandes?: boolean;
    clients?: boolean;
    produits?: boolean;
    boutiques?: boolean;
    livraisons?: boolean;
  };

  const deleted: Record<string, number> = {};

  try {
    // Livraisons (avant commandes car FK)
    if (livraisons) {
      const r = await prisma.delivery.deleteMany({});
      deleted.livraisons = r.count;
    }

    // Commandes + tout ce qui dépend
    if (commandes) {
      const logs   = await prisma.callLog.deleteMany({});
      const inv    = await prisma.invoice.deleteMany({});
      const mInv   = await prisma.merchantInvoice.deleteMany({});
      const items  = await prisma.orderItem.deleteMany({});
      const orders = await prisma.order.deleteMany({});
      deleted.commandes    = orders.count;
      deleted.orderItems   = items.count;
      deleted.callLogs     = logs.count;
      deleted.invoices     = inv.count + mInv.count;
    }

    // Clients (après commandes car FK)
    if (clients) {
      const r = await prisma.customer.deleteMany({});
      deleted.clients = r.count;
    }

    // Produits + mouvements de stock
    if (produits) {
      const mvt = await prisma.stockMovement.deleteMany({});
      const prd = await prisma.product.deleteMany({});
      deleted.produits          = prd.count;
      deleted.stockMovements    = mvt.count;
    }

    // Boutiques (après commandes et produits)
    if (boutiques) {
      const r = await prisma.boutique.deleteMany({});
      deleted.boutiques = r.count;
    }

    // Toujours nettoyer notifications + team requests
    await prisma.notification.deleteMany({});
    await prisma.teamRequest.deleteMany({});

    return NextResponse.json({ ok: true, deleted });
  } catch (err: any) {
    console.error("[reset] error:", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
