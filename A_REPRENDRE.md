# 📌 À REPRENDRE — Suite de l'audit sécurité

> Note laissée pour la prochaine conversation.
> Pour reprendre : dis simplement à Claude **« reprends la note À_REPRENDRE »**.

## ✅ Déjà fait (en ligne sur `main`)
Audit complet réalisé (voir `AUDIT_COD-CRM.md`) + corrections déployées :
- Failles d'accès graves fermées (produits, commandes, factures)
- Anti-virus dans les factures (échappement HTML)
- Clés secrètes boutiques rendues imprévisibles
- Bouton « tout effacer » réservé au super-admin
- Contrôles automatiques (CI) + 12 tests automatisés
- Webhook protégé contre le spam

## ⏳ À FAIRE — la prochaine fois (sans le service payant)
On continue **sans** la partie « service externe payant » (Upstash Redis / S5).

À traiter :
1. **S7 — Durcir la sécurité anti-virus du site (CSP)** — à tester prudemment pour ne rien casser.
2. **C1 — Journal d'audit** : noter qui supprime/modifie quoi (qui a effacé une commande, modifié un montant…). ⚠️ Demande une modification de la base de données — à faire avec précaution.
3. **U1 — Accessibilité** : améliorer pour les malvoyants (étiquettes, contrastes de couleur, ne pas se reposer uniquement sur la couleur pour les statuts).

## 🚫 Mis en pause volontairement
- **S5 — Protection anti-spam renforcée (Upstash Redis)** : nécessite un service externe payant → décision de l'utilisateur en attente.

---
*Référence détaillée : `AUDIT_COD-CRM.md` (section « Suivi des corrections » + « Feuille de route »).*
