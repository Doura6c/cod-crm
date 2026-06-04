// Génère 5 PDF d'onboarding (un par rôle) dans public/guides/.
// Usage : node scripts/build-onboarding-pdfs.mjs
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "guides");
const LOGO = path.join(ROOT, "public", "logo.jpeg");

const NAVY = "#002C6E";
const RED = "#E8001C";
const GREY = "#666666";
const LIGHT = "#F2F2F2";
const NAVY_BG = "#E6ECF5";
const RED_BG = "#FBE0E2";
const TIP_BG = "#FFF4D6";
const TIP_AC = "#C9991F";

// ─────────────────────────── Renderer ───────────────────────────
function makeDoc(title) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 64, bottom: 60, left: 56, right: 56 }, bufferPages: true });
  doc._title = title;
  return doc;
}

const ML = 56, MR = 56, MT = 64, MB = 60;
function cw(doc) { return doc.page.width - ML - MR; }
function bottom(doc) { return doc.page.height - MB; }

function ensure(doc, h) {
  if (doc.y + h > bottom(doc)) doc.addPage();
}

function H1(doc, text) {
  ensure(doc, 50);
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(17).fillColor(NAVY).text(text, ML, doc.y, { width: cw(doc) });
  const y = doc.y + 3;
  doc.moveTo(ML, y).lineTo(ML + cw(doc), y).lineWidth(2).strokeColor(RED).stroke();
  doc.y = y + 10;
}

function H2(doc, text) {
  ensure(doc, 40);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(NAVY).text(text, ML, doc.y, { width: cw(doc) });
  doc.y += 4;
}

function P(doc, text) {
  const h = doc.font("Helvetica").fontSize(10.5).heightOfString(text, { width: cw(doc) });
  ensure(doc, h);
  doc.fillColor("#222222").text(text, ML, doc.y, { width: cw(doc), align: "justify", lineGap: 2 });
  doc.y += 4;
}

function BUL(doc, text) {
  const indent = 16;
  const w = cw(doc) - indent;
  const h = doc.font("Helvetica").fontSize(10.5).heightOfString(text, { width: w });
  ensure(doc, h + 2);
  const y0 = doc.y;
  doc.fillColor(RED).text("•", ML, y0, { width: 10 });
  doc.fillColor("#222222").text(text, ML + indent, y0, { width: w, lineGap: 2 });
  doc.y = Math.max(doc.y, y0 + h) + 3;
}

function STEP(doc, n, text) {
  const indent = 22;
  const w = cw(doc) - indent;
  const h = doc.font("Helvetica").fontSize(10.5).heightOfString(text, { width: w });
  ensure(doc, h + 2);
  const y0 = doc.y;
  doc.font("Helvetica-Bold").fillColor(NAVY).fontSize(10.5).text(n + ".", ML, y0, { width: indent - 4 });
  doc.font("Helvetica").fillColor("#222222").text(text, ML + indent, y0, { width: w, lineGap: 2 });
  doc.y = Math.max(doc.y, y0 + h) + 3;
}

function callout(doc, label, text, bg, accent) {
  const padX = 12, padY = 9, bar = 5;
  const w = cw(doc) - padX * 2 - bar;
  doc.font("Helvetica-Bold").fontSize(10);
  const labelW = doc.widthOfString(label + "  ");
  doc.font("Helvetica").fontSize(10.5);
  // Combine label + text height: render label then text continued
  const full = label + "  " + text;
  const th = doc.font("Helvetica").fontSize(10.5).heightOfString(full, { width: w });
  const boxH = th + padY * 2;
  ensure(doc, boxH + 6);
  const x = ML, y = doc.y;
  doc.save();
  doc.roundedRect(x, y, cw(doc), boxH, 4).fill(bg);
  doc.rect(x, y, bar, boxH).fill(accent);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(accent)
    .text(label + "  ", x + bar + padX, y + padY, { width: w, continued: true });
  doc.font("Helvetica").fillColor("#222222").text(text, { width: w });
  doc.y = y + boxH + 8;
}
const NOTE = (d, t) => callout(d, "NOTE —", t, NAVY_BG, NAVY);
const WARN = (d, t) => callout(d, "ATTENTION —", t, RED_BG, RED);
const TIP = (d, t) => callout(d, "ASTUCE —", t, TIP_BG, TIP_AC);

function CAPTURE(doc, text) {
  const label = "[ CAPTURE : " + text + " ]";
  const w = cw(doc) - 24;
  const th = doc.font("Helvetica-Oblique").fontSize(9.5).heightOfString(label, { width: w });
  const boxH = th + 18;
  ensure(doc, boxH + 6);
  const x = ML, y = doc.y;
  doc.save();
  doc.roundedRect(x, y, cw(doc), boxH, 4).fillColor("#F7F7F7").fill();
  doc.roundedRect(x, y, cw(doc), boxH, 4).lineWidth(1).dash(3, { space: 2 }).strokeColor(GREY).stroke();
  doc.undash();
  doc.restore();
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(GREY)
    .text(label, x + 12, y + 9, { width: w, align: "center" });
  doc.y = y + boxH + 8;
}

