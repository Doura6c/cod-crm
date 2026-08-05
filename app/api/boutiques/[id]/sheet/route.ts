import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { fetchSheetCsv, parseSheet, extractSheetId } from "@/lib/sheetImport";

/**
 * Connecteur Google Sheets d'une boutique (import de commandes type Rapido).
 *
 * POST   { sheetUrl }  → teste la lecture de la feuille, enregistre l'URL,
 *                        renvoie un aperçu (colonnes reconnues, nb de lignes).
 * PATCH  { enabled }   → active/désactive la synchro automatique.
 * DELETE               → déconnecte la feuille.
 */

async function guard(context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  if (!["ADMIN", "MANAGER"].includes(user.role)) return { error: forbidden() };
  const { id } = await context.params;
  const boutique = await prisma.boutique.findUnique({
    where: { id },
    select: { id: true, name: true, sheetUrl: true, sheetSyncEnabled: true },
  });
  if (!boutique) {
    return { error: NextResponse.json({ error: "Boutique introuvable" }, { status: 404 }) };
  }
  return { boutique };
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { boutique, error } = await guard(context);
  if (error) return error;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const sheetUrl = String(body?.sheetUrl ?? "").trim();
  if (!extractSheetId(sheetUrl)) {
    return NextResponse.json(
      { error: "URL invalide. Collez le lien complet : https://docs.google.com/spreadsheets/d/…" },
      { status: 400 }
    );
  }

  // Test de lecture immédiat : la connexion échoue si la feuille est illisible.
  const fetched = await fetchSheetCsv(sheetUrl);
  if (!fetched.ok) {
    return NextResponse.json({ error: fetched.error }, { status: 422 });
  }
  const parsed = parseSheet(fetched.csv);
  if (parsed.missingRequired.length > 0) {
    const labels: Record<string, string> = { fullName: "Nom client", phone: "Téléphone" };
    return NextResponse.json(
      {
        error: `Colonnes requises introuvables : ${parsed.missingRequired
          .map((f) => labels[f] ?? f)
          .join(", ")}. Ajoutez-les en ligne 1 de la feuille.`,
        headers: parsed.headers,
      },
      { status: 422 }
    );
  }

  await prisma.boutique.update({
    where: { id: boutique.id },
    data: { sheetUrl, sheetLastError: null },
  });

  return NextResponse.json({
    ok: true,
    preview: {
      headers: parsed.headers,
      mapped: Object.keys(parsed.mapping),
      unmapped: parsed.unmappedHeaders,
      rowCount: parsed.rows.length,
      skipped: parsed.skipped.slice(0, 10),
    },
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { boutique, error } = await guard(context);
  if (error) return error;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Champ 'enabled' (booléen) requis" }, { status: 400 });
  }
  if (body.enabled && !boutique.sheetUrl) {
    return NextResponse.json({ error: "Connectez d'abord une feuille" }, { status: 400 });
  }

  await prisma.boutique.update({
    where: { id: boutique.id },
    data: { sheetSyncEnabled: body.enabled },
  });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { boutique, error } = await guard(context);
  if (error) return error;

  await prisma.boutique.update({
    where: { id: boutique.id },
    data: { sheetUrl: null, sheetSyncEnabled: false, sheetLastError: null },
  });
  return NextResponse.json({ ok: true });
}
