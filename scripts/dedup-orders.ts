/**
 * Script de détection / nettoyage des commandes en doublon (bug Afrishop).
 *
 * MODES
 *   (par défaut)   Lecture seule. Affiche les doublons sans rien modifier.
 *   --apply        Résout les conflits de référence externe SANS supprimer
 *                  aucune commande : sur les copies les plus récentes d'une
 *                  même (boutique, externalRef), il met externalRef=null,
 *                  isDuplicate=true et duplicateOfCode=<code d'origine>.
 *                  La commande la plus ANCIENNE de chaque groupe est conservée
 *                  intacte. Cela permet d'ajouter la contrainte d'unicité
 *                  @@unique([boutiqueId, externalRef]) sans perte de données.
 *
 * UTILISATION (production Neon) :
 *   DATABASE_URL="postgres://..." npx tsx scripts/dedup-orders.ts          # rapport
 *   DATABASE_URL="postgres://..." npx tsx scripts/dedup-orders.ts --apply  # nettoyage
 *
 * Le script lit DATABASE_URL : pointez-le sur la base à nettoyer.
 */
import { PrismaClient } from "../app/generated/prisma/client";

function makePrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url || url.startsWith("file:")) {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const path = require("path");
    const adapter = new PrismaBetterSqlite3({ url: path.resolve(process.cwd(), "dev.db") });
    return new PrismaClient({ adapter } as any);
  }
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg(new Pool({ connectionString: url }));
  return new PrismaClient({ adapter } as any);
}

const prisma = makePrisma();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`\n=== Dédoublonnage commandes — mode ${APPLY ? "APPLY (écriture)" : "RAPPORT (lecture seule)"} ===\n`);

  // ── 1) Doublons techniques : même (boutiqueId, externalRef) ──────────────
  // Ce sont les doublons qui BLOQUENT l'ajout de la contrainte d'unicité.
  const groups = await prisma.order.groupBy({
    by: ["boutiqueId", "externalRef"],
    where: { externalRef: { not: null } },
    _count: { _all: true },
    having: { externalRef: { _count: { gt: 1 } } },
  });

  console.log(`▶ Groupes (boutique, externalRef) en doublon : ${groups.length}`);

  let resolved = 0;
  for (const g of groups) {
    const orders = await prisma.order.findMany({
      where: { boutiqueId: g.boutiqueId, externalRef: g.externalRef },
      orderBy: { createdAt: "asc" },
      select: { id: true, code: true, status: true, createdAt: true },
    });
    const [keep, ...extras] = orders;
    console.log(
      `  • externalRef=${g.externalRef} (boutique ${g.boutiqueId}) : ` +
      `${orders.length} commandes → on garde ${keep.code} (${keep.status}), ` +
      `on déclasse ${extras.map((e) => e.code).join(", ")}`
    );
    if (APPLY) {
      for (const e of extras) {
        await prisma.order.update({
          where: { id: e.id },
          data: { externalRef: null, isDuplicate: true, duplicateOfCode: keep.code },
        });
        resolved++;
      }
    }
  }

  // ── 2) Doublons "métier" : même téléphone avec plusieurs commandes actives ─
  // Informationnel uniquement (ne bloque pas la contrainte) : à arbitrer par
  // un superviseur. Non modifié automatiquement.
  const ACTIVE = ["NOUVEAU", "REPORTE", "PDR", "INJOIGNABLE", "CONFIRME"];
  const activeOrders = await prisma.order.findMany({
    where: { status: { in: ACTIVE } },
    select: { code: true, status: true, createdAt: true, customer: { select: { phone: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
  });
  const byPhone = new Map<string, typeof activeOrders>();
  for (const o of activeOrders) {
    const p = o.customer.phone;
    if (!byPhone.has(p)) byPhone.set(p, []);
    byPhone.get(p)!.push(o);
  }
  const phoneDups = [...byPhone.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n▶ Numéros avec plusieurs commandes actives (à vérifier manuellement) : ${phoneDups.length}`);
  for (const [phone, list] of phoneDups.slice(0, 30)) {
    console.log(`  • ${phone} (${list[0].customer.fullName}) : ${list.map((o) => `${o.code}/${o.status}`).join(", ")}`);
  }
  if (phoneDups.length > 30) console.log(`  … et ${phoneDups.length - 30} autres`);

  console.log(
    `\n=== ${APPLY
      ? `Terminé : ${resolved} commande(s) déclassée(s) en doublon (aucune supprimée).`
      : "Rapport terminé. Relancez avec --apply pour résoudre les doublons techniques."} ===\n`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
