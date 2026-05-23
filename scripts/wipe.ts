/**
 * Script de nettoyage du CRM
 * Supprime toutes les données métier mais GARDE :
 *  - L'utilisateur ADMIN (pour pouvoir se connecter)
 *  - Les villes (master data réutilisable)
 *  - Les settings
 *
 * Usage : npx tsx scripts/wipe.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Sécurité : demander confirmation sauf si --confirm est passé
  if (!process.argv.includes("--confirm")) {
    console.log("⚠️  Ce script supprime TOUTES les données métier du CRM.");
    console.log("   Lance avec --confirm pour confirmer :\n");
    console.log("   npx tsx scripts/wipe.ts --confirm\n");
    process.exit(0);
  }
  console.log("🧹 Nettoyage du CRM en cours...\n");

  // Ordre important : supprimer d'abord les tables qui référencent les autres
  const steps: { label: string; fn: () => Promise<unknown> }[] = [
    { label: "Factures", fn: () => prisma.invoice.deleteMany({}) },
    { label: "Livraisons", fn: () => prisma.delivery.deleteMany({}) },
    { label: "Appels (CallLog)", fn: () => prisma.callLog.deleteMany({}) },
    { label: "Mouvements de stock", fn: () => prisma.stockMovement.deleteMany({}) },
    { label: "Lignes de commande", fn: () => prisma.orderItem.deleteMany({}) },
    { label: "Commandes", fn: () => prisma.order.deleteMany({}) },
    { label: "Dépenses", fn: () => prisma.expense.deleteMany({}) },
    { label: "Clients", fn: () => prisma.customer.deleteMany({}) },
    { label: "Produits", fn: () => prisma.product.deleteMany({}) },
    { label: "Boutiques", fn: () => prisma.boutique.deleteMany({}) },
  ];

  for (const step of steps) {
    const r = (await step.fn()) as { count: number };
    console.log(`  ✓ ${step.label} : ${r.count} supprimé(s)`);
  }

  // Garder un seul admin, supprimer tous les autres utilisateurs
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    console.log("\n⚠️  Aucun ADMIN trouvé — création de admin@codcrm.gn / password123");
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        email: "admin@codcrm.gn",
        passwordHash: hash,
        firstName: "Admin",
        lastName: "HelpMeProcess",
        phone: "224621881210",
        role: "ADMIN",
        active: true,
      },
    });
  } else {
    const adminToKeep = admins[0];
    const removed = await prisma.user.deleteMany({
      where: { id: { not: adminToKeep.id } },
    });
    console.log(`  ✓ Utilisateurs : ${removed.count} supprimé(s) — admin gardé : ${adminToKeep.email}`);
  }

  // Compter ce qui reste
  const [users, cities, settings] = await Promise.all([
    prisma.user.count(),
    prisma.city.count(),
    prisma.setting.count(),
  ]);

  console.log("\n📊 État final :");
  console.log(`  • ${users} utilisateur(s)`);
  console.log(`  • ${cities} ville(s)`);
  console.log(`  • ${settings} setting(s)`);
  console.log(`  • 0 boutique, 0 commande, 0 client, 0 produit`);
  console.log("\n✅ CRM prêt — connecte-toi et crée la boutique HPSHOP.\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
