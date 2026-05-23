import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as any);

function parsePrice(prix: string): number {
  return parseInt(prix.replace(/\s/g, ""), 10);
}

const PRODUCTS = [
  { id: 1,  nom: "Fer à Lisser Céramique Pro",          cat: "beaute",  prix: "185 000" },
  { id: 2,  nom: "Kit Soin Visage Complet 5 en 1",       cat: "beaute",  prix: "200 000" },
  { id: 3,  nom: "Brosse Sèche-Cheveux Ionique",         cat: "beaute",  prix: "175 000" },
  { id: 4,  nom: "Épilateur Sans Douleur Électrique",    cat: "beaute",  prix: "180 000" },
  { id: 5,  nom: "Appareil Massage Anti-Cellulite",      cat: "beaute",  prix: "190 000" },
  { id: 6,  nom: "Masque LED Soin Visage 7 Couleurs",    cat: "beaute",  prix: "220 000" },
  { id: 7,  nom: "Tondeuse Précision Sourcils & Visage", cat: "beaute",  prix: "170 000" },
  { id: 8,  nom: "Coffret Parfum Oriental Luxe",         cat: "beaute",  prix: "240 000" },
  { id: 9,  nom: "Robot Cuiseur Multifonction 5L",       cat: "maison",  prix: "220 000" },
  { id: 10, nom: "Purificateur d'Air UV Silencieux",     cat: "maison",  prix: "200 000" },
  { id: 11, nom: "Mixeur Blender Pro 1500W",             cat: "maison",  prix: "185 000" },
  { id: 12, nom: "Friteuse à Air Chaud 4.5L",           cat: "maison",  prix: "210 000" },
  { id: 13, nom: "Machine à Café Expresso Auto",         cat: "maison",  prix: "230 000" },
  { id: 14, nom: "Aspirateur Sans Fil Cyclonique",       cat: "maison",  prix: "195 000" },
  { id: 15, nom: "Ventilateur Tour Silencieux",          cat: "maison",  prix: "175 000" },
  { id: 16, nom: "Fer à Repasser Vapeur Pro",            cat: "maison",  prix: "170 000" },
  { id: 17, nom: "Lampe Solaire Extérieure 200 LED",     cat: "maison",  prix: "180 000" },
  { id: 18, nom: "Balance de Cuisine Digitale Pro",      cat: "maison",  prix: "170 000" },
  { id: 19, nom: "Montre Connectée Sport Pro GPS",       cat: "tech",    prix: "210 000" },
  { id: 20, nom: "Écouteurs Bluetooth Réduction Bruit",  cat: "tech",    prix: "195 000" },
  { id: 21, nom: "Batterie Externe Solaire 30000mAh",    cat: "tech",    prix: "185 000" },
  { id: 22, nom: "Stabilisateur Gimbal Smartphone",      cat: "tech",    prix: "200 000" },
  { id: 23, nom: "Mini Projecteur Portable 1080p",       cat: "tech",    prix: "240 000" },
  { id: 24, nom: "Enceinte Bluetooth Waterproof 30W",    cat: "tech",    prix: "175 000" },
  { id: 25, nom: "Lampe Annulaire LED Selfie 45cm",      cat: "tech",    prix: "180 000" },
  { id: 26, nom: "Clé WiFi 4G Portable 10 appareils",   cat: "tech",    prix: "190 000" },
  { id: 27, nom: "Vélo d'Appartement Pliable 8 niveaux", cat: "sante",  prix: "245 000" },
  { id: 28, nom: "Tapis de Course Électrique Pliable",   cat: "sante",   prix: "250 000" },
  { id: 29, nom: "Masseur Pistolet Percussion Pro",      cat: "sante",   prix: "200 000" },
  { id: 30, nom: "Tensiomètre Bras Automatique",         cat: "sante",   prix: "175 000" },
  { id: 31, nom: "Corde à Sauter Digitale Lestée",       cat: "sante",   prix: "170 000" },
  { id: 32, nom: "Kit Haltères Réglables 20kg",          cat: "sante",   prix: "235 000" },
  { id: 33, nom: "Sac à Main Cuir Véritable Luxe",       cat: "mode",    prix: "210 000" },
  { id: 34, nom: "Montre Homme Acier Automatique",       cat: "mode",    prix: "220 000" },
  { id: 35, nom: "Lunettes Soleil Polarisées UV400",     cat: "mode",    prix: "175 000" },
  { id: 36, nom: "Ensemble Bogolan Moderne Femme",       cat: "mode",    prix: "185 000" },
  { id: 37, nom: "Sneakers Cuir Premium Homme",          cat: "mode",    prix: "195 000" },
  { id: 38, nom: "Ceinture Cuir Artisanale Luxe",        cat: "mode",    prix: "170 000" },
  { id: 39, nom: "Vélo Enfant 4-7 ans + Stabilisateurs", cat: "enfant", prix: "180 000" },
  { id: 40, nom: "Tablette Éducative Enfant 7 pouces",   cat: "enfant",  prix: "200 000" },
  { id: 41, nom: "Kit Peinture & Dessin 120 pièces",     cat: "enfant",  prix: "170 000" },
  { id: 42, nom: "Trottinette Électrique Enfant",        cat: "enfant",  prix: "230 000" },
  { id: 43, nom: "Trampoline Jardin 3 mètres",           cat: "enfant",  prix: "245 000" },
  { id: 44, nom: "Console Jeux Rétro 400+ Jeux",         cat: "enfant",  prix: "175 000" },
  { id: 45, nom: "Caméra Surveillance WiFi 4K",          cat: "tech",    prix: "195 000" },
  { id: 46, nom: "Climatiseur Portable sans Tuyau",      cat: "maison",  prix: "250 000" },
  { id: 47, nom: "Machine à Coudre Électronique 32 pts", cat: "maison", prix: "235 000" },
  { id: 48, nom: "Générateur Solaire Portable 500W",     cat: "maison",  prix: "248 000" },
  { id: 49, nom: "Plaque à Induction Portable 2000W",    cat: "maison",  prix: "185 000" },
  { id: 50, nom: "Drone Caméra 4K Pliable GPS",          cat: "tech",    prix: "240 000" },
];

