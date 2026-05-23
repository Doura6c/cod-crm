import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as any);

const TEST_USERS = [
  {
    email: "superviseur@codcrm.gn",
    password: "supervisor123",
    firstName: "Amadou",
    lastName: "Diallo",
    phone: "224622000001",
    role: "MANAGER",
  },
  {
    email: "agent@codcrm.gn",
    password: "agent123",
    firstName: "Fatoumata",
    lastName: "Bah",
    phone: "224622000002",
    role: "AGENT",
  },
  {
    email: "livreur@codcrm.gn",
    password: "livreur123",
    firstName: "Mamadou",
    lastName: "Camara",
    phone: "224622000003",
    role: "LIVREUR",
  },
];

async function main() {
  console.log("Création des comptes de test...\n");

  for (const u of TEST_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`⚠️  ${u.role} existe déjà : ${u.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        role: u.role,
        active: true,
      },
    });
    console.log(`✅  ${u.role.padEnd(8)} créé — ${u.email}  (mot de passe: ${u.password})`);
  }

  console.log("\n--- Récapitulatif de tous les utilisateurs ---");
  const all = await prisma.user.findMany({
    select: { email: true, role: true, firstName: true, lastName: true, active: true },
    orderBy: { role: "asc" },
  });
  for (const u of all) {
    console.log(`  ${u.role.padEnd(8)} | ${(u.firstName + " " + u.lastName).padEnd(25)} | ${u.email}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
