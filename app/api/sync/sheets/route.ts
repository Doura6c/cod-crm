import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderCode, formatGNF } from "@/lib/utils";
import { notifyRole } from "@/lib/notifications";
import { getSessionUser } from "@/lib/apiAuth";
import { fetchSheetCsv, parseSheet, type SheetRow } from "@/lib/sheetImport";

/**
 * Synchronisation des feuilles Google Sheets connectées (import type Rapido).
 *
 * Deux modes d'appel :
 *  1. Planifié (cron externe / Apps Script) :
 *     POST /api/sync/sheets  avec  Authorization: Bearer <SHEET_SYNC_SECRET>
 *     → synchronise toutes les boutiques actives dont la sync est activée.
 *  2. Manuel (bouton « Synchroniser maintenant » du CRM) :
 *     POST /api/sync/sheets?boutiqueId=… par un ADMIN/MANAGER connecté
 *     → synchronise cette boutique même si la sync auto est désactivée.
 *
 * Idempotent : chaque ligne de feuille possède un externalRef (empreinte de
 * contenu) unique par boutique — une ligne déjà importée est ignorée.
 * Contrairement à Rapido, un client qui recommande n'est PAS ignoré : la
 * commande est créée et marquée isDuplicate pour arbitrage par l'agent.
 */

export const maxDuration = 60; // les feuilles volumineuses prennent du temps

type SyncResult = {
  boutique: string;
  imported: number;
  duplicatesFlagged: number;
  alreadyImported: number;
  blacklisted: number;
  skippedRows: { rowNumber: number; reason: string }[];
  error?: string;
};

async function logSheet(entry: {
  boutiqueId: string; boutiqueName: string; externalRef?: string | null;
  phone?: string | null; outcome: string; orderCode?: string | null;
  statusCode: number; error?: string | null;
}) {
  try {
    await prisma.webhookLog.create({
      data: {
        boutiqueId: entry.boutiqueId,
        boutiqueName: entry.boutiqueName,
        externalRef: entry.externalRef ?? null,
        phone: entry.phone ?? null,
        outcome: entry.outcome,
        orderCode: entry.orderCode ?? null,
        statusCode: entry.statusCode,
        bodySize: 0,
        ip: "sheet-sync",
        error: entry.error ? String(entry.error).slice(0, 500) : null,
      },
    });
  } catch {
    // journalisation best-effort
  }
}

/** Importe une ligne de feuille comme commande. Reprend la logique du webhook. */
async function importRow(
  boutique: { id: string; name: string },
  row: SheetRow
): Promise<"imported" | "duplicate_flagged" | "already" | "blacklisted"> {
  // Déjà importée ? (idempotence par empreinte de ligne)
  const existing = await prisma.order.findFirst({
    where: { boutiqueId: boutique.id, externalRef: row.externalRef },
    select: { id: true },
  });
  if (existing) return "already";

  // Client blacklisté → on n'importe pas
  const blk = await prisma.customer.findFirst({
    where: { phone: row.phone },
    select: { blacklisted: true },
  });
  if (blk?.blacklisted) {
    await logSheet({
      boutiqueId: boutique.id, boutiqueName: boutique.name,
      externalRef: row.externalRef, phone: row.phone,
      outcome: "BLACKLISTED", statusCode: 403,
    });
    return "blacklisted";
  }

  // Doublon actif (même téléphone, commande en cours) → import + flag
  const activeStatuses = ["NOUVEAU", "REPORTE", "PDR", "INJOIGNABLE", "CONFIRME"];
  const activeDuplicate = await prisma.order.findFirst({
    where: { status: { in: activeStatuses }, customer: { phone: row.phone } },
    select: { code: true, status: true },
  });

  // Ville (colonne Zone)
  let cityId: string | null = null;
  if (row.zone) {
    const city = await prisma.city.upsert({
      where: { name: row.zone },
      create: { name: row.zone },
      update: {},
    });
    cityId = city.id;
  }

  // Client : recherche par téléphone, sinon création
  const existingCust = await prisma.customer.findFirst({ where: { phone: row.phone } });
  const cust = existingCust
    ? await prisma.customer.update({
        where: { id: existingCust.id },
        data: {
          fullName: row.fullName || existingCust.fullName,
          address: row.address || existingCust.address,
          cityId: cityId ?? existingCust.cityId,
        },
      })
    : await prisma.customer.create({
        data: {
          fullName: row.fullName,
          phone: row.phone,
          address: row.address || null,
          cityId,
        },
      });

  // Produit : upsert scopé boutique (même stratégie SKU que le webhook)
  const sku = `EXT-${row.product.toUpperCase().replace(/\s+/g, "-").slice(0, 60)}`;
  let product = await prisma.product.findFirst({
    where: { sku, boutiqueId: boutique.id },
  });
  if (product) {
    if (row.price > 0 && product.price !== row.price) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { price: row.price },
      });
    }
  } else {
    try {
      product = await prisma.product.create({
        data: { sku, name: row.product, price: row.price, stock: 0, boutiqueId: boutique.id },
      });
    } catch {
      const safeSku = `${boutique.id.slice(0, 8)}_${sku}`;
      product = await prisma.product.upsert({
        where: { sku: safeSku },
        create: { sku: safeSku, name: row.product, price: row.price, stock: 0, boutiqueId: boutique.id },
        update: { name: row.product, price: row.price },
      });
    }
  }

  const unitPrice = row.price > 0 ? row.price / row.quantity : product.price;
  const subtotal = row.price > 0 ? row.price : product.price * row.quantity;
  const isDup = !!activeDuplicate;

  let order;
  try {
    order = await prisma.order.create({
      data: {
        code: generateOrderCode(),
        boutiqueId: boutique.id,
        customerId: cust.id,
        cityId,
        totalAmount: subtotal,
        deliveryFee: 0,
        notes: row.note || null,
        source: "SHEET",
        externalRef: row.externalRef,
        status: "NOUVEAU",
        isDuplicate: isDup,
        duplicateOfCode: activeDuplicate?.code ?? null,
        items: {
          create: [{ productId: product.id, quantity: row.quantity, unitPrice, subtotal }],
        },
      },
    });
  } catch (e: any) {
    // P2002 = deux syncs simultanées ont importé la même ligne → idempotence
    if (e?.code === "P2002") return "already";
    throw e;
  }

  await logSheet({
    boutiqueId: boutique.id, boutiqueName: boutique.name,
    externalRef: row.externalRef, phone: row.phone,
    outcome: isDup ? "SHEET_DUPLICATE_FLAGGED" : "SHEET_IMPORTED",
    orderCode: order.code, statusCode: 201,
  });
  return isDup ? "duplicate_flagged" : "imported";
}

