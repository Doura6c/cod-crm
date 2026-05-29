# 🔍 AUDIT PRODUIT — `cod-crm` (HelpMeProcess · COD Manager)

> **Cellule d'audit produit** — synthèse des 5 expertises : Sécurité applicative · UX/UI & accessibilité · Expérience client · Architecture & QA · Stratégie produit.
> Audit conduit **exclusivement sur le code réel du dépôt**, avec citations `fichier:ligne`. Aucune supposition non vérifiée.
> Date : 2026-05-29 · Branche `main` · Déploiement Vercel.

---

## ✅ Suivi des corrections (mise à jour post-audit)

Les correctifs suivants ont été **implémentés, testés (build OK) et déployés** :

| Constat | Statut | Commit |
|---|---|---|
| S1 — `GET /api/products` public | ✅ Corrigé | `8b7333d` |
| S2 — IDOR commandes (GET/PATCH/DELETE) | ✅ Corrigé | `8b7333d` |
| S3 — Factures inter-boutiques | ✅ Corrigé | `8b7333d` |
| S4 — XSS stocké facture | ✅ Corrigé | `8b7333d` |
| T1 — CI bloquante (+ tests) | ✅ En place | `8b7333d`, `8530e56` |
| A1 — Gardes API unifiées | ✅ Généralisé | `8b7333d`, `fd0d42b` |
| S6 — Webhook (rate-limit + taille) | ✅ Corrigé | `fd0d42b` |
| D1 — `reset` réservé super-admin | ✅ Corrigé | `fd0d42b` |
| A2 — Codes/clés cryptographiquement sûrs | ✅ Corrigé | `7a00d7f` |
| S8 — Session boutique re-vérifiée | ✅ Corrigé | `7a00d7f` |
| Tests automatisés (Vitest, 12 tests) | ✅ Ajouté | `8530e56` |

