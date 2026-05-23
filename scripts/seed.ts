import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as any);

function randomKey(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < length; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

function orderCode() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `CMD-${dd}${mm}${yyyy}-${Math.floor(10000 + Math.random() * 90000)}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Admin
  const passwordHash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@codcrm.gn" },
    create: {
      email: "admin@codcrm.gn",
      passwordHash,
      firstName: "Abdourahmane",
      lastName: "Manager",
      role: "ADMIN",
      phone: "224620000000",
    },
    update: {},
  });

  // Agents
  const agents = await Promise.all(
    [
      { firstName: "MR", lastName: "Tajeddine", role: "MANAGER" },
      { firstName: "Mr", lastName: "Sacko", role: "AGENT" },
      { firstName: "Fatoumata Binta", lastName: "Diallo", role: "AGENT" },
      { firstName: "Keira", lastName: "Soumah", role: "AGENT" },
      { firstName: "Betoudji", lastName: "MILAMEM", role: "AGENT" },
      { firstName: "Nagnouma", lastName: "Sacko", role: "AGENT" },
      { firstName: "Élise", lastName: "Kolié", role: "AGENT" },
      { firstName: "Celestin", lastName: "Loua", role: "AGENT" },
    ].map((a, i) =>
      prisma.user.upsert({
        where: { email: `${a.firstName.toLowerCase().replace(/\s/g, "")}.${a.lastName.toLowerCase()}@codcrm.gn` },
        create: {
          email: `${a.firstName.toLowerCase().replace(/\s/g, "")}.${a.lastName.toLowerCase()}@codcrm.gn`,
          passwordHash,
          firstName: a.firstName,
          lastName: a.lastName,
          role: a.role,
          phone: `2246${20 + i}${String(100000 + i * 1000).slice(0, 6)}`,
        },
        update: {},
      })
    )
  );

  // Livreurs
  await Promise.all(
    [
      { firstName: "Mamadou", lastName: "Bah" },
      { firstName: "Ibrahima", lastName: "Sow" },
    ].map((l) =>
      prisma.user.upsert({
        where: { email: `${l.firstName.toLowerCase()}.${l.lastName.toLowerCase()}@codcrm.gn` },
        create: {
          email: `${l.firstName.toLowerCase()}.${l.lastName.toLowerCase()}@codcrm.gn`,
          passwordHash,
          firstName: l.firstName,
          lastName: l.lastName,
          role: "LIVREUR",
          phone: "224620000000",
        },
        update: {},
      })
    )
  );

  // Villes
  const cities = await Promise.all(
    [
      { name: "Conakry", deliveryFee: 20000, estimatedDays: 1 },
      { name: "Labe", deliveryFee: 50000, estimatedDays: 2 },
      { name: "Kankan", deliveryFee: 70000, estimatedDays: 3 },
      { name: "Nzerekore", deliveryFee: 80000, estimatedDays: 3 },
      { name: "Boke", deliveryFee: 45000, estimatedDays: 2 },
      { name: "Mamou", deliveryFee: 40000, estimatedDays: 2 },
    ].map((c) =>
      prisma.city.upsert({
        where: { name: c.name },
        create: c,
        update: c,
      })
    )
  );

  // Boutiques
  const boutiques = await Promise.all(
    [
      { name: "AFRISHOP", slug: "afrishop", sellerName: "Mamadou Diop" },
      { name: "GUINEE-DEALS", slug: "guinee-deals", sellerName: "Aissatou Bah" },
    ].map((b) =>
      prisma.boutique.upsert({
        where: { slug: b.slug },
        create: {
          ...b,
          sellerPhone: "224620000000",
          sellerEmail: `${b.slug}@example.com`,
          webhookKey: randomKey(40),
        },
        update: {},
      })
    )
  );

  // Produits
  const productSpecs = [
    { sku: "MASQUE-MOTO-01", name: "Masque de Protection Polyvalent pour Moto - Résistant au Sable et au Vent", price: 170000, stock: 50 },
    { sku: "FUMEE-NOIRE-01", name: "Fini la fumée noire — Redonnez une nouvelle vie à votre moteur", price: 180000, stock: 30 },
    { sku: "BLENDER-PRO", name: "Blender Mixeur Pro 1.5L", price: 250000, stock: 25 },
    { sku: "SAC-VOYAGE", name: "Sac de voyage étanche 40L", price: 120000, stock: 60 },
    { sku: "ECOUTEURS-BT", name: "Écouteurs Bluetooth sans fil", price: 95000, stock: 100 },
    { sku: "MONTRE-CONNECT", name: "Montre connectée fitness", price: 280000, stock: 4 },
  ];
  const products = await Promise.all(
    productSpecs.map((p, i) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        create: { ...p, boutiqueId: boutiques[i % 2].id, stockAlert: 5 },
        update: {},
      })
    )
  );

  // Customers & Orders
  const customers = [
    { fullName: "Mamadou Diallo", phone: "224621881210", address: "6203006", commune: "Labe", cityName: "Labe" },
    { fullName: "ROGER ROGER", phone: "620593646", address: "Kobayah, Lambanyi Commune", commune: "Conakry", cityName: "Conakry" },
    { fullName: "Aminata Camara", phone: "224625112233", address: "Cité des Nations", commune: "Kaloum", cityName: "Conakry" },
    { fullName: "Ousmane Bah", phone: "224622445566", address: "Quartier Almamya", commune: "Kankan", cityName: "Kankan" },
    { fullName: "Fatoumata Sylla", phone: "224624778899", address: "Marché central", commune: "Boke", cityName: "Boke" },
    { fullName: "Sékou Touré", phone: "224623123456", address: "Centre ville", commune: "Mamou", cityName: "Mamou" },
  ];

  const statuses = ["NOUVEAU", "NOUVEAU", "NOUVEAU", "REPORTE", "CONFIRME", "LIVRE", "PDR", "INJOIGNABLE"];

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const city = cities.find((x) => x.name === c.cityName);
    const cust = await prisma.customer.upsert({
      where: { id: `cust-seed-${i}` },
      create: {
        id: `cust-seed-${i}`,
        fullName: c.fullName,
        phone: c.phone,
        address: c.address,
        commune: c.commune,
        cityId: city?.id,
      },
      update: {},
    });

    // Créer 2-3 commandes par customer
    const nbOrders = 1 + Math.floor(Math.random() * 2);
    for (let j = 0; j < nbOrders; j++) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const qty = 1;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const agent = agents[Math.floor(Math.random() * agents.length)];

      const dup = await prisma.order.findFirst({
        where: { customerId: cust.id, items: { some: { productId: prod.id } } },
      });
      if (dup) continue;

      const total = prod.price * qty + (city?.deliveryFee ?? 0);
      const order = await prisma.order.create({
        data: {
          code: orderCode(),
          boutiqueId: boutiques[i % 2].id,
          customerId: cust.id,
          cityId: city?.id,
          totalAmount: total,
          deliveryFee: city?.deliveryFee ?? 0,
          status,
          notes: status === "REPORTE" ? "À rappeler demain" : status === "NOUVEAU" ? "À livrer demain matin" : null,
          callCount: ["REPORTE", "PDR", "INJOIGNABLE"].includes(status) ? 2 : 0,
          assignedAgentId: agent.id,
          reportDate: status === "REPORTE" ? new Date(Date.now() + 86400000) : null,
          source: "WEBHOOK",
          items: {
            create: [
              {
                productId: prod.id,
                quantity: qty,
                unitPrice: prod.price,
                subtotal: prod.price * qty,
              },
            ],
          },
        },
      });

      // Si livré, créer facture
      if (status === "LIVRE") {
        await prisma.invoice.create({
          data: {
            reference: `FACT-${order.code.replace("CMD-", "")}`,
            orderId: order.id,
            subtotal: prod.price * qty,
            deliveryFee: city?.deliveryFee ?? 0,
            total,
            status: "PAYEE",
            paidAt: new Date(),
          },
        });
      }
    }
  }

  // Une dépense exemple
  await prisma.expense.upsert({
    where: { reference: "DEP-DEMO-001" },
    create: {
      reference: "DEP-DEMO-001",
      category: "SALAIRE",
      description: "Salaires du mois",
      amount: 5000000,
      date: new Date(),
      paidTo: "Équipe",
    },
    update: {},
  });

  // Paramètres
  await prisma.setting.upsert({
    where: { key: "company_name" },
    create: { key: "company_name", value: "HelpMeProcess COD" },
    update: {},
  });

  console.log("✅ Seed terminé !");
  console.log("📧 Login: admin@codcrm.gn / password123");
  console.log("🔑 Webhook keys :");
  for (const b of boutiques) {
    console.log(`   ${b.name}: ${b.webhookKey}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
