# Runbook production C2P

Ce runbook decrit les operations minimales a executer avant et apres un deploiement, puis pendant un incident. Il ne doit contenir aucun secret.

## Pre-deploiement

Depuis la racine du depot:

```bash
cd backend
npm run production:env:status -- --strict
npm run production:preflight
npm run production:compose:check
npm run production:external:check
npm run production:backup:check
```

Critere de passage:

- aucun placeholder dans les fichiers env reels;
- `DATA_LEGACY_API_MODE` vaut `read-only` ou `disabled`;
- les certificats Nginx existent et ne sont pas vides;
- le token metrics correspond au secret Prometheus;
- le backup Postgres est configure.

## Deploiement

```bash
ops/scripts/deploy-production.sh
```

Apres deploiement:

```bash
cd backend
npm run production:postdeploy
npm run production:runtime:check
```

Critere de passage:

- `backend-migrate` termine correctement;
- `/api/healthz` repond;
- frontend servi par Nginx;
- metrics accessibles avec token;
- containers essentiels en etat sain.

## Backup Postgres

Verifier le backup:

```bash
cd backend
npm run production:backup:check
```

Installer le cron si necessaire:

```bash
ops/scripts/install-postgres-backup-cron.sh
```

Regles:

- conserver au moins 7 jours de retention;
- stocker les backups hors volume applicatif si possible;
- surveiller l'espace disque.

## Restore drill

Executer un drill apres le premier backup reel puis regulierement:

```bash
cd backend
npm run production:restore:drill -- --backup-dir backups/postgres
```

Regles:

- le drill restaure dans une base temporaire;
- ne jamais restaurer directement sur la base production sans fenetre d'intervention;
- noter la date, le fichier backup et le resultat dans le journal d'exploitation.

## Rollback

Declencheurs:

- migration echouee;
- regression bloquante sur login, paiement, messagerie ou dashboard admin;
- erreur 5xx soutenue apres deploiement.

Commande:

```bash
ops/scripts/rollback-production.sh
```

Apres rollback:

```bash
cd backend
npm run production:postdeploy
```

Verifier:

- version applicative attendue;
- connectivite Postgres/Redis;
- logs backend sans boucle d'erreurs.

## Mode maintenance

Utiliser le flag `admin_feature_flags::maintenance_mode` lorsque la plateforme doit refuser les actions non superadmin.

Endpoints exemptes:

- health;
- statut public;
- auth de base;
- monitoring frontend;
- Swagger.

Verification:

- utilisateur standard recoit `503 MAINTENANCE_MODE`;
- superadmin conserve l'acces.

## Incident provider paiement

Symptomes:

- webhook Dexpay rejete;
- reconciliation bloquee;
- intents en attente anormale.

Actions:

```bash
cd backend
npm run provider:webhook-replay:test
npm run finance:validate
```

Puis verifier:

- `WebhookReceipt`;
- `ProviderTransaction`;
- `PaymentIntent`;
- `FinanceLedgerEntry`;
- outbox pending/failed.

Regles:

- ne jamais modifier directement le ledger;
- toute correction financiere passe par une contre-ecriture ou une commande metier idempotente.

## Incident uploads

Actions:

```bash
cd backend
npm run uploads:storage:check
npm run uploads:metadata:audit
npm run uploads:tmp:audit
```

Si nettoyage necessaire:

```bash
cd backend
npm run uploads:tmp:cleanup
```

Regles:

- en production, `UPLOAD_STORAGE_DRIVER=s3`;
- R2 doit rester la cible S3;
- ne pas supprimer les objets marques actifs sans audit metadata.

## Incident legacy `/data`

Le legacy `/data` ne doit plus permettre de mutation generique.

Verification:

```bash
cd backend
npm run data:legacy-surface:test
npm run data:legacy-mode:test
```

Si une mutation legacy est detectee:

- basculer `DATA_LEGACY_API_MODE=disabled` si possible;
- identifier le flux appelant;
- creer ou corriger l'endpoint metier dedie;
- ajouter un test HTTP de non-regression.

## Journal d'exploitation

Chaque intervention doit noter:

- date UTC;
- operateur;
- commande executee;
- resultat;
- rollback ou action corrective;
- lien vers logs ou dashboard.
