import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderCode } from "@/lib/utils";
import { getSessionUser, unauthorized, forbidden } from "@/lib/apiAuth";

/**
 * POST /api/import/orders
 * Body: { rows: Array<{ phone, fullName, address, city, product, price, quantity, deliveryFee, notes, externalRef }> }
 * Auth: ADMIN ou MANAGER requis
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!["ADMIN", "MANAGER"].includes(user.role)) return forbidden();
  const userId = user.id;

  let body: { rows: any[]; boutiqueId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { rows, boutiqueId } = body;
  if (!rows?.length) {
    return NextResponse.json({ error: "Aucune ligne fournie" }, { status: 400 });
  }

  // Résoudre la boutique (prendre la première boutique de l'organisation si non fourni)
  let boutique = boutiqueId
    ? await prisma.boutique.findUnique({ where: { id: boutiqueId } })
    : await prisma.boutique.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });

  if (!boutique) {
    return NextResponse.json({ error: "Aucune boutique disponible" }, { status: 400 });
  }

  const results: { success: number; skipped: number; errors: string[] } = {
    success: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 pour l'en-tête CSV

    const phone = String(row.phone ?? "").trim().replace(/\s+/g, "");
    const fullName = String(row.fullName ?? row.nom ?? row.name ?? "Client").trim();
    const address = String(row.address ?? row.adresse ?? "").trim() || null;
    const cityName = String(row.city ?? row.ville ?? "").trim() || null;
    const productName = String(row.product ?? row.produit ?? "Produit").trim();
    const price = parseFloat(String(row.price ?? row.prix ?? 0)) || 0;
    const quantity = parseInt(String(row.quantity ?? row.quantite ?? row.qty ?? 1)) || 1;
    const deliveryFee = parseFloat(String(row.deliveryFee ?? row.frais ?? 0)) || 0;
    const notes = String(row.notes ?? row.note ?? "").trim() || null;
    const externalRef = String(row.externalRef ?? row.ref ?? "").trim() || null;

    if (!phone || phone.length < 8) {
      results.errors.push(`Ligne ${rowNum} : téléphone invalide ("${phone}")`);
      results.skipped++;
      continue;
    }

    try {
      // Idempotence par externalRef
      if (externalRef) {
        const existing = await prisma.order.findFirst({
          where: { boutiqueId: boutique!.id, externalRef },
        });
        if (existing) {
          results.skipped++;
          continue;
        }
      }

      // Ville
      let cityId: string | null = null;
      if (cityName) {
        const city = await prisma.city.upsert({
          where: { name: cityName },
          create: { name: cityName },
          update: {},
        });
        cityId = city.id;
      }

      // Client
      const existingCust = await prisma.customer.findFirst({ where: { phone } });
      const cust = existingCust
        ? await prisma.customer.update({
            where: { id: existingCust.id },
            data: {
              fullName: fullName || existingCust.fullName,
              address: address ?? existingCust.address,
              cityId: cityId ?? existingCust.cityId,
            },
          })
        : await prisma.customer.create({
            data: { fullName, phone, address, cityId },
          });

      // Produit
      const sku = `IMP-${productName.toUpperCase().replace(/\s+/g, "-").slice(0, 30)}`;
      const product = await prisma.product.upsert({
        where: { sku },
        create: { sku, name: productName, price, stock: 0, boutiqueId: boutique!.id },
        update: { name: productName, price },
      });

      const subtotal = price * quantity;
      await prisma.order.create({
        data: {
          code: generateOrderCode(),
          boutiqueId: boutique!.id,
          customerId: cust.id,
          cityId,
          totalAmount: subtotal + deliveryFee,
          deliveryFee,
          notes,
          source: "IMPORT",
          externalRef,
          status: "NOUVEAU",
          items: {
            create: [{ productId: product.id, quantity, unitPrice: price, subtotal }],
          },
        },
      });

      results.success++;
    } catch (err: any) {
      results.errors.push(`Ligne ${rowNum} : ${err.message}`);
      results.skipped++;
    }
  }

  return NextResponse.json(results, { status: 200 });
}
