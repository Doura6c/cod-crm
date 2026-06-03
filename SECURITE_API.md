# Sécurisation de la clé API HPSHOP ↔ CRMCOD

## Problème initial

La clé webhook qui connecte la boutique **HPSHOP** au **CRMCOD** était exposée
en clair dans le code frontend public (`HPSHOP/index.html`), donc lisible par
n'importe qui via les DevTools du navigateur ou l'historique GitHub.

```js
// AVANT (exposé dans le navigateur) :
webhookKey: "FviI7sM0c8tVH78D9PzNXvICbNC2NAdD0Xdc8d8Z"
```

## Architecture après sécurisation

```
Navigateur (HPSHOP)
   │  POST /api/submit-order   (aucune clé)
   ▼
Proxy serverless HPSHOP  (api/submit-order.js)
   │  injecte X-Webhook-Key depuis CRMCOD_API_KEY (env Vercel, secret)
   │  + origin allowlist + rate-limit IP + headers sécurité
   ▼
Webhook CRMCOD  (/api/webhook/order)
   │  vérifie la clé + origin allowlist + rate-limit (IP + boutique)
   ▼
Base de données (commande créée)
```

La clé n'apparaît **jamais** dans le navigateur : elle est ajoutée côté serveur
par le proxy, à partir d'une variable d'environnement chiffrée.

---

## Côté HPSHOP (`/Users/mac/HPSHOP`)

### 1. Proxy serverless — `api/submit-order.js`
- Reçoit la commande du frontend (sans clé)
- Injecte `X-Webhook-Key` depuis `process.env.CRMCOD_API_KEY`
- Transmet au webhook CRMCOD
- **Origin allowlist** : en production, refuse toute origine ≠ `https://hpshop-afrique.vercel.app` (403)
- **Rate-limit** : 10 requêtes / minute / IP (429 au-delà)
- **Headers sécurité** : `X-Robots-Tag: noindex`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

### 2. Frontend — `index.html`
- Clé retirée du `CONFIG` et des 3 appels `fetch`
- `webhookUrl` pointe désormais sur `/api/submit-order` (le proxy)

### 3. Variable d'environnement Vercel
| Nom | Environnements | Valeur |
|---|---|---|
| `CRMCOD_API_KEY` | Production, Development | la clé webhook (chiffrée) |

### 4. `vercel.json`
- Route `/api/(.*)` ajoutée avant le rewrite catch-all (sinon le proxy serait servi comme fichier statique)

---

## Côté ASMASHOP (`/Users/mac/ASMASHOP`)

**Boutique n°2** connectée au CRM. Mise en place **identique** à HPSHOP :

- `api/submit-order.js` — proxy serverless, `ALLOWED_ORIGIN = "https://asma-shop.vercel.app"`,
  injecte `X-Webhook-Key` depuis `process.env.CRMCOD_API_KEY`, rate-limit 10/min/IP, headers sécurité
- `index.html` — clé retirée du `CONFIG` et des 2 appels `fetch`, `webhookUrl` → `/api/submit-order`
- `vercel.json` — route `/api/(.*)` ajoutée avant le rewrite catch-all
- Variable Vercel `CRMCOD_API_KEY` (Production + Development) sur le projet `asma-shop`

> ⚠️ L'ancienne clé ASMA (`0YsAAo…`) ayant été exposée dans l'historique Git public,
> elle doit être régénérée (voir « Procédure de rotation de clé »).

---

## Côté CRMCOD (`/Users/mac/CRMCOD`)

### Protection 1 — Origin allowlist (`app/api/webhook/order/route.ts`)
```ts
const ALLOWED_ORIGINS = [
  "https://hpshop-afrique.vercel.app",
  "https://asma-shop.vercel.app",
];
// Un appel navigateur d'origine non autorisée → 403.
// Un appel serveur-à-serveur (proxy, sans header Origin) → autorisé,
// protégé par la clé webhook secrète.
```
Le CORS reflète l'origine autorisée au lieu de `*`.

### Protection 2 — Rate-limit par IP
```ts
// 20 requêtes / minute / IP, en complément de la limite par boutique
if (await isRateLimited(`webhook:ip:${ip}`, 20, 60_000)) → 429
```

### Protection 3 — Rotation de clé
Bouton **« Régénérer la clé »** sur la page intégration d'une boutique
(`/boutiques/[id]/integration`), réservé aux ADMIN.
- Route : `POST /api/boutiques/[id]/regenerate-key`
- Génère une nouvelle clé `randomKey(40)` et met à jour `boutique.webhookKey`

---

## Procédure de rotation de clé

À faire en période creuse (bref window où les commandes échouent entre les étapes 2 et 4) :

1. CRM → page intégration de la boutique → **Régénérer la clé** → copier la nouvelle clé
2. HPSHOP Vercel → mettre à jour la variable `CRMCOD_API_KEY` avec la nouvelle clé
   ```bash
   cd /Users/mac/HPSHOP
   printf 'NOUVELLE_CLE' | npx vercel env add CRMCOD_API_KEY production --force
   ```
3. Redéployer HPSHOP pour que la nouvelle variable soit prise en compte
   ```bash
   npx vercel --prod
   ```
4. Vérifier : une commande passe avec la nouvelle clé ; l'ancienne clé est rejetée (401)

---

## Vérifications de sécurité (production)

| Test | Commande | Attendu |
|---|---|---|
| Clé absente du HTML | `curl -s https://hpshop-afrique.vercel.app/ \| grep webhookKey` | aucun résultat |
| Mauvaise origine (proxy) | `POST /api/submit-order` avec `Origin: evil.com` | 403 |
| Mauvaise origine (CRM) | `POST /api/webhook/order` avec `Origin: evil.com` | 403 |
| Webhook sans clé | `POST /api/webhook/order` sans header | 401 |
| Rate-limit proxy | 11 POST rapides | 429 dès la 10e |
| Headers sécurité | `curl -D - .../api/submit-order` | x-robots-tag, nosniff, referrer-policy |

---

## Livrable — état final

- [x] La clé API est invisible dans le navigateur
- [x] Les commandes passent toujours correctement (via le proxy)
- [x] Rate limiting actif (proxy HPSHOP + webhook CRMCOD)
- [x] Origin allowlist actif (proxy HPSHOP + webhook CRMCOD)
- [x] Mécanisme de rotation de clé en place
