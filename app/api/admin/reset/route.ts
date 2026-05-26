import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/reset
 * Supprime toutes les données transactionnelles (commandes, clients, produits, boutiques).
 * Conserve : utilisateurs, villes.
 * Réservé aux SUPER ADMIN uniquement.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user as any;

  if (!session?.user || user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  // Double confirmation via header secret
  const confirm = req.headers.get("x-confirm-reset");
  if (confirm !== "RESET_ALL_DATA") {
    return NextResponse.json(
      { error: "Header de confirmation manquant : x-confirm-reset: RESET_ALL_DATA" },
      { status: 400 }
    );
  }

  try {
    // Ordre important (contraintes FK)
    await prisma.callLog.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.merchantInvoice.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.boutique.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.teamRequest.deleteMany({});

    return NextResponse.json({
      ok: true,
      message: "Toutes les données fictives ont été supprimées. Utilisateurs et villes conservés.",
    });
  } catch (err: any) {
    console.error("[reset] error:", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}
