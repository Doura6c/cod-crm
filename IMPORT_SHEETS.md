# Import Google Sheets (connecteur type Rapido)

Le CRM peut importer les commandes d'une boutique depuis une feuille Google Sheets
publique — le même principe que l'écran « Import & API » de Rapido, avec le même
format de colonnes. Une boutique peut donc brancher **la même feuille** sur Rapido
ou sur cod-crm, au choix.

## Format de feuille accepté

Ligne 1 = en-têtes. Insensible à la casse et aux accents.

| Colonne     | Requis | Alias acceptés                          |
| ----------- | ------ | --------------------------------------- |
| Nom client  | ✅     | client, name, nom, destinataire         |
| Téléphone   | ✅     | tel, phone, portable, mobile            |
| Produit     |        | produit, article, item                  |
| Prix        |        | prix, montant, price, total             |
| Zone        |        | zone, ville, quartier                   |
| Adresse     |        | adresse, address                        |
| Note        |        | note, commentaire                       |
| Quantité    |        | quantite, qty, qte *(extension)*        |
| Référence   |        | reference, ref, code *(extension)*      |

La feuille doit être partagée « Tout le monde avec le lien » en mode **Lecteur**
(Fichier → Partager). Aucune API Google ni compte de service : le CRM lit
l'export CSV public.

## Différences volontaires avec Rapido

- **Un client qui recommande n'est pas ignoré.** Rapido ignore toute ligne dont le
  téléphone existe déjà. Ici, chaque ligne a une empreinte de contenu
  (`externalRef` = `SHEET:<hash>`) : une ligne déjà importée est ignorée
  (idempotence), mais une **nouvelle** commande du même client est créée et
  marquée `isDuplicate` pour arbitrage par un agent.
- **Clients blacklistés filtrés** à l'import (comme le webhook).
- **Journal d'audit** : chaque import trace une ligne `WebhookLog`
  (outcomes `SHEET_IMPORTED`, `SHEET_DUPLICATE_FLAGGED`, `SHEET_FETCH_ERROR`).

## Configuration

1. **Variable d'environnement** (Vercel → Settings → Environment Variables) :
   - `SHEET_SYNC_SECRET` : chaîne aléatoire longue (ex. `openssl rand -hex 32`).
     Protège l'endpoint de synchro planifiée.
2. **Connexion d'une boutique** : CRM → Boutiques → [boutique] → Intégration →
   « Import Google Sheets » → coller l'URL → Connecter → activer la sync auto.

## Planification (remplace le « toutes les 60 s » de Rapido)

Vercel Hobby limite les crons natifs à 1/jour. Deux options gratuites :

### Option A — Google Apps Script (recommandé : déjà dans l'écosystème Sheets)

script.google.com → Nouveau projet → coller :

```js
const CRM_URL = "https://cod-crm-zeta.vercel.app/api/sync/sheets";
const SECRET = "LE_SHEET_SYNC_SECRET"; // même valeur que sur Vercel

function syncCrm() {
  const res = UrlFetchApp.fetch(CRM_URL, {
    method: "post",
    headers: { Authorization: "Bearer " + SECRET },
    muteHttpExceptions: true,
  });
  console.log(res.getResponseCode(), res.getContentText().slice(0, 500));
}
```

Puis : Déclencheurs (icône réveil) → Ajouter → fonction `syncCrm`,
« Déclencheur horaire », « Minuterie de minutes », **toutes les 5 minutes**
(minimum Apps Script ; Rapido fait 60 s, 5 min suffit largement pour du COD).

### Option B — cron-job.org

Créer un job GET vers
`https://cod-crm-zeta.vercel.app/api/sync/sheets?key=LE_SHEET_SYNC_SECRET`
toutes les 1 à 5 minutes.

## Endpoints

- `POST /api/boutiques/:id/sheet` `{ sheetUrl }` — connecter/tester (ADMIN/MANAGER)
- `PATCH /api/boutiques/:id/sheet` `{ enabled }` — sync auto on/off
- `DELETE /api/boutiques/:id/sheet` — déconnecter
- `POST /api/sync/sheets` — synchro planifiée (`Authorization: Bearer <SHEET_SYNC_SECRET>`)
- `POST /api/sync/sheets?boutiqueId=…` — synchro manuelle (session ADMIN/MANAGER)

## Limites

- 500 lignes lues par synchro, feuille max 2 Mo, timeout lecture 15 s.
- Une ligne **modifiée** dans la feuille après import = nouvelle empreinte =
  nouvelle commande (flaggée doublon si l'ancienne est active). Consigne aux
  marchands : ne pas retoucher les lignes déjà importées, ajouter des lignes.