const CAT_LABELS: Record<string, string> = {
  beaute: "Beauté", maison: "Maison", tech: "Tech", sante: "Santé", mode: "Mode", enfant: "Enfant",
};

async function main() {
  console.log("Import des produits HPSHOP dans le CRM...\n");

  // Trouver la boutique HPSHOP
  const boutique = await prisma.boutique.findFirst({ where: { name: { contains: "HP" } } });
  if (!boutique) {
    console.error("❌ Boutique HPSHOP non trouvée. Crée-la d'abord dans le CRM.");
    process.exit(1);
  }
  console.log(`✅ Boutique : ${boutique.name}\n`);

  let created = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const sku = `HP-${p.cat.toUpperCase()}-${String(p.id).padStart(3, "0")}`;
    const price = parsePrice(p.prix);
    const catLabel = CAT_LABELS[p.cat] ?? p.cat;

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      await prisma.product.update({
        where: { sku },
        data: { name: p.nom, price, stock: 10, description: catLabel },
      });
      updated++;
      console.log(`  ↻ MAJ  ${sku} — ${p.nom}`);
    } else {
      await prisma.product.create({
        data: {
          sku,
          name: p.nom,
          price,
          stock: 10,
          description: catLabel,
          boutiqueId: boutique.id,
        },
      });
      created++;
      console.log(`  ✅ Créé ${sku} — ${p.nom} — ${p.prix} GNF`);
    }
  }

  // Mettre à jour les frais de livraison à 70 000 GNF
  const citiesUpdated = await prisma.city.updateMany({
    data: { deliveryFee: 70000 },
  });
  console.log(`\n✅ ${created} produits créés, ${updated} mis à jour`);
  console.log(`✅ Frais de livraison mis à jour : 70 000 GNF pour ${citiesUpdated.count} ville(s)`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