// Tableau 2 colonnes générique
function table(doc, headers, rows, widths) {
  const totalW = cw(doc);
  const w = widths || [totalW * 0.32, totalW * 0.68];
  const padX = 8, padY = 6;

  function rowHeight(cells, bold) {
    let max = 0;
    cells.forEach((c, i) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
      const hh = doc.heightOfString(String(c), { width: w[i] - padX * 2 });
      if (hh > max) max = hh;
    });
    return max + padY * 2;
  }
  function drawRow(cells, { bold = false, headerRow = false, zebra = false } = {}) {
    const rh = rowHeight(cells, bold);
    ensure(doc, rh);
    const y = doc.y;
    let x = ML;
    cells.forEach((c, i) => {
      doc.save();
      if (headerRow) doc.rect(x, y, w[i], rh).fill(NAVY);
      else if (zebra) doc.rect(x, y, w[i], rh).fill(LIGHT);
      else doc.rect(x, y, w[i], rh).fill("#FFFFFF");
      doc.rect(x, y, w[i], rh).lineWidth(0.5).strokeColor("#CCCCCC").stroke();
      doc.restore();
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5)
        .fillColor(headerRow ? "#FFFFFF" : "#222222")
        .text(String(c), x + padX, y + padY, { width: w[i] - padX * 2 });
      x += w[i];
    });
    doc.y = y + rh;
  }
  drawRow(headers, { bold: true, headerRow: true });
  rows.forEach((r, i) => drawRow(r, { bold: false, zebra: i % 2 === 1 }));
  doc.y += 6;
}

function permTable(doc, rows) {
  table(doc, ["Actions AUTORISÉES", "Actions INTERDITES / hors périmètre"], rows, [cw(doc) / 2, cw(doc) / 2]);
}

function FAQ(doc, items) {
  items.forEach(([q, a], i) => {
    const qh = doc.font("Helvetica-Bold").fontSize(10.5).heightOfString("Q" + (i + 1) + ". " + q, { width: cw(doc) });
    ensure(doc, qh + 24);
    doc.font("Helvetica-Bold").fillColor(NAVY).text("Q" + (i + 1) + ". " + q, ML, doc.y, { width: cw(doc) });
    doc.y += 2;
    doc.font("Helvetica-Bold").fillColor("#222222").fontSize(10.5).text("R. ", ML, doc.y, { continued: true });
    doc.font("Helvetica").fillColor("#222222").text(a, { width: cw(doc), lineGap: 2 });
    doc.y += 6;
  });
}

// Cover page
function cover(doc, roleLabel, subtitle) {
  let y = MT + 10;
  try {
    if (fs.existsSync(LOGO)) { doc.image(LOGO, ML, y, { fit: [120, 60] }); }
  } catch {}
  y += 80;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY)
    .text("Help", ML, y, { continued: true })
    .fillColor(RED).text("Me", { continued: true })
    .fillColor(NAVY).text("Process — Conakry, Guinée", { continued: false });
  doc.y = doc.page.height / 2 - 120;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(GREY).text("GUIDE D’ONBOARDING — CRM COD", ML, doc.y, { width: cw(doc) });
  doc.moveDown(0.4);
  doc.moveTo(ML, doc.y).lineTo(ML + cw(doc), doc.y).lineWidth(3).strokeColor(RED).stroke();
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(RED).text("PROFIL UTILISATEUR", ML, doc.y);
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(34).fillColor(NAVY).text(roleLabel, ML, doc.y, { width: cw(doc) });
  doc.moveDown(0.3);
  doc.font("Helvetica-Oblique").fontSize(13).fillColor(GREY).text(subtitle, ML, doc.y, { width: cw(doc) });
  doc.y = doc.page.height - MB - 90;
  doc.font("Helvetica").fontSize(10).fillColor(GREY)
    .text("Document d’onboarding — Version 1.0 — Juin 2026", ML, doc.y, { width: cw(doc) });
  doc.text("Application : https://cod-crm-zeta.vercel.app/login", { width: cw(doc) });
  doc.text("Confidentiel — Réservé aux utilisateurs autorisés du CRM COD.", { width: cw(doc) });
  doc.addPage();
}

// Header + footer sur les pages de contenu
function decorate(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === range.start) continue; // pas sur la couverture
    // Empêche pdfkit d'ajouter une page quand on écrit dans les marges haute/basse
    const mb = doc.page.margins.bottom, mt = doc.page.margins.top;
    doc.page.margins.bottom = 0;
    doc.page.margins.top = 0;
    // header
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(NAVY)
      .text("Help", ML, 34, { continued: true })
      .fillColor(RED).text("Me", { continued: true })
      .fillColor(NAVY).text("Process", { continued: true })
      .fillColor(GREY).font("Helvetica").text("   Guide d’utilisation CRM COD", { continued: false });
    doc.moveTo(ML, 50).lineTo(doc.page.width - MR, 50).lineWidth(0.7).strokeColor(NAVY).stroke();
    // footer
    const fy = doc.page.height - 44;
    doc.moveTo(ML, fy).lineTo(doc.page.width - MR, fy).lineWidth(0.7).strokeColor(NAVY).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(GREY)
      .text("Confidentiel — HelpMeProcess", ML, fy + 6, { width: cw(doc) / 2 });
    doc.font("Helvetica").fontSize(8).fillColor(GREY)
      .text("Page " + (i - range.start) + " / " + (range.count - 1), ML + cw(doc) / 2, fy + 6, { width: cw(doc) / 2, align: "right" });
    doc.page.margins.bottom = mb;
    doc.page.margins.top = mt;
  }
}

// ─────────────────────────── Contenu par rôle ───────────────────────────
const URL = "https://cod-crm-zeta.vercel.app/login";

