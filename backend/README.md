# Kodify Backend

Backend NestJS maintenu comme **monolithe modulaire**.

## Architecture

- un seul backend HTTP
- modules métier explicites
- séparation contrôleurs / services / DTO / persistance
- sécurité et validation centralisées au backend

Référence interne :

- [docs/ARCHITECTURE.md](/home/cherif/Bureau/kodify/CP2/backend/docs/ARCHITECTURE.md)

## Modules

- `auth`
- `data`
- `communications`
- `payments`
- `uploads`
- `public`
- `monitoring`
- `config`
- `database`
- `cache`
- `modules/user`

## Runtime de sécurité

Le projet n’utilise pas JWT comme source de vérité principale.

Il utilise :

- cookies `HttpOnly`
- access session courte
- refresh token rotatif
- validation backend stricte

Donc un template `.env.prod` provenant d’un projet JWT ne doit pas être copié tel quel ici.
Il faut garder uniquement les variables réellement consommées par ce backend.

## Fichiers d’environnement

- `.env.example` : développement local
- `.env.prod.example` : production backend simple
- `../ops/env/backend.production.env.example` : production Docker/VPS

Variables importantes :

- `APP_ORIGINS` ou `CORS_ORIGIN`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `TRUST_PROXY`
- `PRISMA_CONNECTION_REQUIRED`
- `REDIS_URL` ou `REDIS_HOST/PORT`
- `SMS_PROVIDER=brevo` avec `BREVO_API_KEY` et `SMS_SENDER_ID`
- `SENDTEXT_*` si le provider SMS legacy SendText est utilise
- `DEXPAY_*`
- `CLOUDINARY_*`

## Commandes

- `npm install`
- `npm run start:dev`
- `npm run db:check`
- `C2P_CONFIRM_LOCAL_DB_RESET=reset npm run db:reset:local`
- `npm run verify`
- `npm run http:checks`
- `npm run build`
- `npm run start`
- `npm run security:test`
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:migrate`
- `npm run prisma:sync:platform`
- `npm run test:premium:grant`

## Développement local

1. Copier `.env.example` en `.env`
2. Ajuster `DATABASE_URL`
3. Verifier la connexion avec `npm run db:check`
4. Lancer `npm run start:dev`

Notes locales :

- `start:dev` utilise `nest start --watch`.
- L'ancien chemin `ts-node/esm` reste disponible via `npm run start:dev:loader` uniquement pour diagnostic.
- `PRISMA_CONNECTION_REQUIRED=true` force l'application a echouer au demarrage si PostgreSQL est indisponible, au lieu de demarrer en mode degrade.
- Les scripts `security:test`, `data:access:test`, `messaging:flow:test`, `notifications:flow:test` et `provider:visibility:test` attendent une API HTTP deja lancee, par defaut sur `http://localhost:3003/api`.
- `db:reset:local` est volontairement destructif et refuse de tourner hors `localhost` ou sans `C2P_CONFIRM_LOCAL_DB_RESET=reset`.
- `test:premium:grant` active des abonnements premium sur les comptes de test `formateur@c2p.sn`, `prestataire@c2p.sn` et `porteur@c2p.sn` avec le mot de passe `password123`. Dans le conteneur production, utiliser `node scripts/grant-test-premium-subscriptions.mjs` car `npm` est retire de l'image runtime.

## Transition Prisma

Le backend conserve encore `AppRow` comme source de verite transitoire pour ne pas casser les flux metier existants.

La couche Prisma normalisee ajoute maintenant :

- `User`
- `Wallet`
- `WalletTransaction`
- `SubscriptionPlan`
- `UserSubscription`
- `EscrowCase`
- `CommissionLedgerEntry`
- `Invoice`
- `PayoutAccount`
- `PayoutRequest`
- `Mission`
- `AuditLogEntry`

Workflow recommande :

1. `npm run prisma:generate`
2. `npm run prisma:validate`
3. appliquer la migration Prisma/PostgreSQL
4. `npm run prisma:sync:platform`

Variables de controle disponibles :

- `PRISMA_PLATFORM_SYNC_ENABLED=true|false`
- `PRISMA_PLATFORM_SYNC_ON_BOOT=true|false`

## Ecriture financiere

La transition est maintenant en mode hybride :

- `AppRow` reste la facade de transition
- les mutations financieres ecrivent aussi dans Prisma via une transaction unique
- `payment_transactions` et `commission_ledger` sont consideres append-only cote API

Le write path critique passe par une transaction DB qui couvre :

- `AppRow`
- `Wallet`
- `WalletTransaction`
- `EscrowCase`
- `PayoutRequest`
- `UserSubscription`
- `Invoice`
- `CommissionLedgerEntry`

## Contrat capabilities finance

Le backend expose maintenant un **contrat generique de capacites** pour les surfaces UI finance.

Endpoint stable :

- `GET /payments/capabilities/:entity/:entityId?contractVersion=1`

Endpoint de decouverte :

- `GET /payments/capabilities/contract?contractVersion=1`

Entites supportees :

- `transaction`
- `escrow`
- `payout`
- `subscription`
- `invoice`
- `provider_transaction`
- `payment_intent`

Le snapshot retourne :

- `contractVersion`
- `machineVersion`
- `kind`
- `currentState`
- `finality`
- `allowedTransitions`
- `allowedActions`
- `transitionGraph`
- `correlation`
- `metadata`

Regles a respecter :

- le **backend** est la seule source de verite metier pour les actions UI
- le **front** doit envoyer `contractVersion=1`
- les routes legacy par domaine `.../transactions/:id/capabilities` restent en compatibilite, mais la surface cible est le endpoint generique
- une evolution incompatible du contrat doit creer une nouvelle version explicite

Validation repo-native :

- `npm run finance:validate:contract`
  - compare le descripteur runtime a la fixture officielle `src/payments/fixtures/finance-capabilities-contract.v1.json`
- `npm run finance:validate:domain`
  - rejoue des transitions critiques et verifie la monotonie/idempotence des etats finance
- `npm run finance:validate`
  - execute les deux checks

## Production

Le backend refuse de démarrer en `production` si la configuration critique est incohérente.
