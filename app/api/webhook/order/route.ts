import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderCode, formatGNF } from "@/lib/utils";
import { isRateLimited } from "@/lib/rateLimit";
import { notifyRole } from "@/lib/notifications";

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
// Origines navigateur autorisées (les appels serveur-à-serveur via proxy
// n'envoient pas d'Origin et restent protégés par la clé webhook secrète).
const ALLOWED_ORIGINS = [
  "https://hpshop-afrique.vercel.app",
  "https://asma-shop.vercel.app",
];

function cors(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Key",
  };
}

// Preflight CORS
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  try {
    // Origin allowlist : bloque les appels navigateur d'origines non autorisées.
    // Un appel sans Origin (serveur-à-serveur via proxy) est autorisé (protégé par la clé).
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json({ error: "Origine non autorisée" }, { status: 403, headers: cors(origin) });
    }

    // Rate-limit par IP (complète la limite par boutique) : 20 req / min
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`webhook:ip:${ip}`, 20, 60 * 1000)) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: cors(origin) });
    }

    const key = req.headers.get("x-webhook-key") || new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Webhook key manquante" }, { status: 401, headers: cors(origin) });
    }

    const boutique = await prisma.boutique.findUnique({ where: { webhookKey: key } });
    if (!boutique || !boutique.active) {
      return NextResponse.json({ error: "Boutique inconnue ou inactive" }, { status: 401, headers: cors(origin) });
    }

    // Rate-limiting par boutique : max 300 commandes / 15 min (anti-spam / DoS)
    if (await isRateLimited(`webhook:${boutique.id}`, 300, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Trop de requêtes, réessayez plus tard" },
        { status: 429, headers: cors(origin) }
      );
    }

    // Limite de taille du payload
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload trop volumineux" },
        { status: 413, headers: cors(origin) }
      );
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload trop volumineux" },
        { status: 413, headers: cors(origin) }
      );
    }
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400, headers: cors(origin) });
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
      return NextResponse.json({ error: "customer.phone et items requis" }, { status: 400, headers: cors(origin) });
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
      }, { status: 403, headers: cors(origin) });
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

    // Produits : lookup scopé boutique pour éviter les collisions inter-boutiques.
    // Ordre : (1) chercher par (sku, boutiqueId), (2) create brut, (3) préfixe si collision.
    let subtotal = 0;
    const orderItemsData = await Promise.all(
      items.map(async (it: any) => {
        const sku = it.sku ?? `EXT-${it.name?.toUpperCase().replace(/\s+/g, "-")}`;
        const name = it.name ?? sku;
        const price = Number(it.price ?? 0);

        let product = await prisma.product.findFirst({
          where: { sku, boutiqueId: boutique.id },
        });

        if (product) {
          product = await prisma.product.update({
            where: { id: product.id },
            data: { name, price },
          });
        } else {
          try {
            product = await prisma.product.create({
              data: { sku, name, price, stock: 0, boutiqueId: boutique.id },
            });
          } catch {
            // SKU déjà pris par une autre boutique — créer avec préfixe boutique
            const safeSku = `${boutique.id.slice(0, 8)}_${sku}`;
            product = await prisma.product.upsert({
              where: { sku: safeSku },
              create: { sku: safeSku, name, price, stock: 0, boutiqueId: boutique.id },
              update: { name, price },
            });
          }
        }
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

    // Si un doublon "actif" existe (même téléphone, commande en cours), on crée
    // quand même la commande mais on la marque isDuplicate=true : elle est exclue
    // des stats et signalée au superviseur, qui tranche (vrai re-commande vs doublon).
    const isDup = !!activeDuplicate;

    let order;
    try {
      order = await prisma.order.create({
        data: {
          code: generateOrderCode(),
          boutiqueId: boutique.id,
          customerId: cust.id,
          cityId,
          totalAmount: subtotal + Number(deliveryFee ?? 0),
          deliveryFee: Number(deliveryFee ?? 0),
          notes,
          source: (source && typeof source === 'string') ? source.trim().slice(0, 50) : "WEBHOOK",
          externalRef,
          status: "NOUVEAU",
          isDuplicate: isDup,
          duplicateOfCode: activeDuplicate?.code ?? null,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
    } catch (e: any) {
      // P2002 = violation de contrainte unique (boutiqueId, externalRef).
      // Cas d'une 2e requête simultanée (retry webhook) : la 1re a déjà créé la
      // commande. On renvoie l'existante → idempotence garantie, aucun doublon.
      if (e?.code === "P2002" && externalRef) {
        const existing = await prisma.order.findFirst({
          where: { boutiqueId: boutique.id, externalRef },
        });
        if (existing) {
          return NextResponse.json(
            { ok: true, order: existing, duplicate: true },
            { headers: cors(origin) }
          );
        }
      }
      throw e;
    }

    // Notifier tous les ADMIN et MANAGER actifs de la nouvelle commande
    const productNames = orderItemsData.length > 0
      ? items.slice(0, 2).map((it: any) => it.name ?? it.sku ?? "Produit").join(", ")
      : "Commande";
    await notifyRole(["ADMIN", "MANAGER"], {
      type: isDup ? "DUPLICATE_ORDER" : "NEW_ORDER",
      title: isDup
        ? `⚠️ Doublon possible — ${boutique.name}`
        : `Nouvelle commande — ${boutique.name}`,
      message: isDup
        ? `${customer.fullName ?? "Client"} (${customer.phone}) a déjà une commande active ${activeDuplicate?.code} (${activeDuplicate?.status}). Nouvelle commande ${order.code} marquée comme doublon — à vérifier.`
        : `${customer.fullName ?? "Client"} (${customer.phone}) — ${productNames} — ${formatGNF(subtotal + Number(deliveryFee ?? 0))} GNF`,
      data: { orderId: order.id, orderCode: order.code },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      order,
      duplicateFlagged: isDup || undefined,
      warning: activeDuplicate
        ? `Ce client a déjà une commande active : ${activeDuplicate.code} (${activeDuplicate.status})`
        : undefined,
    }, { status: 201, headers: cors(origin) });
  } catch (err: any) {
    // Ne jamais exposer les détails d'erreur internes en production
    console.error("[webhook] error:", err);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      { error: isDev ? (err.message ?? "Erreur serveur") : "Erreur interne du serveur" },
      { status: 500, headers: cors(origin) }
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
