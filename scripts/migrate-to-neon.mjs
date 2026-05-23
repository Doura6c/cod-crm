// Script de migration SQLite → Neon PostgreSQL
import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEON_URL = "postgresql://neondb_owner:npg_FIti19pGYfjX@ep-broad-firefly-alj9kzfo.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const sqlite = new Database(path.resolve(__dirname, "../dev.db"));
const { Pool } = pg;
const pool = new Pool({ connectionString: NEON_URL });

function boolToInt(v) { return v ? true : false; }
function toDate(v) { return v ? new Date(v) : null; }

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Users
    console.log("→ Migration Users...");
    const users = sqlite.prepare("SELECT * FROM User").all();
    for (const u of users) {
      await client.query(`
        INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, active, "avatarUrl", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `, [u.id, u.email, u.passwordHash, u.firstName, u.lastName, u.phone, u.role, boolToInt(u.active), u.avatarUrl, toDate(u.createdAt), toDate(u.updatedAt)]);
    }
    console.log(`   ✓ ${users.length} users`);

    // 2. Cities
    console.log("→ Migration Cities...");
    const cities = sqlite.prepare("SELECT * FROM City").all();
    for (const c of cities) {
      await client.query(`
        INSERT INTO "City" (id, name, "deliveryFee", "estimatedDays", active, "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [c.id, c.name, c.deliveryFee, c.estimatedDays, boolToInt(c.active), toDate(c.createdAt)]);
    }
    console.log(`   ✓ ${cities.length} cities`);

    // 3. Settings
    console.log("→ Migration Settings...");
    const settings = sqlite.prepare("SELECT * FROM Setting").all();
    for (const s of settings) {
      await client.query(`
        INSERT INTO "Setting" (key, value, "updatedAt")
        VALUES ($1,$2,$3)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"
      `, [s.key, s.value, toDate(s.updatedAt)]);
    }
    console.log(`   ✓ ${settings.length} settings`);

    // 4. Boutiques
    console.log("→ Migration Boutiques...");
    const boutiques = sqlite.prepare("SELECT * FROM Boutique").all();
    for (const b of boutiques) {
      await client.query(`
        INSERT INTO "Boutique" (id, name, slug, "sellerName", "sellerPhone", "sellerEmail", website, "webhookKey", active, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `, [b.id, b.name, b.slug, b.sellerName, b.sellerPhone, b.sellerEmail, b.website, b.webhookKey, boolToInt(b.active), toDate(b.createdAt), toDate(b.updatedAt)]);
    }
    console.log(`   ✓ ${boutiques.length} boutiques`);

    // 5. Products
    console.log("→ Migration Products...");
    const products = sqlite.prepare("SELECT * FROM Product").all();
    for (const p of products) {
      await client.query(`
        INSERT INTO "Product" (id, sku, name, description, price, "costPrice", stock, "stockAlert", "imageUrl", active, "boutiqueId", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.sku, p.name, p.description, p.price, p.costPrice, p.stock, p.stockAlert, p.imageUrl, boolToInt(p.active), p.boutiqueId, toDate(p.createdAt), toDate(p.updatedAt)]);
    }
    console.log(`   ✓ ${products.length} products`);

    // 6. Customers
    console.log("→ Migration Customers...");
    const customers = sqlite.prepare("SELECT * FROM Customer").all();
    for (const c of customers) {
      await client.query(`
        INSERT INTO "Customer" (id, "fullName", phone, "altPhone", address, "cityId", commune, notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING
      `, [c.id, c.fullName, c.phone, c.altPhone, c.address, c.cityId, c.commune, c.notes, toDate(c.createdAt), toDate(c.updatedAt)]);
    }
    console.log(`   ✓ ${customers.length} customers`);

    // 7. Orders
    console.log("→ Migration Orders...");
    const orders = sqlite.prepare('SELECT * FROM "Order"').all();
    for (const o of orders) {
      await client.query(`
        INSERT INTO "Order" (id, code, "boutiqueId", "customerId", "cityId", status, "subStatus", "totalAmount", "deliveryFee", "callCount", notes, "reportDate", "assignedAgentId", "validatedById", "validatedAt", source, "externalRef", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        ON CONFLICT (id) DO NOTHING
      `, [o.id, o.code, o.boutiqueId, o.customerId, o.cityId, o.status, o.subStatus, o.totalAmount, o.deliveryFee, o.callCount, o.notes, toDate(o.reportDate), o.assignedAgentId, o.validatedById, toDate(o.validatedAt), o.source, o.externalRef, toDate(o.createdAt), toDate(o.updatedAt)]);
    }
    console.log(`   ✓ ${orders.length} orders`);

    // 8. OrderItems
    console.log("→ Migration OrderItems...");
    const items = sqlite.prepare("SELECT * FROM OrderItem").all();
    for (const i of items) {
      await client.query(`
        INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, "unitPrice", subtotal)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [i.id, i.orderId, i.productId, i.quantity, i.unitPrice, i.subtotal]);
    }
    console.log(`   ✓ ${items.length} orderItems`);

    // 9. CallLogs
    console.log("→ Migration CallLogs...");
    const logs = sqlite.prepare("SELECT * FROM CallLog").all();
    for (const l of logs) {
      await client.query(`
        INSERT INTO "CallLog" (id, "orderId", "agentId", outcome, note, "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [l.id, l.orderId, l.agentId, l.outcome, l.note, toDate(l.createdAt)]);
    }
    console.log(`   ✓ ${logs.length} callLogs`);

    // 10. Deliveries
    console.log("→ Migration Deliveries...");
    const deliveries = sqlite.prepare("SELECT * FROM Delivery").all();
    for (const d of deliveries) {
      await client.query(`
        INSERT INTO "Delivery" (id, "orderId", "livreurId", "cityId", status, "scheduledAt", "pickedUpAt", "deliveredAt", "amountCollected", "originalAmount", "amountEditNote", "amountEditedById", "amountEditedAt", "failureReason", notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO NOTHING
      `, [d.id, d.orderId, d.livreurId, d.cityId, d.status, toDate(d.scheduledAt), toDate(d.pickedUpAt), toDate(d.deliveredAt), d.amountCollected, d.originalAmount, d.amountEditNote, d.amountEditedById, toDate(d.amountEditedAt), d.failureReason, d.notes, toDate(d.createdAt), toDate(d.updatedAt)]);
    }
    console.log(`   ✓ ${deliveries.length} deliveries`);

    // 11. Expenses
    console.log("→ Migration Expenses...");
    const expenses = sqlite.prepare("SELECT * FROM Expense").all();
    for (const e of expenses) {
      await client.query(`
        INSERT INTO "Expense" (id, reference, category, description, amount, date, "paidTo", notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING
      `, [e.id, e.reference, e.category, e.description, e.amount, toDate(e.date), e.paidTo, e.notes, toDate(e.createdAt), toDate(e.updatedAt)]);
    }
    console.log(`   ✓ ${expenses.length} expenses`);

    await client.query("COMMIT");
    console.log("\n✅ Migration terminée avec succès !");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur :", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run();
