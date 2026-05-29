import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderCode, formatGNF } from "@/lib/utils";
import { isRateLimited } from "@/lib/rateLimit";

// Limite de taille du corps de requête (anti-DoS) : 100 Ko
const MAX_BODY_BYTES = 100 * 1024;

/**
 * Endpoint public — appelé par les boutiques e-commerce des clients.
 *
 * POST /api/webhook/order
 * Header: X-Webhook-Key: <webhookKey de la boutique>
 *
 * Body JSON :
 * {
 *   "externalRef": "ORD-123",                  // ID commande côté boutique
 *   "customer": {
 *     "fullName": "Mamadou Diallo",
 *     "phone": "224621881210",
 *     "altPhone": "224620000000",
 *     "address": "Labe",
 *     "city": "Labe",                         // nom de ville
 *     "commune": "Labe Centre"
 *   },
 *   "items": [
 *     { "sku": "MASQUE-MOTO", "name": "Masque Moto", "price": 170000, "quantity": 1 }
 *   ],
 *   "deliveryFee": 0,
 *   "notes": "Livrer demain matin"
 * }
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Key",
};

// Preflight CORS
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-webhook-key") || new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Webhook key manquante" }, { status: 401, headers: CORS });
    }

    const boutique = await prisma.boutique.findUnique({ where: { webhookKey: key } });
    if (!boutique || !boutique.active) {
      return NextResponse.json({ error: "Boutique inconnue ou inactive" }, { status: 401, headers: CORS });
    }

    // Rate-limiting par boutique : max 300 commandes / 15 min (anti-spam / DoS)
    if (isRateLimited(`webhook:${boutique.id}`, 300, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Trop de requêtes, réessayez plus tard" },
        { status: 429, headers: CORS }
      );
    }

    // Limite de taille du payload
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload trop volumineux" },
        { status: 413, headers: CORS }
      );
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload trop volumineux" },
        { status: 413, headers: CORS }
      );
    }
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400, headers: CORS });
    }
    const { externalRef, items, deliveryFee = 0, notes, source } = body;

    // Support deux formats : customer.city OU top-level cityName/address
    const customer = {
      ...body.customer,
      address: body.customer?.address ?? body.address,
      city: body.customer?.city ?? body.cityName,
      phone: body.customer?.phone,
      fullName: body.customer?.fullName,
      altPhone: body.customer?.altPhone,
      commune: body.customer?.commune,
    };

    if (!customer?.phone || !items?.length) {
      return NextResponse.json({ error: "customer.phone et items requis" }, { status: 400, headers: CORS });
    }

    // Idempotence : si externalRef existe déjà, on renvoie la commande existante
    if (externalRef) {
      const existing = await prisma.order.findFirst({
        where: { boutiqueId: boutique.id, externalRef },
      });
      if (existing) {
        return NextResponse.json({ ok: true, order: existing, duplicate: true });
      }
    }

    // Détection client blacklisté
    const existingCustCheck = await prisma.customer.findFirst({
      where: { phone: customer.phone },
      select: { blacklisted: true, blacklistReason: true },
    });
    if (existingCustCheck?.blacklisted) {
      return NextResponse.json({
        error: "Client blacklisté",
        reason: existingCustCheck.blacklistReason ?? "Client sur liste noire",
        code: "BLACKLISTED_CUSTOMER",
      }, { status: 403, headers: CORS });
    }

    // Détection doublon actif (commande en cours pour ce numéro)
    const activeStatuses = ["NOUVEAU", "REPORTE", "PDR", "INJOIGNABLE", "CONFIRME"];
    const activeDuplicate = await prisma.order.findFirst({
      where: {
        status: { in: activeStatuses },
        customer: { phone: customer.phone },
      },
      select: { id: true, code: true, status: true },
    });

    // Ville (création si nécessaire)
    let cityId: string | null = null;
    if (customer.city) {
      const city = await prisma.city.upsert({
        where: { name: customer.city },
        create: { name: customer.city },
        update: {},
      });
      cityId = city.id;
    }

    // Customer (recherche par téléphone, sinon création)
    const existingCust = await prisma.customer.findFirst({ where: { phone: customer.phone } });
    const cust = existingCust
      ? await prisma.customer.update({
          where: { id: existingCust.id },
          data: {
            fullName: customer.fullName ?? existingCust.fullName,
            address: customer.address ?? existingCust.address,
            cityId: cityId ?? existingCust.cityId,
            commune: customer.commune ?? existingCust.commune,
            altPhone: customer.altPhone ?? existingCust.altPhone,
          },
        })
      : await prisma.customer.create({
          data: {
            fullName: customer.fullName ?? "Client",
            phone: customer.phone,
            altPhone: customer.altPhone,
            address: customer.address,
            cityId,
            commune: customer.commune,
          },
        });

    // Produits : upsert par SKU (création auto si la boutique envoie un produit inconnu)
    let subtotal = 0;
    const orderItemsData = await Promise.all(
      items.map(async (it: any) => {
        const sku = it.sku ?? `EXT-${it.name?.toUpperCase().replace(/\s+/g, "-")}`;
        const product = await prisma.product.upsert({
          where: { sku },
          create: {
            sku,
            name: it.name ?? sku,
            price: Number(it.price ?? 0),
            stock: 0,
            boutiqueId: boutique.id,
          },
          update: {
            name: it.name ?? sku,
            price: Number(it.price ?? 0),
          },
        });
        const qty = Number(it.quantity ?? 1);
        const unitPrice = Number(it.price ?? product.price);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        return {
          productId: product.id,
          quantity: qty,
          unitPrice,
          subtotal: lineTotal,
        };
      })
    );

    const order = await prisma.order.create({
      data: {
        code: generateOrderCode(),
        boutiqueId: boutique.id,
        customerId: cust.id,
        cityId,
        totalAmount: subtotal + Number(deliveryFee ?? 0),
        deliveryFee: Number(deliveryFee ?? 0),
        notes,
        source: "WEBHOOK",
        externalRef,
        status: "NOUVEAU",
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    // Créer une notification pour les admins
    const productNames = orderItemsData.length > 0
      ? items.slice(0, 2).map((it: any) => it.name ?? it.sku ?? "Produit").join(", ")
      : "Commande";
    await prisma.notification.create({
      data: {
        type: "NEW_ORDER",
        title: `Nouvelle commande — ${boutique.name}`,
        message: `${customer.fullName ?? "Client"} (${customer.phone}) — ${productNames} — ${formatGNF(subtotal + Number(deliveryFee ?? 0))} GNF`,
        data: JSON.stringify({ orderId: order.id, orderCode: order.code }),
      },
    }).catch(() => {}); // silencieux si la table n'a pas le bon format

    return NextResponse.json({
      ok: true,
      order,
      warning: activeDuplicate
        ? `Ce client a déjà une commande active : ${activeDuplicate.code} (${activeDuplicate.status})`
        : undefined,
    }, { status: 201, headers: CORS });
  } catch (err: any) {
    // Ne jamais exposer les détails d'erreur internes en production
    console.error("[webhook] error:", err);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      { error: isDev ? (err.message ?? "Erreur serveur") : "Erreur interne du serveur" },
      { status: 500, headers: CORS }
    );
  }
}

// GET pour vérifier que l'endpoint est vivant
export async function GET() {
  return NextResponse.json({
    ok: true,
    docs: "POST avec header X-Webhook-Key. Voir code source pour le format JSON.",
  });
}
