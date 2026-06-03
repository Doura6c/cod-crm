/**
 * Import des produits ASMA SHOP AFRIQUE dans le CRM
 * Lance avec : npx tsx scripts/import-asma-products.ts
 */
import { prisma } from "../lib/prisma";

const PRODUCTS = [
  // 💄 MAQUILLAGE
  { id: "maq-001", cat: "Maquillage",    name: "Rouge à Lèvres Longue Tenue — Mat & Brillant",      price: 85000,  desc: "Longue tenue 12h, 8 teintes peau africaine, non desséchant, sans paraben.",           image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80" },
  { id: "maq-002", cat: "Maquillage",    name: "Fond de Teint Couvrant Peau Noire",                  price: 130000, desc: "Spécial peaux noires/métissées, anti-oxydation, SPF 20, fini naturel.",               image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80" },
  { id: "maq-003", cat: "Maquillage",    name: "Palette 18 Ombres à Paupières — Smoky & Nude",       price: 95000,  desc: "Palette pro 18 teintes, poudre ultra-pigmentée, longue tenue.",                     image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80" },
  { id: "maq-004", cat: "Maquillage",    name: "Mascara Volume Extrême & Allongement",               price: 70000,  desc: "Waterproof, volume ×3, anti-grumeaux, résistant chaleur.",                         image: "https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400&q=80" },

  // 🌸 SOINS VISAGE
  { id: "vis-001", cat: "Soins Visage",  name: "Crème Éclat & Uniformisante Peau Noire",             price: 150000, desc: "Sans mercure ni hydroquinone, vitamine C, niacinamide, résultats 2 semaines.",      image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80" },
  { id: "vis-002", cat: "Soins Visage",  name: "Sérum Vitamine C Anti-Taches Concentré",             price: 190000, desc: "Vitamine C pure 20%, anti-taches, anti-âge, absorption rapide.",                   image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80" },
  { id: "vis-003", cat: "Soins Visage",  name: "Masque Purifiant Argile & Charbon Actif",            price: 65000,  desc: "Argile blanche + charbon actif, pores resserrés, effet mat, peaux mixtes/grasses.", image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80" },
  { id: "vis-004", cat: "Soins Visage",  name: "Huile d'Argan Pure Bio — Anti-Âge",                 price: 160000, desc: "100% pure, certifiée bio, multi-usage visage/cheveux/ongles, sans conservateur.",   image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&q=80" },

  // 💆 SOINS CORPS
  { id: "cor-001", cat: "Soins Corps",   name: "Lait Corporel Hydratant Parfumé — Rose & Vanille",   price: 120000, desc: "Beurre de karité + huile de coco, hydratation 24h, peau lumineuse, parfum rose.",   image: "https://images.unsplash.com/photo-1622618991746-fe6004db3a47?w=400&q=80" },
  { id: "cor-002", cat: "Soins Corps",   name: "Huile de Coco Naturelle Multi-Usage",                price: 85000,  desc: "Vierge pressée à froid, peau/cheveux/ongles, 100% naturelle sans additifs.",        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id: "cor-003", cat: "Soins Corps",   name: "Gommage Corps Café & Sucre de Canne",                price: 110000, desc: "Exfoliant naturel café + sucre, anti-cellulite, peau lumineuse, parfum café.",      image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80" },

  // 🌺 PARFUMS
  { id: "par-001", cat: "Parfums",       name: "Parfum Oriental Rose & Oud — Longue Tenue",          price: 260000, desc: "Notes oud+rose+musc, tenue 24h, formule concentrée.",                              image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=80" },
  { id: "par-002", cat: "Parfums",       name: "Eau de Parfum Fleur de Guinée",                      price: 210000, desc: "Hibiscus, jasmin, rose africaine, santal, musc. Fabriqué en Guinée.",              image: "https://images.unsplash.com/photo-1595535873420-a599195b3f4a?w=400&q=80" },
  { id: "par-003", cat: "Parfums",       name: "Brume Parfumée Musc & Vanille — Corps & Cheveux",    price: 90000,  desc: "Légère, musc blanc + vanille, pour corps/cheveux/vêtements, rechargeable.",        image: "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?w=400&q=80" },

  // 👗 MODE FEMME
  { id: "mod-001", cat: "Mode Femme",    name: "Ensemble Boubou Moderne — Tissus Africains",         price: 450000, desc: "Tissu africain brodé main, tailles S-XXL, sur mesure en différents coloris.",      image: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&q=80" },
  { id: "mod-002", cat: "Mode Femme",    name: "Robe Wax Africaine — Coupe Moderne",                 price: 380000, desc: "Wax authentique, coupe flatteuse, tissu respirant, cérémonies et sorties.",        image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80" },

  // 🧼 SAVONS NATURELS
  { id: "sav-001", cat: "Savons",        name: "Savon à l'Huile d'Argan Pur — Éclat & Nutrition",   price: 35000,  desc: "Huile d'argan Maroc, visage et corps, sans sulfates ni parabens.",                  image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&q=80" },
  { id: "sav-002", cat: "Savons",        name: "Savon au Lait de Chameau — Anti-Âge & Hydratation",  price: 45000,  desc: "Lait de chameau frais, vitamines A/B/C, anti-âge, résultats 2 semaines.",           image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },
  { id: "sav-003", cat: "Savons",        name: "Savon à la Résine Naturelle — Purifiant & Antiseptique", price: 30000, desc: "Résine africaine, anti-acné, antiseptique, recette ancestrale.",               image: "https://images.unsplash.com/photo-1556760544-74068565f05c?w=400&q=80" },
  { id: "sav-004", cat: "Savons",        name: "Savon au Citron Africain — Éclat & Anti-Taches",    price: 28000,  desc: "Vitamine C naturelle, anti-taches, exfoliant doux, toutes carnations.",              image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&q=80" },
  { id: "sav-005", cat: "Savons",        name: "Savon au Charbon Actif & Argile Noire — Détox Pores", price: 32000, desc: "Charbon actif + argile noire, pores nets, régule sébum, peaux grasses/mixtes.",    image: null },
  { id: "sav-006", cat: "Savons",        name: "Savon au Beurre de Karité & Rose — Ultra-Nourrissant", price: 32000, desc: "Surgras karité + pétales de rose, peaux sèches sensibles, veloutée 24h.",         image: null },

  // 👔 HOMME
  { id: "hom-001", cat: "Homme",         name: "Parfum Homme Oriental — Oud & Bois de Santal",      price: 280000, desc: "Notes oud noir, santal, musc ambré, tenue 24h, sillage intense.",                   image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=80" },
  { id: "hom-002", cat: "Homme",         name: "Crème Hydratante Homme — Légère & Non Grasse",      price: 95000,  desc: "Texture légère, vitamine E + aloe vera, hydrate et unifie le teint masculin.",     image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80" },
  { id: "hom-003", cat: "Homme",         name: "Huile Barbe Premium à l'Argan & Jojoba",            price: 75000,  desc: "Adoucit et fait briller la barbe, anti-démangeaisons, parfum boisé.",               image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80" },
  { id: "hom-004", cat: "Homme",         name: "After-Shave Naturel — Apaisant & Anti-Irritations", price: 65000,  desc: "Aloe vera + hamamélis + argan, referme les pores, parfum agrumes.",                 image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80" },
  { id: "hom-005", cat: "Homme",         name: "Savon Homme Actif — Charbon & Menthe Fraîche",      price: 35000,  desc: "Charbon purifiant + menthe tonifiante, anti-odeurs, fraîcheur durable.",             image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&q=80" },

  // 💍 BIJOUX
  { id: "bij-001", cat: "Bijoux",        name: "Parure Collier & Boucles Perles Africaines",        price: 120000, desc: "Artisanal guinéen, perles naturelles, collier + boucles, mariages/cérémonies.",    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80" },
  { id: "bij-002", cat: "Bijoux",        name: "Set Bracelet Femme — Or & Plaqué Or",               price: 75000,  desc: "5 bracelets or/plaqué or rosé, hypoallergénique, résistant eau, idéal cadeau.",    image: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&q=80" },
];

async function main() {
  console.log("🚀 Import des produits ASMA SHOP AFRIQUE...\n");

  // Trouver la boutique ASMA SHOP
  const boutique = await prisma.boutique.findFirst({
    where: { name: { contains: "ASMA" } },
  });

  if (!boutique) {
    console.error("❌ Boutique ASMA SHOP non trouvée en base.");
    console.error("   Crée-la d'abord dans le CRM : /boutiques/nouvelle");
    process.exit(1);
  }

  console.log(`✅ Boutique trouvée : ${boutique.name} (${boutique.id})\n`);

  let created = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const sku = `ASMA-${p.id.toUpperCase()}`;

    const existing = await prisma.product.findUnique({ where: { sku } });

    if (existing) {
      await prisma.product.update({
        where: { sku },
        data: {
          name: p.name,
          description: `${p.cat} · ${p.desc}`,
          price: p.price,
          imageUrl: p.image ?? undefined,
          boutiqueId: boutique.id,
          active: true,
        },
      });
      updated++;
      console.log(`  ↻ MAJ   ${sku} — ${p.name}`);
    } else {
      await prisma.product.create({
        data: {
          sku,
          name: p.name,
          description: `${p.cat} · ${p.desc}`,
          price: p.price,
          stock: 10,
          stockAlert: 3,
          imageUrl: p.image ?? undefined,
          boutiqueId: boutique.id,
          active: true,
        },
      });
      created++;
      console.log(`  ✅ Créé  ${sku} — ${p.name} — ${p.price.toLocaleString("fr-FR")} GNF`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ${created} produits créés`);
  console.log(`↻  ${updated} produits mis à jour`);
  console.log(`📦 Total : ${PRODUCTS.length} produits ASMA SHOP dans le CRM`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
