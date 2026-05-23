/**
 * Simulation d'un mois de production HelpMeProcess COD
 * - 10 agents, 3 livreurs
 * - ~120 commandes sur 30 jours
 * - 30% taux confirmation, 90% taux livraison
 * - Statuts variés : NOUVEAU, REPORTE, INJOIGNABLE, PDR, CONFIRME, EN_LIVRAISON, LIVRE, RETOURNE, ANNULE
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: path.resolve(process.cwd(), "dev.db") });
const prisma = new PrismaClient({ adapter } as any);

// ═══════════════════════════════════════════════════════
// DONNÉES DE BASE
// ═══════════════════════════════════════════════════════

const AGENTS_TO_CREATE = [
  { firstName: "Mariama",   lastName: "Diallo",    email: "mariama.diallo@hmp.gn",    phone: "224621100001" },
  { firstName: "Ibrahima",  lastName: "Bah",       email: "ibrahima.bah@hmp.gn",      phone: "224621100002" },
  { firstName: "Aissatou",  lastName: "Camara",    email: "aissatou.camara@hmp.gn",   phone: "224621100003" },
  { firstName: "Moussa",    lastName: "Kouyaté",   email: "moussa.kouyate@hmp.gn",    phone: "224621100004" },
  { firstName: "Kadiatou",  lastName: "Sow",       email: "kadiatou.sow@hmp.gn",      phone: "224621100005" },
  { firstName: "Oumar",     lastName: "Baldé",     email: "oumar.balde@hmp.gn",       phone: "224621100006" },
  { firstName: "Sekou",     lastName: "Barry",     email: "sekou.barry@hmp.gn",       phone: "224621100007" },
  { firstName: "Aminata",   lastName: "Touré",     email: "aminata.toure@hmp.gn",     phone: "224621100008" },
  { firstName: "Mamadou",   lastName: "Keïta",     email: "mamadou.keita@hmp.gn",     phone: "224621100009" },
  { firstName: "Fatoumata", lastName: "Sylla",     email: "fatoumata.sylla@hmp.gn",   phone: "224621100010" },
];

const LIVREURS_TO_CREATE = [
  { firstName: "Thierno",     lastName: "Diallo",  email: "thierno.diallo@hmp.gn",    phone: "224622200001" },
  { firstName: "Alpha",       lastName: "Baldé",   email: "alpha.balde@hmp.gn",       phone: "224622200002" },
  { firstName: "Souleymane",  lastName: "Camara",  email: "souleymane.camara@hmp.gn", phone: "224622200003" },
];

const CLIENTS = [
  { fullName: "Fatoumata Konaté",   phone: "224620001001", address: "Ratoma, Cité des Nations" },
  { fullName: "Ibrahima Diallo",    phone: "224620001002", address: "Kaloum, Centre-ville" },
  { fullName: "Aminata Bah",        phone: "224620001003", address: "Matam, Quartier Almamya" },
  { fullName: "Mamadou Sow",        phone: "224620001004", address: "Dixinn, Près de l'université" },
  { fullName: "Mariama Camara",     phone: "224620001005", address: "Lambanyi, Carrefour" },
  { fullName: "Sekou Touré",        phone: "224620001006", address: "Hamdallaye, Mosquée centrale" },
  { fullName: "Kadiatou Diallo",    phone: "224620001007", address: "Cosa, Route de Dubréka" },
  { fullName: "Oumar Barry",        phone: "224620001008", address: "Nongo, Cité Enco-5" },
  { fullName: "Aissatou Kouyaté",  phone: "224620001009", address: "Bonfi, Marché central" },
  { fullName: "Alpha Baldé",        phone: "224620001010", address: "Sonfonia, Route de Coyah" },
  { fullName: "Thierno Keïta",      phone: "224620001011", address: "Kipé, Résidence Koloma" },
  { fullName: "Hawa Sylla",         phone: "224620001012", address: "Ratoma, Quartier Kobaya" },
  { fullName: "Boubacar Diallo",    phone: "224620001013", address: "Kaloum, Port autonome" },
  { fullName: "Mariam Bah",         phone: "224620001014", address: "Matoto, Gare routière" },
  { fullName: "Souleymane Barry",   phone: "224620001015", address: "Dixinn, Rond-point OMS" },
  { fullName: "Kadija Camara",      phone: "224620001016", address: "Lambanyi, École primaire" },
  { fullName: "Mohamed Sow",        phone: "224620001017", address: "Hamdallaye, Rue KA-023" },
  { fullName: "Fatoumata Barry",    phone: "224620001018", address: "Cosa, Terminus bus" },
  { fullName: "Cellou Baldé",       phone: "224620001019", address: "Nongo, Quartier Bambeto" },
  { fullName: "Ramata Diallo",      phone: "224620001020", address: "Conakry Centre" },
  { fullName: "Lansana Camara",     phone: "224620001021", address: "Labé, Centre-ville" },
  { fullName: "Oumou Bah",          phone: "224620001022", address: "Kankan, Quartier Hérémakono" },
  { fullName: "Elhadj Kouyaté",    phone: "224620001023", address: "Kindia, Marché" },
  { fullName: "Nafissatou Diallo",  phone: "224620001024", address: "Boké, Centre" },
  { fullName: "Aboubacar Sow",      phone: "224620001025", address: "Mamou, Quartier Pellel" },
];

const CALL_NOTES_NO_ANSWER = [
  "Sonnerie sans réponse",
  "Téléphone éteint",
  "Messagerie vocale",
  "Numéro occupé, rappel prévu",
  "Pas de réponse après 3 tentatives",
];

const CALL_NOTES_CONFIRMED = [
  "Client confirmé, adresse vérifiée",
  "Commande confirmée, livraison demain matin",
  "OK confirmé, client disponible toute la journée",
  "Confirmation faite, montant accepté",
  "Client enthousiaste, attends la livraison",
];

const CALL_NOTES_REPORTED = [
  "Client demande rappel demain",
  "Absent, rappeler après 18h",
  "En réunion, rappeler mardi",
  "Demande délai supplémentaire",
  "Reporté sur demande du client",
];

const CALL_NOTES_CANCELLED = [
  "Client annule, changement d'avis",
  "Commande doublée, annulation",
  "Client a trouvé ailleurs moins cher",
  "Annulation définitive",
];

const CALL_NOTES_INJOIGNABLE = [
  "Numéro incorrect ou inexistant",
  "Téléphone inaccessible depuis 3 jours",
  "Injoignable malgré 5 tentatives",
  "Hors réseau",
];

// ═══════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number, plusHours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randInt(8, 20), randInt(0, 59), 0, 0);
  d.setHours(d.getHours() + plusHours);
  return d;
}

function orderCode(date: Date, n: number): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  return `CMD-${dd}${mm}${yy}-${String(n).padStart(5, "0")}`;
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════

async function main() {
  console.log("🚀 Simulation d'un mois de production HelpMeProcess COD\n");

  // ─── Récupérer la boutique ────────────────────────────
  const boutique = await prisma.boutique.findFirst({ where: { name: { contains: "HP" } } });
  if (!boutique) throw new Error("Boutique HP non trouvée");

  // ─── Récupérer les produits ───────────────────────────
  const products = await prisma.product.findMany({ where: { boutiqueId: boutique.id } });
  if (products.length === 0) throw new Error("Aucun produit trouvé");

  // ─── Récupérer les villes ─────────────────────────────
  const cities = await prisma.city.findMany();
  const conakry = cities.find((c) => c.name === "Conakry") ?? cities[0];

  // ─── Créer les agents ─────────────────────────────────
  const hash = await bcrypt.hash("agent123", 10);
  const agents: any[] = [];

  // Garder l'agent existant
  const existingAgent = await prisma.user.findUnique({ where: { email: "agent@codcrm.gn" } });
  if (existingAgent) agents.push(existingAgent);

  for (const a of AGENTS_TO_CREATE) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) { agents.push(existing); continue; }
    const user = await prisma.user.create({
      data: { ...a, passwordHash: hash, role: "AGENT", active: true },
    });
    agents.push(user);
    console.log(`  ✅ Agent créé : ${a.firstName} ${a.lastName}`);
  }
  console.log(`\n  📋 ${agents.length} agents disponibles\n`);

  // ─── Créer les livreurs ───────────────────────────────
  const hashLiv = await bcrypt.hash("livreur123", 10);
  const livreurs: any[] = [];

  const existingLivreur = await prisma.user.findUnique({ where: { email: "livreur@codcrm.gn" } });
  if (existingLivreur) livreurs.push(existingLivreur);

  for (const l of LIVREURS_TO_CREATE) {
    const existing = await prisma.user.findUnique({ where: { email: l.email } });
    if (existing) { livreurs.push(existing); continue; }
    const user = await prisma.user.create({
      data: { ...l, passwordHash: hashLiv, role: "LIVREUR", active: true },
    });
    livreurs.push(user);
    console.log(`  🚴 Livreur créé : ${l.firstName} ${l.lastName}`);
  }
  console.log(`\n  🚴 ${livreurs.length} livreurs disponibles\n`);

  // ─── Créer les clients ────────────────────────────────
  const customers: any[] = [];
  for (const c of CLIENTS) {
    const city = pick(cities);
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (existing) { customers.push(existing); continue; }
    const customer = await prisma.customer.create({
      data: { ...c, cityId: city.id, commune: city.name },
    });
    customers.push(customer);
  }
  console.log(`  👥 ${customers.length} clients créés\n`);

  // ─── Gestionnaire Superviseur ─────────────────────────
  const manager = await prisma.user.findFirst({ where: { role: "MANAGER" } });
  if (!manager) throw new Error("Aucun superviseur trouvé");

  // ─── Générer les commandes sur 30 jours ──────────────
  // Distribution: ~4 commandes/jour en moyenne
  const TOTAL_ORDERS = 120;
  let orderCount = 0;
  let livreCount = 0;
  let retourneCount = 0;
  let confirmeCount = 0;
  let annuleCount = 0;
  let reporteCount = 0;
  let injoignableCount = 0;

  console.log("  📦 Génération des commandes...\n");

  for (let day = 29; day >= 0; day--) {
    // 2-6 commandes par jour
    const ordersThisDay = randInt(2, 6);

    for (let i = 0; i < ordersThisDay && orderCount < TOTAL_ORDERS; i++) {
      orderCount++;
      const createdAt = daysAgo(day);
      const customer = pick(customers);
      const city = cities.find((c) => c.id === customer.cityId) ?? conakry;
      const agent = pick(agents);

      // 1-2 produits par commande
      const numProducts = randInt(1, 2);
      const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, numProducts);
      const totalAmount = selectedProducts.reduce((s, p) => s + p.price, 0) + city.deliveryFee;

      const code = orderCode(createdAt, orderCount);

      // Déterminer le statut selon les probabilités
      // Commandes récentes (< 5 jours) : plus de NOUVEAU
      const isRecent = day < 5;
      const rand = Math.random();

      let finalStatus: string;
      let callOutcome: string;
      let deliveryStatus: string | null = null;

      if (isRecent && rand < 0.3) {
        finalStatus = "NOUVEAU";
        callOutcome = "ANSWERED";
      } else if (rand < 0.30) {
        // 30% confirmation
        finalStatus = "CONFIRME";
        callOutcome = "CONFIRMED";
        confirmeCount++;
      } else if (rand < 0.44) {
        // 14% reporté
        finalStatus = "REPORTE";
        callOutcome = "REPORTED";
        reporteCount++;
      } else if (rand < 0.54) {
        // 10% injoignable
        finalStatus = "INJOIGNABLE";
        callOutcome = "INJOIGNABLE";
        injoignableCount++;
      } else if (rand < 0.62) {
        // 8% PDR
        finalStatus = "PDR";
        callOutcome = "NO_ANSWER";
      } else if (rand < 0.67) {
        // 5% annulé
        finalStatus = "ANNULE";
        callOutcome = "CANCELLED";
        annuleCount++;
      } else {
        finalStatus = "NOUVEAU";
        callOutcome = "ANSWERED";
      }

      // Commandes confirmées → livraison
      let deliveryFinalStatus: "LIVRE" | "RETOURNE" | null = null;
      if (finalStatus === "CONFIRME" && day > 1) {
        const delivRand = Math.random();
        if (delivRand < 0.90) {
          finalStatus = "LIVRE";
          deliveryFinalStatus = "LIVRE";
          livreCount++;
        } else {
          finalStatus = "RETOURNE";
          deliveryFinalStatus = "RETOURNE";
          retourneCount++;
        }
      }

      // Créer la commande
      const order = await prisma.order.create({
        data: {
          code,
          boutiqueId: boutique.id,
          customerId: customer.id,
          cityId: city.id,
          totalAmount,
          deliveryFee: city.deliveryFee,
          status: finalStatus,
          source: "WEBHOOK",
          assignedAgentId: agent.id,
          callCount: finalStatus === "NOUVEAU" ? 0 : randInt(1, 4),
          createdAt,
          updatedAt: createdAt,
          ...(finalStatus === "CONFIRME" || finalStatus === "LIVRE" || finalStatus === "RETOURNE" || finalStatus === "EN_LIVRAISON"
            ? { validatedById: agent.id, validatedAt: new Date(createdAt.getTime() + 3600000) }
            : {}),
        },
      });

      // Créer les articles
      for (const prod of selectedProducts) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: prod.id,
            quantity: 1,
            unitPrice: prod.price,
            subtotal: prod.price,
          },
        });
      }

      // Créer les call logs (1-3 appels par commande non-NOUVEAU)
      if (finalStatus !== "NOUVEAU") {
        const numCalls = randInt(1, 3);
        for (let c = 0; c < numCalls; c++) {
          const isLastCall = c === numCalls - 1;
          const callOutcomeForLog = isLastCall ? callOutcome :
            (Math.random() < 0.5 ? "NO_ANSWER" : "ANSWERED");

          let note = "";
          if (callOutcomeForLog === "NO_ANSWER" || callOutcomeForLog === "BUSY") note = pick(CALL_NOTES_NO_ANSWER);
          else if (callOutcomeForLog === "CONFIRMED") note = pick(CALL_NOTES_CONFIRMED);
          else if (callOutcomeForLog === "REPORTED") note = pick(CALL_NOTES_REPORTED);
          else if (callOutcomeForLog === "CANCELLED") note = pick(CALL_NOTES_CANCELLED);
          else if (callOutcomeForLog === "INJOIGNABLE") note = pick(CALL_NOTES_INJOIGNABLE);
          else note = "Client joint, informations vérifiées";

          await prisma.callLog.create({
            data: {
              orderId: order.id,
              agentId: agent.id,
              outcome: callOutcomeForLog,
              note,
              createdAt: new Date(createdAt.getTime() + (c + 1) * 1800000),
            },
          });
        }
      }

      // Créer la livraison si confirmée
      if (deliveryFinalStatus) {
        const livreur = pick(livreurs);
        const deliveredAt = deliveryFinalStatus === "LIVRE"
          ? new Date(createdAt.getTime() + randInt(2, 24) * 3600000)
          : null;
        const amountCollected = deliveryFinalStatus === "LIVRE" ? totalAmount : null;

        const delivery = await prisma.delivery.create({
          data: {
            orderId: order.id,
            livreurId: livreur.id,
            cityId: city.id,
            status: deliveryFinalStatus,
            deliveredAt,
            amountCollected,
            failureReason: deliveryFinalStatus === "RETOURNE"
              ? pick(["Client absent à l'adresse", "Adresse introuvable", "Client refuse la commande", "Montant insuffisant"])
              : null,
            createdAt: new Date(createdAt.getTime() + 7200000),
          },
        });

        // Facturation auto si LIVRE
        if (deliveryFinalStatus === "LIVRE" && deliveredAt) {
          const dateStr = deliveredAt.toISOString().slice(0, 10).replace(/-/g, "");
          const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
          await prisma.invoice.create({
            data: {
              reference: `FACT-${dateStr}-${suffix}`,
              orderId: order.id,
              subtotal: totalAmount - city.deliveryFee,
              deliveryFee: city.deliveryFee,
              total: totalAmount,
              status: "PAYEE",
              paidAt: deliveredAt,
              createdAt: deliveredAt,
            },
          });
        }

        // Si retourné : remettre le stock
        if (deliveryFinalStatus === "RETOURNE") {
          for (const prod of selectedProducts) {
            await prisma.stockMovement.create({
              data: {
                productId: prod.id,
                type: "IN",
                quantity: 1,
                reason: `Retour commande ${code}`,
                orderId: order.id,
                createdAt: new Date(createdAt.getTime() + 86400000),
              },
            });
          }
        }

        // Stock OUT pour les confirmées
        if (["LIVRE", "RETOURNE"].includes(deliveryFinalStatus)) {
          for (const prod of selectedProducts) {
            await prisma.stockMovement.create({
              data: {
                productId: prod.id,
                type: "OUT",
                quantity: 1,
                reason: `Commande ${code} confirmée`,
                orderId: order.id,
                createdAt: new Date(createdAt.getTime() + 3600000),
              },
            });
          }
        }
      }
    }
  }

  // ─── Résumé ───────────────────────────────────────────
  console.log("\n  ════════════════════════════════════════");
  console.log(`  📊 RÉSUMÉ DE LA SIMULATION`);
  console.log(`  ════════════════════════════════════════`);
  console.log(`  Total commandes créées : ${orderCount}`);
  console.log(`  ✅ Livrées             : ${livreCount} (${Math.round(livreCount/orderCount*100)}%)`);
  console.log(`  🔄 Retournées          : ${retourneCount}`);
  console.log(`  📞 Confirmées          : ${confirmeCount}`);
  console.log(`  📅 Reportées           : ${reporteCount}`);
  console.log(`  🔕 Injoignables        : ${injoignableCount}`);
  console.log(`  ❌ Annulées            : ${annuleCount}`);
  console.log(`  ════════════════════════════════════════`);
  const tauxConf = Math.round((livreCount + retourneCount + confirmeCount) / orderCount * 100);
  const tauxLiv = Math.round(livreCount / (livreCount + retourneCount) * 100);
  console.log(`  Taux confirmation : ~${tauxConf}%`);
  console.log(`  Taux livraison    : ~${tauxLiv}%`);
  console.log(`  ════════════════════════════════════════\n`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