const PROFILES = {
  AGENT: {
    file: "onboarding-AGENT.pdf",
    label: "Agent Call Center",
    subtitle: "Appeler, confirmer et qualifier les commandes",
    build(doc) {
      H1(doc, "Agent Call Center");
      H2(doc, "Votre rôle et votre périmètre");
      P(doc, "En tant qu’agent du call center, vous êtes le premier contact humain avec le client. Votre mission : appeler les clients dont les commandes vous sont assignées, confirmer leur intention d’achat, vérifier les informations de livraison (adresse, téléphone, produit, quantité) et faire passer chaque commande de « Nouveau » à « Confirmé » ou « Annulé ».");
      P(doc, "Vous travaillez uniquement sur vos commandes assignées. Vous ne pouvez ni réassigner une commande à un autre agent, ni modifier les paramètres de l’application : ces actions relèvent du superviseur et de l’administrateur.");
      NOTE(doc, "La qualité de votre saisie (notes d’appel, motifs, rappels) conditionne tout le travail en aval : livreur, superviseur et boutique s’appuient sur vos informations.");

      H2(doc, "Connexion");
      STEP(doc, 1, "Ouvrez votre navigateur et allez sur " + URL + ".");
      STEP(doc, 2, "Saisissez votre e-mail (ou identifiant) et votre mot de passe fournis par l’administrateur.");
      STEP(doc, 3, "Cliquez sur « Se connecter ». Vous arrivez sur votre tableau de bord agent.");
      CAPTURE(doc, "Écran de connexion avec e-mail et mot de passe");
      CAPTURE(doc, "Tableau de bord agent avec la liste des commandes assignées");
      WARN(doc, "Ne partagez jamais votre mot de passe. Chaque action est enregistrée sous votre nom et engage votre responsabilité.");

      H2(doc, "Fonctionnalités accessibles");
      ["Consulter la liste de vos commandes assignées et ouvrir chaque fiche en détail.",
       "Appeler le client depuis la fiche, ou recopier son numéro.",
       "Mettre à jour le statut : « Nouveau » puis « Confirmé » ou « Annulé ».",
       "Saisir une note d’appel à chaque tentative de contact.",
       "Choisir un motif d’annulation dans la liste prévue.",
       "Programmer un rappel à une date et une heure précises.",
       "Corriger une adresse ou un numéro erroné (si votre droit le permet).",
       "Consulter l’historique des échanges sur la commande."].forEach(t => BUL(doc, t));

      H2(doc, "Procédure : traiter une commande de A à Z");
      STEP(doc, 1, "Ouvrez la première commande au statut « Nouveau ».");
      STEP(doc, 2, "Lisez les informations client et produit avant d’appeler.");
      STEP(doc, 3, "Appelez le client et présentez-vous au nom de la boutique concernée.");
      STEP(doc, 4, "Confirmez : produit, quantité, prix, adresse exacte et numéro joignable.");
      STEP(doc, 5, "Choisissez l’action : « Confirmé », « Annulé » (+ motif) ou « Rappel ».");
      STEP(doc, 6, "Saisissez systématiquement une note d’appel, même en cas de non-réponse.");
      STEP(doc, 7, "Enregistrez : la commande quitte votre file « à traiter ».");
      TIP(doc, "Avant de raccrocher, répétez l’adresse de livraison au client : c’est le moyen le plus simple d’éviter un échec de livraison.");

      H2(doc, "Saisir une note et un motif d’annulation");
      STEP(doc, 1, "Dans « Notes d’appel », décrivez factuellement le résultat de l’échange.");
      STEP(doc, 2, "Pour annuler, cliquez sur « Annulé » : un menu de motifs apparaît.");
      STEP(doc, 3, "Choisissez le motif le plus précis (injoignable, changement d’avis, doublon, prix, hors zone…).");
      STEP(doc, 4, "Validez : le motif et la note sont horodatés sous votre nom.");

      H2(doc, "Programmer et traiter un rappel");
      STEP(doc, 1, "Cliquez sur « Programmer un rappel » et choisissez date et heure.");
      STEP(doc, 2, "Ajoutez une note expliquant la raison du rappel.");
      STEP(doc, 3, "À l’heure prévue, la commande réapparaît dans « Rappels du jour ».");
      STEP(doc, 4, "Rappelez et finalisez (confirmation, annulation ou nouveau rappel).");
      WARN(doc, "Ne reprogrammez pas indéfiniment un rappel. Au-delà du nombre de tentatives fixé (souvent 3), annulez avec le motif « Injoignable ».");

      H2(doc, "Éviter les doublons");
      P(doc, "Un doublon est une même commande qui apparaît deux fois. La traiter comme une vraie commande génère une double livraison et une perte pour la boutique.");
      ["Avant de confirmer, vérifiez si le même nom, numéro ou adresse apparaît déjà récemment.",
       "En cas de doute, demandez au client s’il a commandé une ou deux fois.",
       "Si doublon avéré : confirmez une seule commande, annulez l’autre avec le motif « Doublon ».",
       "Signalez les doublons récurrents à votre superviseur."].forEach(t => BUL(doc, t));

      H2(doc, "Droits : autorisé vs interdit");
      permTable(doc, [
        ["Traiter ses commandes assignées", "Voir/modifier les commandes d’un autre agent"],
        ["Confirmer, annuler, programmer un rappel", "Réassigner une commande à un autre agent"],
        ["Saisir notes et motifs d’annulation", "Supprimer définitivement une commande"],
        ["Corriger une adresse / un numéro erroné", "Importer les commandes depuis Afrishop"],
        ["Marquer et annuler un doublon", "Créer ou supprimer des comptes"],
        ["Consulter l’historique de ses appels", "Voir les rapports globaux et les autres agents"],
      ]);

      H2(doc, "FAQ");
      FAQ(doc, [
        ["Je ne vois aucune commande, est-ce normal ?", "Aucune commande ne vous est assignée pour l’instant, ou tout est traité. Actualisez ; sinon, prévenez votre superviseur."],
        ["J’ai confirmé par erreur, puis-je revenir en arrière ?", "Oui tant que la commande n’est pas partie en livraison : rouvrez la fiche, corrigez le statut, ajoutez une note. Sinon, prévenez votre superviseur."],
        ["Le client ne répond pas, que faire ?", "Notez « Sans réponse », programmez un rappel à un autre horaire. Après le nombre de tentatives défini, annulez avec « Injoignable »."],
        ["Comment savoir si c’est un doublon ?", "Comparez nom, téléphone et adresse avec les commandes récentes, et confirmez avec le client. Gardez-en une, annulez l’autre (« Doublon »)."],
        ["Puis-je modifier le prix ou le produit ?", "Non : ils viennent d’Afrishop. Notez la contestation et remontez l’information à votre superviseur."],
      ]);

      H2(doc, "Bonnes pratiques");
      ["Souriez au téléphone : un ton chaleureux augmente le taux de confirmation.",
       "Traitez en priorité les commandes les plus récentes.",
       "Saisissez vos notes pendant l’appel, pas après.",
       "Restez factuel : vos notes sont lues par le superviseur et la boutique.",
       "En fin de journée, vérifiez qu’aucune commande « Nouveau » ne reste dans votre file."].forEach(t => BUL(doc, t));
    },
  },

  MANAGER: {
    file: "onboarding-MANAGER.pdf",
    label: "Superviseur",
    subtitle: "Piloter l’activité, répartir et contrôler la qualité",
    build(doc) {
      H1(doc, "Superviseur");
      H2(doc, "Votre rôle et votre périmètre");
      P(doc, "Le superviseur orchestre l’activité du call center et de la livraison. Vous avez une vue d’ensemble sur toutes les commandes et tous les agents. Votre mission : garantir un traitement rapide, une répartition équitable, une qualification correcte et des indicateurs dans les objectifs.");
      P(doc, "Vous pouvez réassigner des commandes, contrôler la qualité, suivre les performances, générer les rapports et réagir aux anomalies. La configuration profonde et la gestion des comptes relèvent de l’administrateur.");
      NOTE(doc, "Votre rôle est autant humain que technique : derrière chaque indicateur en baisse, il y a souvent un agent à accompagner ou un processus à ajuster.");

      H2(doc, "Connexion");
      STEP(doc, 1, "Allez sur " + URL + " et connectez-vous avec votre compte superviseur.");
      STEP(doc, 2, "Vous arrivez sur le tableau de bord qui agrège l’activité de toute l’équipe.");
      CAPTURE(doc, "Tableau de bord superviseur avec indicateurs globaux et répartition par agent");

      H2(doc, "Le tableau de bord");
      table(doc, ["Indicateur", "Ce qu’il vous apprend"], [
        ["Commandes du jour", "Volume total et répartition par statut."],
        ["Taux de confirmation", "Part des commandes confirmées — indicateur clé."],
        ["Taux d’annulation", "Part des annulations ; un pic doit être analysé."],
        ["Commandes en attente", "Commandes « Nouveau » non traitées, à répartir."],
        ["Performance par agent", "Volume traité, confirmé, annulé par agent."],
        ["Suivi des livraisons", "Commandes en route, livrées et en échec."],
      ]);

      H2(doc, "Fonctionnalités accessibles");
      ["Visualiser toutes les commandes, quel que soit l’agent ou le statut.",
       "Filtrer par agent, statut, date, boutique ou zone.",
       "Suivre en temps réel les performances individuelles et collectives.",
       "Réassigner une ou plusieurs commandes entre agents.",
       "Contrôler la qualité : relire notes et motifs, repérer les saisies incomplètes.",
       "Générer et exporter les rapports journaliers.",
       "Traiter les alertes : doublons, taux d’annulation élevé, commandes bloquées.",
       "Suivre l’avancement des livraisons et relancer les échecs."].forEach(t => BUL(doc, t));

      H2(doc, "Procédure : réassigner des commandes");
      STEP(doc, 1, "Filtrez la liste (ex. : commandes d’un agent absent).");
      STEP(doc, 2, "Cochez la ou les commandes à réassigner.");
      STEP(doc, 3, "Cliquez sur « Réassigner » et choisissez l’agent destinataire.");
      STEP(doc, 4, "Validez : les commandes passent dans la file du nouvel agent.");
      TIP(doc, "Répartissez tôt et rééquilibrez en milieu de journée : un agent ne doit jamais avoir une file vide pendant qu’un autre est surchargé.");

      H2(doc, "Procédure : contrôle qualité d’un agent");
      STEP(doc, 1, "Sélectionnez un agent dans le tableau de performance.");
      STEP(doc, 2, "Parcourez un échantillon de ses commandes confirmées et annulées.");
      STEP(doc, 3, "Vérifiez la présence et la pertinence des notes et des motifs.");
      STEP(doc, 4, "Repérez les signaux faibles : motifs « Autre » fréquents, notes vides, annulations en rafale.");
      STEP(doc, 5, "Faites un retour à l’agent et consignez le point au besoin.");

      H2(doc, "Procédure : rapport journalier");
      STEP(doc, 1, "Allez dans « Rapports ».");
      STEP(doc, 2, "Sélectionnez la période (par défaut, la journée).");
      STEP(doc, 3, "Choisissez les indicateurs, filtrez par agent ou boutique si besoin.");
      STEP(doc, 4, "Cliquez sur « Générer » puis « Exporter » (PDF ou tableur).");
      CAPTURE(doc, "Écran de génération de rapport avec sélecteur de période et bouton d’export");

      H2(doc, "Alertes et anomalies");
      table(doc, ["Anomalie", "Action recommandée"], [
        ["Doublons détectés", "Vérifier, garder une commande, annuler l’autre (« Doublon ») ; alerter l’admin si volume anormal."],
        ["Taux d’annulation élevé", "Identifier l’agent, la boutique ou le motif en cause ; coacher ou remonter un problème produit/prix."],
        ["Commandes bloquées", "Repérer les « Nouveau » trop anciennes et les réassigner pour traitement immédiat."],
        ["Échecs de livraison répétés", "Analyser les motifs et vérifier la qualité des adresses confirmées en amont."],
      ]);
      WARN(doc, "Un taux d’annulation qui grimpe pour une seule boutique cache souvent un problème amont (prix, stock, ciblage). Remontez l’information rapidement.");

      H2(doc, "Droits : autorisé vs interdit");
      permTable(doc, [
        ["Voir toutes les commandes et agents", "Créer ou supprimer des comptes"],
        ["Réassigner des commandes", "Modifier la configuration système"],
        ["Contrôler la qualité, relire les notes", "Importer depuis Afrishop (sauf droit délégué)"],
        ["Générer et exporter les rapports", "Modifier le prix ou le produit"],
        ["Traiter les alertes et anomalies", "Attribuer rôles et permissions"],
        ["Suivre les livraisons en cours", "Supprimer l’historique des données"],
      ]);

      H2(doc, "FAQ");
      FAQ(doc, [
        ["Un agent est absent et ses commandes s’accumulent.", "Filtrez ses commandes, sélectionnez-les et réassignez-les aux agents disponibles, en rééquilibrant la charge."],
        ["Comment repérer un agent en difficulté ?", "Surveillez son taux de confirmation et son volume. Un taux faible ou beaucoup de motifs « Autre » sont des signaux à creuser."],
        ["Le taux d’annulation a bondi, par où commencer ?", "Filtrez par motif, puis par boutique et par agent : vous isolez la cause (prix, agent, vague de doublons)."],
        ["Puis-je corriger une commande mal saisie ?", "Vous pouvez corriger statut et notes en contrôle qualité, mais privilégiez le retour à l’agent. Prix et produit ne se modifient pas."],
        ["À quelle fréquence générer les rapports ?", "Au minimum un rapport journalier ; beaucoup font aussi un point de mi-journée pour réajuster la répartition."],
      ]);

      H2(doc, "Bonnes pratiques");
      ["Ouvrez et fermez la journée par un coup d’œil au tableau de bord.",
       "Réassignez tôt : une commande appelée vite confirme mieux.",
       "Faites du contrôle qualité un rituel quotidien et bref.",
       "Documentez les anomalies récurrentes pour l’admin et les boutiques.",
       "Valorisez les bons agents autant que vous corrigez les écarts."].forEach(t => BUL(doc, t));
    },
  },

  ADMIN: {
    file: "onboarding-ADMIN.pdf",
    label: "Administrateur",
    subtitle: "Configurer, sécuriser et alimenter le CRM",
    build(doc) {
      H1(doc, "Administrateur");
      H2(doc, "Votre rôle et votre périmètre");
      P(doc, "L’administrateur est le garant du bon fonctionnement technique et organisationnel du CRM. Vous configurez l’application, gérez les comptes, attribuez les rôles et permissions, pilotez l’import des commandes depuis Afrishop, paramétrez statuts et workflows, et veillez à la sécurité et à la sauvegarde des données.");
      WARN(doc, "Vos droits peuvent supprimer des données ou bloquer des utilisateurs. Avant toute opération sensible, assurez-vous d’une sauvegarde récente et testez hors des heures de forte activité.");

      H2(doc, "Connexion");
      STEP(doc, 1, "Allez sur " + URL + " et connectez-vous avec votre compte administrateur.");
      STEP(doc, 2, "Vous accédez au panneau d’administration (Configuration, Utilisateurs, Imports, Sécurité).");
      CAPTURE(doc, "Panneau d’administration avec les menus principaux");

      H2(doc, "Fonctionnalités accessibles");
      ["Configurer les paramètres généraux (entreprise, fuseau, devise…).",
       "Créer, modifier, désactiver et supprimer des comptes.",
       "Attribuer et révoquer rôles et permissions (Agent, Superviseur, Livreur, Boutique, Admin).",
       "Importer les commandes depuis Afrishop et superviser la synchronisation.",
       "Paramétrer les statuts et les règles de workflow.",
       "Gérer la sécurité : mots de passe, déconnexion, journal des accès.",
       "Déclencher et vérifier les sauvegardes.",
       "Consulter l’ensemble des données et rapports."].forEach(t => BUL(doc, t));

      H2(doc, "Procédure : créer un compte utilisateur");
      STEP(doc, 1, "Dans « Utilisateurs », cliquez sur « Ajouter un utilisateur ».");
      STEP(doc, 2, "Renseignez nom, e-mail (identifiant) et mot de passe initial.");
      STEP(doc, 3, "Sélectionnez le rôle : Agent, Superviseur, Livreur, Boutique ou Administrateur.");
      STEP(doc, 4, "Restreignez le périmètre si besoin (ex. : une boutique précise pour un compte Boutique).");
      STEP(doc, 5, "Enregistrez et communiquez les identifiants de façon sécurisée.");
      TIP(doc, "Imposez le changement de mot de passe à la première connexion : un mot de passe initial ne doit jamais rester en usage durable.");

      H2(doc, "Procédure : rôles et permissions");
      STEP(doc, 1, "Ouvrez la fiche de l’utilisateur dans « Utilisateurs ».");
      STEP(doc, 2, "Modifiez le rôle ou ajustez les permissions fines.");
      STEP(doc, 3, "Vérifiez la cohérence avec la fonction réelle de la personne.");
      STEP(doc, 4, "Enregistrez et informez l’utilisateur.");
      NOTE(doc, "Appliquez le moindre privilège : n’accordez que les droits strictement nécessaires. Un agent n’a pas besoin des rapports globaux.");

      H2(doc, "Procédure : import depuis Afrishop");
      STEP(doc, 1, "Allez dans « Imports » (ou « Synchronisation Afrishop »).");
      STEP(doc, 2, "Lancez l’import manuel ou vérifiez la synchronisation automatique.");
      STEP(doc, 3, "Contrôlez le rapport : importées, doublons écartés, erreurs.");
      STEP(doc, 4, "Corrigez la source en cas d’erreur, puis relancez.");
      STEP(doc, 5, "Vérifiez que les nouvelles commandes apparaissent au statut « Nouveau ».");
      CAPTURE(doc, "Écran d’import Afrishop avec le rapport de synchronisation");
      WARN(doc, "Ne relancez pas un import complet à l’aveugle : vous risquez de recréer des doublons. Vérifiez d’abord le rapport précédent et la fenêtre de dates.");

      H2(doc, "Procédure : statuts et workflows");
      STEP(doc, 1, "Ouvrez « Configuration » puis « Statuts et workflows ».");
      STEP(doc, 2, "Vérifiez la liste des statuts (Nouveau, Confirmé, Annulé, En route, Livré, Échec…).");
      STEP(doc, 3, "Définissez les transitions autorisées entre statuts.");
      STEP(doc, 4, "Associez les motifs d’annulation et d’échec aux statuts.");
      STEP(doc, 5, "Testez le parcours complet sur une commande de test avant déploiement.");

      H2(doc, "Sauvegarde et sécurité");
      ["Vérifiez régulièrement que les sauvegardes s’exécutent et sont restaurables.",
       "Appliquez une politique de mots de passe robuste.",
       "Désactivez immédiatement les comptes des personnes qui partent.",
       "Consultez le journal des accès pour repérer toute connexion anormale.",
       "Limitez le nombre d’administrateurs au strict nécessaire."].forEach(t => BUL(doc, t));
      WARN(doc, "La donnée client (nom, téléphone, adresse) est sensible : accès limité aux personnes habilitées, usage strictement professionnel, tout export justifié et tracé.");

      H2(doc, "Droits : autorisé vs interdit");
      permTable(doc, [
        ["Configurer l’application et les workflows", "Fausser la donnée Afrishop d’une commande"],
        ["Créer, modifier, désactiver des comptes", "Partager un compte admin entre plusieurs personnes"],
        ["Attribuer rôles et permissions", "Sur-attribuer des droits au-delà du besoin"],
        ["Importer depuis Afrishop", "Relancer un import sans vérifier les doublons"],
        ["Gérer sauvegardes et sécurité", "Exporter des données client sans justification"],
        ["Consulter toutes les données", "Supprimer des données sans sauvegarde préalable"],
      ]);

      H2(doc, "FAQ");
      FAQ(doc, [
        ["Un utilisateur a oublié son mot de passe.", "Depuis sa fiche, réinitialisez-le et communiquez un mot de passe temporaire à changer à la première connexion."],
        ["L’import a créé des doublons.", "Vérifiez le rapport et la fenêtre de dates, faites annuler les doublons (« Doublon »), corrigez la déduplication avant le prochain import."],
        ["Une personne quitte l’entreprise.", "Désactivez son compte immédiatement. Évitez la suppression tant que son historique sert aux statistiques."],
        ["Comment limiter les risques liés aux droits étendus ?", "Moindre privilège, peu d’administrateurs, politique de mots de passe robuste, revue du journal des accès."],
        ["Puis-je modifier les statuts disponibles ?", "Oui, via « Configuration » puis « Statuts et workflows ». Testez toujours sur une commande de test avant la production."],
      ]);

      H2(doc, "Bonnes pratiques");
      ["Documentez chaque changement de configuration (quoi, quand, pourquoi).",
       "Testez toujours sur une commande ou un compte de test.",
       "Programmez les opérations lourdes hors des heures de pointe.",
       "Vérifiez vos sauvegardes en les restaurant de temps en temps.",
       "Désactivez sans tarder les accès devenus inutiles."].forEach(t => BUL(doc, t));
    },
  },

  LIVREUR: {
    file: "onboarding-LIVREUR.pdf",
    label: "Livreur",
    subtitle: "Livrer les commandes et mettre à jour leur statut",
    build(doc) {
      H1(doc, "Livreur");
      H2(doc, "Votre rôle et votre périmètre");
      P(doc, "En tant que livreur, vous prenez en charge les commandes confirmées et les acheminez jusqu’au client. Votre mission : consulter la liste des commandes à livrer, vous rendre à l’adresse, remettre le produit, encaisser le paiement (Cash on Delivery) et mettre à jour le statut de livraison.");
      P(doc, "Vous travaillez le plus souvent depuis votre téléphone, sur une interface optimisée mobile. Vous voyez uniquement vos commandes attribuées. Vous ne traitez ni les appels clients ni la configuration.");
      NOTE(doc, "Votre mise à jour de statut en temps réel permet au superviseur et à la boutique de suivre la livraison et déclenche la clôture de la commande. Mettez à jour au moment de la livraison, pas le soir.");

      H2(doc, "Connexion sur mobile");
      STEP(doc, 1, "Ouvrez le navigateur de votre téléphone et allez sur " + URL + ".");
      STEP(doc, 2, "Saisissez votre identifiant et votre mot de passe de livreur.");
      STEP(doc, 3, "Ajoutez le site à votre écran d’accueil pour y accéder en un geste.");
      STEP(doc, 4, "Vous arrivez sur la liste de vos commandes à livrer.");
      CAPTURE(doc, "Écran de connexion sur mobile");
      CAPTURE(doc, "Liste des commandes à livrer sur téléphone");
      TIP(doc, "Ajoutez l’application à l’écran d’accueil : elle se comporte presque comme une application installée et vous gagnez du temps à chaque connexion.");

      H2(doc, "L’interface mobile");
      table(doc, ["Élément", "Description"], [
        ["Liste des livraisons", "Vos commandes confirmées, triées par zone ou priorité."],
        ["Fiche de livraison", "Nom, adresse, téléphone, produit et montant à encaisser."],
        ["Bouton « Appeler »", "Pour joindre le client avant d’arriver."],
        ["Boutons de statut", "« En route », « Livré », « Échec » en un geste."],
        ["Motif d’échec", "Liste de motifs si la livraison n’aboutit pas."],
      ]);

      H2(doc, "Fonctionnalités accessibles");
      ["Consulter vos commandes confirmées attribuées.",
       "Ouvrir le détail : nom, adresse, téléphone, produit, quantité, montant.",
       "Appeler le client depuis la fiche.",
       "Passer le statut à « En route » au départ.",
       "Passer à « Livré » après remise du produit et encaissement.",
       "Passer à « Échec » avec un motif si la livraison échoue.",
       "Consulter l’itinéraire / l’adresse (lien vers la carte si disponible)."].forEach(t => BUL(doc, t));

      H2(doc, "Procédure : livrer une commande");
      STEP(doc, 1, "Ouvrez la commande et lisez l’adresse et le montant à encaisser.");
      STEP(doc, 2, "Appelez le client pour annoncer votre passage et confirmer sa présence.");
      STEP(doc, 3, "Au départ, passez le statut à « En route ».");
      STEP(doc, 4, "À l’arrivée, remettez le produit, vérifiez-le et encaissez le montant exact (COD).");
      STEP(doc, 5, "Passez à « Livré » : la commande est clôturée et remonte au superviseur et à la boutique.");
      CAPTURE(doc, "Fiche de livraison avec les boutons « En route » et « Livré »");
      WARN(doc, "Encaissez toujours le montant exact avant de marquer « Livré ». En cas d’écart, passez en « Échec » avec le bon motif et signalez la situation à votre superviseur.");

      H2(doc, "Procédure : déclarer un échec");
      STEP(doc, 1, "Sur la fiche, cliquez sur « Échec ».");
      STEP(doc, 2, "Sélectionnez le motif le plus précis.");
      STEP(doc, 3, "Ajoutez une note de contexte (ex. : « Client absent, rappelé sans réponse »).");
      STEP(doc, 4, "Validez : la commande est signalée au superviseur.");
      table(doc, ["Motif d’échec courant", "Quand l’utiliser"], [
        ["Client absent", "Personne à l’adresse au moment du passage."],
        ["Adresse introuvable / incorrecte", "Adresse inexistante ou imprécise."],
        ["Client injoignable", "Impossible de joindre le client pour finaliser."],
        ["Refus à la livraison", "Le client refuse le produit ou de payer."],
        ["Paiement impossible", "Le client ne dispose pas du montant (COD)."],
      ]);
      NOTE(doc, "Un motif d’échec précis aide à décider d’une nouvelle tentative. Évitez de tout ranger sous « Autre ».");

      H2(doc, "Droits : autorisé vs interdit");
      permTable(doc, [
        ["Voir ses commandes à livrer", "Voir/modifier les livraisons d’un autre livreur"],
        ["Consulter les détails client de ses livraisons", "Confirmer/annuler une commande au stade de l’appel"],
        ["Appeler le client depuis la fiche", "Modifier le prix ou le produit"],
        ["Passer En route / Livré / Échec", "Réassigner une commande à un autre livreur"],
        ["Saisir un motif d’échec", "Accéder à la configuration ou aux comptes"],
        ["Consulter l’itinéraire / l’adresse", "Voir les rapports globaux et les agents"],
      ]);

      H2(doc, "FAQ");
      FAQ(doc, [
        ["Je ne trouve pas l’adresse du client.", "Appelez-le depuis la fiche pour vous faire guider. Si introuvable, passez en « Échec » (« Adresse introuvable ») avec une note."],
        ["Le client veut payer moins que le montant.", "Non, encaissez le montant exact. En cas de litige, passez en « Échec » avec le bon motif et prévenez votre superviseur."],
        ["J’ai marqué « Livré » par erreur.", "Contactez immédiatement votre superviseur avec le numéro de la commande : la correction d’un statut clôturé relève de lui."],
        ["Le client est absent mais demande de revenir.", "Retentez dans la journée si possible. Sinon, « Échec » (« Client absent ») et notez l’horaire souhaité ; le superviseur planifiera une nouvelle tentative."],
        ["L’application est lente sur mon téléphone.", "Vérifiez votre connexion, rechargez, reconnectez-vous. Mettez à jour le statut dès le retour du réseau ; signalez si ça persiste."],
      ]);

      H2(doc, "Bonnes pratiques");
      ["Appelez toujours le client avant d’arriver : moins de déplacements inutiles.",
       "Mettez à jour le statut en temps réel, sur place.",
       "Préparez votre tournée en regroupant par zone géographique.",
       "Gardez de la monnaie : l’encaissement COD se fait souvent en espèces.",
       "Restez courtois : vous représentez la boutique et HelpMeProcess."].forEach(t => BUL(doc, t));
    },
  },

  BOUTIQUE_OWNER: {
    file: "onboarding-BOUTIQUE_OWNER.pdf",
    label: "Boutique partenaire",
    subtitle: "Suivre ses commandes et ses performances",
    build(doc) {
      H1(doc, "Boutique (Partenaire / Client)");
      H2(doc, "Votre rôle et votre périmètre");
      P(doc, "En tant que boutique partenaire, vos produits sont vendus via Afrishop et livrés en Cash on Delivery par HelpMeProcess. Le CRM vous donne une fenêtre de suivi sur vos propres commandes : avancement en temps réel, statistiques de vente et téléchargement de rapports.");
      P(doc, "Votre accès est strictement limité à vos propres données : vous ne voyez ni les commandes des autres boutiques, ni la gestion interne des agents. Le traitement opérationnel est assuré par les équipes HelpMeProcess.");
      NOTE(doc, "Le CRM vous offre la transparence sur vos ventes COD : à tout moment, vous savez combien de commandes sont en appel, confirmées, en livraison ou livrées.");

      H2(doc, "Connexion à votre espace");
      STEP(doc, 1, "Allez sur " + URL + " et connectez-vous avec les identifiants fournis par HelpMeProcess.");
      STEP(doc, 2, "Vous accédez à votre espace boutique (uniquement vos commandes et statistiques).");
      CAPTURE(doc, "Espace boutique avec le tableau de bord des commandes et des ventes");

      H2(doc, "Fonctionnalités accessibles");
      ["Consulter vos propres commandes et leur statut détaillé.",
       "Suivre en temps réel chaque commande (Nouveau, Confirmé, En route, Livré, Annulé, Échec).",
       "Visualiser vos statistiques : volume, taux de confirmation et de livraison, chiffre d’affaires.",
       "Filtrer par période, statut ou produit.",
       "Télécharger vos rapports (PDF ou tableur).",
       "Contacter l’équipe HelpMeProcess."].forEach(t => BUL(doc, t));

      H2(doc, "Procédure : suivre une commande");
      STEP(doc, 1, "Ouvrez la liste « Mes commandes ».");
      STEP(doc, 2, "Filtrez par date, statut ou produit.");
      STEP(doc, 3, "Ouvrez la commande pour voir son statut et l’historique de traitement.");
      STEP(doc, 4, "Suivez sa progression : confirmation, prise en charge, livraison.");
      CAPTURE(doc, "Liste « Mes commandes » avec filtres et colonne statut");

      H2(doc, "Procédure : statistiques et rapport");
      STEP(doc, 1, "Ouvrez « Statistiques » ou « Rapports ».");
      STEP(doc, 2, "Sélectionnez la période (jour, semaine, mois).");
      STEP(doc, 3, "Analysez vos indicateurs : volume, taux de confirmation et de livraison, chiffre d’affaires.");
      STEP(doc, 4, "Cliquez sur « Télécharger » pour exporter (PDF ou tableur).");
      CAPTURE(doc, "Écran des statistiques de vente avec bouton de téléchargement");
      TIP(doc, "Comparez vos taux de confirmation et de livraison d’une semaine à l’autre : une baisse durable peut signaler un problème de prix, de ciblage ou d’adresse à corriger avec HelpMeProcess.");

      H2(doc, "Procédure : contacter HelpMeProcess");
      STEP(doc, 1, "Repérez la rubrique « Contact » ou « Support ».");
      STEP(doc, 2, "Notez votre question et, si elle concerne une commande, son numéro.");
      STEP(doc, 3, "Transmettez via le canal indiqué (formulaire, e-mail ou téléphone).");
      NOTE(doc, "Pour toute demande sur une commande, indiquez toujours son numéro : l’équipe vous répondra beaucoup plus vite.");

      H2(doc, "Droits : autorisé vs interdit");
      permTable(doc, [
        ["Consulter ses propres commandes", "Voir les commandes d’une autre boutique"],
        ["Suivre les statuts en temps réel", "Modifier le statut ou le contenu d’une commande"],
        ["Consulter ses statistiques", "Traiter les appels et livraisons"],
        ["Télécharger ses propres rapports", "Voir les performances internes des agents"],
        ["Contacter HelpMeProcess", "Créer ou gérer des comptes"],
        ["Filtrer ses commandes", "Importer ou configurer le système"],
      ]);

      H2(doc, "FAQ");
      FAQ(doc, [
        ["Pourquoi certaines commandes sont-elles annulées ?", "Client injoignable, changement d’avis ou doublon. Le motif est visible sur la fiche ; en cas de taux élevé, contactez HelpMeProcess."],
        ["Mes statistiques sont-elles en temps réel ?", "Les statuts sont mis à jour au fil du traitement. Actualisez la page pour voir les dernières évolutions."],
        ["Puis-je voir les commandes d’autres boutiques ?", "Non : votre accès est limité à vos propres données, pour des raisons de confidentialité."],
        ["Comment récupérer un rapport comptable ?", "Dans « Statistiques » ou « Rapports », choisissez la période et cliquez sur « Télécharger »."],
        ["Une commande reste bloquée en « Nouveau ».", "Elle n’a pas encore été appelée. Si cela se prolonge, contactez HelpMeProcess avec le numéro de commande."],
      ]);

      H2(doc, "Bonnes pratiques");
      ["Consultez votre espace chaque jour pour suivre vos ventes au plus près.",
       "Surveillez vos taux de confirmation et de livraison.",
       "Téléchargez régulièrement vos rapports pour votre comptabilité.",
       "Signalez vite toute anomalie (prix erroné, vague d’annulations, rupture).",
       "Indiquez toujours le numéro de commande au support."].forEach(t => BUL(doc, t));
    },
  },
};

// ─────────────────────────── Génération ───────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

function generate(role) {
  return new Promise((resolve, reject) => {
    const profile = PROFILES[role];
    const outPath = path.join(OUT_DIR, profile.file);
    const doc = makeDoc(profile.label);
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    cover(doc, profile.label, profile.subtitle);
    profile.build(doc);
    decorate(doc);
    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

const roles = Object.keys(PROFILES);
for (const role of roles) {
  const p = await generate(role);
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log(`✓ ${path.relative(ROOT, p)} (${kb} Ko)`);
}
console.log("Terminé : 5 PDF générés dans public/guides/");