async function syncBoutique(b: {
  id: string; name: string; sheetUrl: string;
}): Promise<SyncResult> {
  const result: SyncResult = {
    boutique: b.name, imported: 0, duplicatesFlagged: 0,
    alreadyImported: 0, blacklisted: 0, skippedRows: [],
  };

  const fetched = await fetchSheetCsv(b.sheetUrl);
  if (!fetched.ok) {
    result.error = fetched.error;
    await prisma.boutique.update({
      where: { id: b.id },
      data: { sheetLastError: fetched.error },
    });
    await logSheet({
      boutiqueId: b.id, boutiqueName: b.name,
      outcome: "SHEET_FETCH_ERROR", statusCode: 502, error: fetched.error,
    });
    return result;
  }

  const parsed = parseSheet(fetched.csv);
  if (parsed.missingRequired.length > 0) {
    result.error = `Colonnes requises manquantes : ${parsed.missingRequired.join(", ")}`;
    await prisma.boutique.update({
      where: { id: b.id },
      data: { sheetLastError: result.error },
    });
    return result;
  }
  result.skippedRows = parsed.skipped;

  for (const row of parsed.rows) {
    try {
      const outcome = await importRow({ id: b.id, name: b.name }, row);
      if (outcome === "imported") result.imported++;
      else if (outcome === "duplicate_flagged") result.duplicatesFlagged++;
      else if (outcome === "already") result.alreadyImported++;
      else if (outcome === "blacklisted") result.blacklisted++;
    } catch (e: any) {
      result.skippedRows.push({
        rowNumber: row.rowNumber,
        reason: `Erreur d'import : ${e?.message ?? "inconnue"}`,
      });
    }
  }

  const newOrders = result.imported + result.duplicatesFlagged;
  await prisma.boutique.update({
    where: { id: b.id },
    data: {
      sheetLastSyncAt: new Date(),
      sheetLastError: null,
      sheetImportedCount: { increment: newOrders },
    },
  });

  // Une seule notification par synchro (pas une par commande)
  if (newOrders > 0) {
    await notifyRole(["ADMIN", "MANAGER"], {
      type: "NEW_ORDER",
      title: `📄 Import Google Sheets — ${b.name}`,
      message:
        `${newOrders} commande(s) importée(s) depuis la feuille` +
        (result.duplicatesFlagged > 0
          ? `, dont ${result.duplicatesFlagged} doublon(s) possible(s) à vérifier`
          : ""),
      data: { boutiqueId: b.id },
    }).catch(() => {});
  }

  return result;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.SHEET_SYNC_SECRET;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const keyParam = url.searchParams.get("key") ?? "";
  const bySecret = !!secret && (bearer === secret || keyParam === secret);

  let boutiqueFilter: any = { active: true, sheetSyncEnabled: true, sheetUrl: { not: null } };

  if (!bySecret) {
    // Mode manuel : session ADMIN/MANAGER + boutiqueId ciblé
    const user = await getSessionUser();
    if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const boutiqueId = url.searchParams.get("boutiqueId");
    if (!boutiqueId) {
      return NextResponse.json({ error: "boutiqueId requis en mode manuel" }, { status: 400 });
    }
    boutiqueFilter = { id: boutiqueId, sheetUrl: { not: null } };
  }

  const boutiques = await prisma.boutique.findMany({
    where: boutiqueFilter,
    select: { id: true, name: true, sheetUrl: true },
  });
  if (boutiques.length === 0) {
    return NextResponse.json({ ok: true, results: [], message: "Aucune feuille à synchroniser" });
  }

  const results: SyncResult[] = [];
  for (const b of boutiques) {
    results.push(await syncBoutique(b as { id: string; name: string; sheetUrl: string }));
  }

  const totalImported = results.reduce((n, r) => n + r.imported + r.duplicatesFlagged, 0);
  return NextResponse.json({ ok: true, totalImported, results });
}

// GET : même comportement (pratique pour cron-job.org qui ne fait que du GET)
export const GET = POST;