**Restant (décision/infra requise)** : S5 (rate-limit distribué via Upstash Redis), S7 (durcissement CSP), C1 (journal d'audit — nécessite migration BDD), U1 (accessibilité).

---

## 📑 Table des matières

1. [Résumé exécutif & Verdict](#1-résumé-exécutif--verdict)
2. [Phase 0 — Cartographie (rappel)](#2-phase-0--cartographie-rappel)
3. [Phase 1 — Audit des 7 axes](#3-phase-1--audit-des-7-axes)
   - [Axe 1 — Sécurité applicative](#axe-1--sécurité-applicative--25)
   - [Axe 2 — UX/UI & Accessibilité](#axe-2--uxui--accessibilité--35)
   - [Axe 3 — Expérience client](#axe-3--expérience-client--35)
   - [Axe 4 — Architecture & Qualité du code](#axe-4--architecture--qualité-du-code--35)
   - [Axe 5 — Tests & QA](#axe-5--tests--qa--05)
   - [Axe 6 — Données & Conformité](#axe-6--données--conformité--25)
   - [Axe 7 — Stratégie produit](#axe-7--stratégie-produit--35)
4. [Phase 2 — Tableau des constats priorisés](#4-phase-2--tableau-des-constats-priorisés)
5. [Feuille de route de remédiation (P0 / P1 / P2)](#5-feuille-de-route-de-remédiation)
6. [Quick wins (corrections triviales pour accord immédiat)](#6-quick-wins)
7. [LES 5 ACTIONS À FAIRE EN PREMIER](#7-les-5-actions-à-faire-en-premier)

---

## 1. Résumé exécutif & Verdict

`cod-crm` est un CRM Cash-On-Delivery fonctionnellement riche et bien structuré (App Router, RBAC centralisé, double adaptateur Prisma, portail boutique dédié, suivi public, facturation marchand). La couche **UX, parcours métier et richesse fonctionnelle est de bon niveau**.

Cependant, l'audit révèle des **failles de contrôle d'accès critiques** sur plusieurs endpoints API : des utilisateurs authentifiés de faible privilège (voire **non authentifiés**) peuvent lire des données sensibles d'autres boutiques, modifier ou **supprimer n'importe quelle commande**. S'y ajoutent l'**absence totale de tests automatisés**, l'**absence de CI/CD**, un **rate-limiting inopérant en serverless**, et un **risque XSS stocké** dans les factures.

### 🔴 VERDICT : **NO-GO en l'état**

Le produit **n'est PAS livrable en production** tant que les constats **P0 (CRITIQUES)** ne sont pas corrigés. La bonne nouvelle : les failles sont **localisées et corrigeables en quelques jours** — il ne s'agit pas d'un défaut d'architecture de fond, mais de gardes d'autorisation manquantes sur des routes précises.

| Axe | Score | Tendance |
|---|---|---|
| 1. Sécurité applicative | **2 / 5** | 🔴 Bloquant |
| 2. UX/UI & Accessibilité | **3 / 5** | 🟠 |
| 3. Expérience client | **3,5 / 5** | 🟢 |
| 4. Architecture & Qualité du code | **3 / 5** | 🟠 |
| 5. Tests & QA | **0 / 5** | 🔴 |
| 6. Données & Conformité | **2 / 5** | 🟠 |
| 7. Stratégie produit | **3,5 / 5** | 🟢 |
| **Moyenne pondérée** | **≈ 2,4 / 5** | **NO-GO** |

---

## 2. Phase 0 — Cartographie (rappel)

- **Stack** : Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5, Tailwind 4, Prisma 7.8.0 (`app/generated/prisma`), NextAuth 5 beta (JWT + Credentials, bcrypt cost 12), `xlsx`, `resend`.
- **BDD** : double adaptateur — PostgreSQL/Neon en prod, SQLite (`dev.db`) en local, bascule sur `DATABASE_URL` (`lib/prisma.ts:7-25`).
- **Architecture** : route groups `(auth)`, `(dashboard)`, `(boutique)`. 18 routes API. RBAC centralisé (`lib/rbac.ts`).
- **Modèle de données** : 16 modèles Prisma, indexation correcte sur `Order`, `Customer`, `Notification`.
- **Industrialisation** : ❌ pas de tests · ❌ pas de CI/CD · ✅ secrets non trackés · ⚠️ `dev.db` versionné.

---

## 3. Phase 1 — Audit des 7 axes

> **Échelle de sévérité** : 🔴 CRITIQUE · 🟠 ÉLEVÉ · 🟡 MOYEN · ⚪ FAIBLE

---

### Axe 1 — Sécurité applicative — **2/5**

#### 🔴 S1 — CRITIQUE — Catalogue produits exposé publiquement (fuite de marges)
`app/api/products/route.ts:5-8` : la méthode `GET` n'a **aucune vérification de session**. N'importe qui sur Internet peut récupérer **tous les produits avec `costPrice` (prix d'achat / coûts) et `boutique`** :
```ts
export async function GET() {
  const products = await prisma.product.findMany({ include: { boutique: true } });
  return NextResponse.json(products);  // ← aucun auth()
}
```
**Impact** : fuite des marges, des coûts d'approvisionnement et de la liste boutiques à la concurrence.

#### 🔴 S2 — CRITIQUE — IDOR total sur les commandes (lecture / modification / suppression)
`app/api/orders/[id]/route.ts:5-52` : `GET`, `PATCH` et `DELETE` ne vérifient que `session?.user` — **aucun contrôle de rôle ni de propriété (boutique/agent)**.
- `GET` (l.5-24) : tout utilisateur connecté (y compris un **LIVREUR** ou un **BOUTIQUE_OWNER**) lit n'importe quelle commande avec PII client complète.
- `PATCH` (l.26-44) : modifie `status`, `assignedAgentId`, `notes` de **n'importe quelle** commande.
- `DELETE` (l.46-52) : **supprime définitivement n'importe quelle commande** sur simple connexion :
```ts
export async function DELETE(_req, context) {
  const session = await auth();
  if (!session?.user) return ... 401;        // ← seul garde-fou
  const { id } = await context.params;
  await prisma.order.delete({ where: { id } }); // ← aucune restriction
}
```
**Impact** : destruction/altération de données par tout compte (ex. un livreur). Atteinte d'intégrité majeure.

#### 🟠 S3 — ÉLEVÉ — Fuite financière inter-boutiques sur les factures marchands
`app/api/factures-marchands/[id]/route.ts:14-27` : seul `if (!session)` est vérifié. Tout utilisateur connecté peut afficher la **facture financière complète de n'importe quelle boutique** (CA, frais, net, PII clients) en énumérant les `id`.

#### 🟠 S4 — ÉLEVÉ — XSS stocké dans les factures marchands
`app/api/factures-marchands/[id]/route.ts:56-66` & `128-141` : les données BDD (`customer.fullName`, `product.name`, `boutique.name`) sont **interpolées brutes dans du HTML** sans échappement, puis `window.print()`. Or ces champs sont alimentés par des sources externes non fiables (webhook `app/api/webhook/order/route.ts:127-136`, import `app/api/import/orders/route.ts:101-103`). Un `fullName` contenant `<script>` ou `<img onerror>` s'exécute à l'ouverture de la facture.

#### 🟠 S5 — ÉLEVÉ — Rate-limiting inopérant en production serverless
`lib/rateLimit.ts:13` utilise une `Map` **en mémoire de l'instance**. Sur Vercel (serverless multi-instances + cold starts), la protection brute-force du login (`app/(auth)/login/actions.ts:24`) est **largement contournable**. Le fichier le documente lui-même (l.1-6) mais le risque demeure en prod.

#### 🟡 S6 — MOYEN — Webhook public sans limitation de débit ni de taille
`app/api/webhook/order/route.ts` : `CORS: *` (l.29-33), **aucun rate-limit**, **aucune limite de taille de payload**, et **création automatique** de produits/clients/villes (l.106-156). Un attaquant connaissant une `webhookKey` (ou par spam) peut polluer la base et provoquer un déni de service applicatif.

#### 🟡 S7 — MOYEN — CSP permissive
`next.config.ts` : la CSP autorise `'unsafe-inline'` et `'unsafe-eval'` dans `script-src`, ce qui annule une grande partie de la protection anti-XSS (aggrave S4).

#### 🟡 S8 — MOYEN — JWT à rôle obsolète
`auth.config.ts:26-43` : le rôle est figé dans le JWT à la connexion. Un changement de rôle/désactivation n'est pas répercuté avant reconnexion. Le layout dashboard re-vérifie `active` en base (`app/(dashboard)/layout.tsx:33-41` ✅) mais **pas le rôle**, et le layout boutique (`app/(boutique)/layout.tsx`) ne re-vérifie **ni rôle ni `active`**.

#### ⚪ S9 — FAIBLE — Suivi public énumérable
`app/api/suivi/route.ts:22-29` : recherche par `phone { contains }` → un numéro partiel renvoie la dernière commande ; `app/suivi/[id]/page.tsx:45-56` expose ensuite nom/adresse/commune/produits sans auth. Acceptable pour un suivi public, mais le `contains` facilite l'énumération de PII.

✅ **Points positifs** : login en Server Action avec validation (`login/actions.ts`), bcrypt cost 12, cookies `httpOnly`/`secure`/`sameSite` (`auth.ts:12-30`), en-têtes de sécurité solides (HSTS, X-Frame DENY, nosniff), RBAC correctement appliqué sur `orders/assign` (`can(role,"ASSIGN_ORDER")`) et scoping boutique correct dans le portail (`mon-espace/commandes/page.tsx:48` → `boutiqueId` issu de la session).

---

### Axe 2 — UX/UI & Accessibilité — **3/5**

- ✅ Design cohérent, responsive, dark mode, états vides soignés, badges de statut lisibles, pagination présente (`mon-espace/commandes/page.tsx:219-239`).
- 🟡 **Accessibilité** : icônes d'action reposant sur `title` seul sans `aria-label` ; statuts véhiculés par la **couleur** (problème daltonisme) ; contrastes de certains `text-slate-400` sur fond clair sous le seuil WCAG AA.
- 🟡 **Sémantique** : usage massif de `<div>` cliquables et liens stylés en boutons ; peu de landmarks ARIA.
- ⚪ Emojis utilisés comme indicateurs d'état dans l'UI (✅🔴🏪) — acceptable mais non vocalisé par les lecteurs d'écran.
- 🟡 Pas d'indicateur de focus clavier personnalisé visible sur plusieurs composants interactifs.

---

### Axe 3 — Expérience client — **3,5/5**

- ✅ Parcours de suivi public (`/suivi/[id]`) excellent : barre de progression, infos livreur, CTA WhatsApp, messages contextuels par statut.
- ✅ Portail boutique dédié (`/mon-espace`) clair : filtres par statut, recherche, montants prévus vs encaissés.
- ✅ Idempotence des commandes (webhook + import via `externalRef`), détection blacklist et doublon actif (`webhook/order/route.ts:71-101`).
- 🟡 Messages d'erreur parfois techniques exposés en dev (`err.message`) ; à uniformiser.
- 🟡 Aucune notification temps réel côté boutique (polling/refresh manuel uniquement).

---

### Axe 4 — Architecture & Qualité du code — **3/5**

- ✅ Séparation claire par route groups ; Server Actions + Server Components cohérents ; RBAC centralisé (`lib/rbac.ts`) ; utilitaires de validation (`lib/validate.ts`) ; singleton Prisma (`lib/prisma.ts:27-29`).
- 🟠 **Incohérence des gardes d'autorisation** : certaines routes appliquent `can(...)` (bien), d'autres seulement `session?.user` (S1-S3), d'autres rien (S1). Absence de **middleware d'autorisation unifié** par route API → la sécurité dépend de la vigilance ponctuelle.
- 🟡 Usage répété de `(session.user as any)` → perte du typage ; pas de type `SessionUser` partagé.
- 🟡 `generateOrderCode` (`lib/utils.ts:23-30`) : `Math.random` sur 5 chiffres → risque de **collision** (contrainte `@unique` lèvera une erreur 500) et **prédictibilité**.
- 🟡 Génération de HTML par concaténation de chaînes (factures) — fragile et vecteur XSS (S4).
- ⚪ `dev.db` versionné dans le dépôt — à retirer du suivi Git.
- ⚪ Tâches `#17`/`#19` toujours `pending`/`in_progress` dans le suivi interne.

---

### Axe 5 — Tests & QA — **0/5**

- 🔴 **Aucun test** (unitaire, intégration, E2E) dans le dépôt.
- 🔴 **Aucune CI/CD** (`.github/workflows` absent) : pas de garde-fou avant `main` → déploiement Vercel direct sans typecheck/lint/test bloquants.
- **Conséquence** : aucune protection contre les régressions, notamment sur la logique financière (factures, montants encaissés, frais HMP) et les contrôles d'accès. C'est un risque majeur pour un produit manipulant de l'argent.

---

### Axe 6 — Données & Conformité — **2/5**

- 🟠 **PII clients** (nom, téléphone, adresse) exposées via S2/S3/S9 sans contrôle de propriété — enjeu de protection des données.
- 🟠 `app/api/admin/reset/route.ts:52-124` : suppression massive multi-tables, gardée **ADMIN uniquement** (pas `isSuperAdmin`) + simple en-tête `x-confirm-reset`. Aucune sauvegarde/soft-delete préalable, aucune trace d'audit.
- 🟡 **Pas de journal d'audit** des actions sensibles (suppression commande, édition de montant encaissé, reset) — seules quelques notifications existent (`EditAmountAction.ts:56-66`).
- 🟡 Politique de rétention/sauvegarde non documentée ; `dev.db` versionné.
- ⚪ Mentions légales / consentement / politique de confidentialité non identifiés.

---

### Axe 7 — Stratégie produit — **3,5/5**

- ✅ Proposition de valeur claire et différenciante pour le marché guinéen (COD, confirmation par appel, facturation marchand, frais HMP paramétrables).
- ✅ Multi-tenant naissant (boutiques + owners) avec portail dédié — bonne base de scalabilité commerciale.
- 🟡 La **sécurité multi-tenant n'est pas encore au niveau** de l'ambition (cloisonnement inter-boutiques incomplet — cf. S2/S3) : bloquant pour onboarder plusieurs clients en confiance.
- 🟡 Absence d'observabilité (logs structurés, monitoring d'erreurs type Sentry) pour piloter en production.

---

## 4. Phase 2 — Tableau des constats priorisés

| ID | Constat | Axe | Sévérité | Priorité | Fichier:ligne |
|----|---------|-----|----------|----------|----------------|
| S1 | `GET /api/products` public (fuite coûts/marges) | Sécurité | 🔴 CRITIQUE | **P0** | `app/api/products/route.ts:5-8` |
| S2 | IDOR commandes GET/PATCH/**DELETE** sans RBAC | Sécurité | 🔴 CRITIQUE | **P0** | `app/api/orders/[id]/route.ts:5-52` |
| S3 | Factures marchands lisibles inter-boutiques | Sécurité/Données | 🟠 ÉLEVÉ | **P0** | `app/api/factures-marchands/[id]/route.ts:14-27` |
| S4 | XSS stocké dans HTML facture | Sécurité | 🟠 ÉLEVÉ | **P0** | `…/factures-marchands/[id]/route.ts:56-66,128-141` |
| T1 | Aucun test + aucune CI/CD | QA | 🔴 CRITIQUE | **P1** | (absence `.github/workflows`, tests) |
| S5 | Rate-limit en mémoire inopérant serverless | Sécurité | 🟠 ÉLEVÉ | **P1** | `lib/rateLimit.ts:13` |
| S6 | Webhook : CORS *, pas de rate-limit ni taille | Sécurité | 🟡 MOYEN | **P1** | `app/api/webhook/order/route.ts:29-156` |
| D1 | `reset` destructif sans `isSuperAdmin` ni audit | Données | 🟠 ÉLEVÉ | **P1** | `app/api/admin/reset/route.ts:52-124` |
| S7 | CSP `unsafe-inline`/`unsafe-eval` | Sécurité | 🟡 MOYEN | **P1** | `next.config.ts` |
| S8 | JWT rôle obsolète + layout boutique non re-vérifié | Sécurité | 🟡 MOYEN | **P2** | `auth.config.ts:26-43`, `app/(boutique)/layout.tsx` |
| A1 | Gardes d'autorisation non unifiées | Archi | 🟠 ÉLEVÉ | **P1** | routes `app/api/**` |
| A2 | `generateOrderCode` collision/prédictible | Archi | 🟡 MOYEN | **P2** | `lib/utils.ts:23-30` |
| C1 | Pas de journal d'audit actions sensibles | Données | 🟡 MOYEN | **P2** | (transverse) |
| U1 | Accessibilité (aria, contraste, couleur seule) | UX | 🟡 MOYEN | **P2** | (transverse UI) |
| Q1 | `dev.db` versionné | Archi | ⚪ FAIBLE | **P2** | `prisma/dev.db` |

---

## 5. Feuille de route de remédiation

### 🌊 Vague P0 — BLOQUANT (avant toute mise en production) — ~2 à 4 jours
1. **S1** — Ajouter `auth()` + contrôle de rôle sur `GET /api/products` (et masquer `costPrice` pour les non-ADMIN/MANAGER).
2. **S2** — Sur `/api/orders/[id]` : exiger un rôle, **scoper par propriété** (agent assigné / boutique du owner), retirer ou restreindre `DELETE` aux ADMIN, et le transformer en soft-delete + audit.
3. **S3** — Sur `/api/factures-marchands/[id]` : vérifier rôle ADMIN/MANAGER **ou** que la boutique de la facture appartient au owner connecté.
4. **S4** — Échapper systématiquement toute donnée interpolée dans le HTML des factures (helper `escapeHtml`).

### 🌊 Vague P1 — Avant montée en charge / multi-clients — ~1 semaine
5. **T1** — Mettre en place CI GitHub Actions (typecheck + lint + build bloquants) puis tests sur les zones financières et d'accès.
6. **A1** — Créer un helper d'autorisation API unifié (`requireRole`, `requireBoutiqueAccess`) et l'appliquer à **toutes** les routes.
7. **S5** — Remplacer le rate-limit mémoire par une solution distribuée (Upstash Redis) ou middleware Vercel.
8. **S6** — Webhook : rate-limit par `webhookKey`, limite de taille de payload, restreindre/encadrer la création auto.
9. **D1** — `reset` : exiger `isSuperAdmin`, double confirmation, journal d'audit.
10. **S7** — Durcir la CSP (retirer `unsafe-eval`, viser des nonces pour l'inline).

### 🌊 Vague P2 — Qualité & conformité durable — ~1 à 2 semaines
11. **S8** — Re-vérifier rôle/`active` en base dans le layout boutique ; stratégie de rafraîchissement de session.
12. **A2** — Générateur de code commande robuste (suffixe aléatoire cryptographique + retry sur collision).
13. **C1** — Journal d'audit des actions sensibles (modèle `AuditLog`).
14. **U1** — Passe d'accessibilité (aria-labels, contrastes WCAG AA, statut non porté par la seule couleur).
15. **Q1** — Retirer `dev.db` du suivi Git ; observabilité (Sentry, logs structurés).

---

## 6. Quick wins

> Corrections **triviales et sûres**, listées **pour ton accord** avant toute modification (conformément à la règle « ne rien modifier avant validation »).

- **QW1** — Ajouter `export const dynamic = "force-dynamic"` manquant + garde `auth()` sur `GET /api/products` (corrige S1 immédiatement).
- **QW2** — Ajouter `if (role !== "ADMIN") 403` sur `DELETE /api/orders/[id]` en attendant le scoping fin (réduit S2 sans délai).
- **QW3** — Helper `escapeHtml()` appliqué aux 6 interpolations de la facture (corrige S4).
- **QW4** — Ajouter `prisma/dev.db` au `.gitignore` et `git rm --cached prisma/dev.db` (corrige Q1).
- **QW5** — Restreindre `Access-Control-Allow-Origin: *` à la liste des domaines boutiques connus sur le webhook (atténue S6).

---

## 7. LES 5 ACTIONS À FAIRE EN PREMIER

1. **🔴 Sécuriser `GET /api/products`** (`app/api/products/route.ts:5-8`) — ajouter `auth()` + rôle, masquer `costPrice` : stoppe la fuite des marges et de la liste boutiques. *(S1 / QW1)*
2. **🔴 Verrouiller `/api/orders/[id]`** (`app/api/orders/[id]/route.ts:5-52`) — RBAC + scoping par propriété, et restreindre/soft-delete le `DELETE` aux ADMIN : empêche tout compte de lire, altérer ou détruire les commandes. *(S2 / QW2)*
3. **🟠 Cloisonner `/api/factures-marchands/[id]`** (`…:14-27`) — vérifier rôle/propriété boutique : empêche la fuite financière inter-clients. *(S3)*
4. **🟠 Échapper le HTML des factures** (`…/factures-marchands/[id]/route.ts:56-66,128-141`) — neutralise le XSS stocké injectable via webhook/import. *(S4 / QW3)*
5. **🔴 Mettre en place une CI bloquante** (GitHub Actions : typecheck + lint + build) — filet de sécurité minimal avant chaque déploiement, prérequis à toute correction durable. *(T1)*

> Une fois ces 5 actions traitées, le produit pourra repasser en évaluation **GO/NO-GO**. Les vagues P1/P2 consolident la robustesse pour le passage multi-clients.

---

*Fin de l'audit — aucune modification de code produit n'a été effectuée. En attente de ta validation du plan de remédiation (et des quick wins) avant toute correction.*
