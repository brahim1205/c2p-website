# C2P

## Vue d’ensemble

C2P est une plateforme web SaaS orientée **emploi, prestations, formation, accompagnement de projets et opérations C2P**.

Le produit sert de point de rencontre entre plusieurs profils :

- clients / prestateurs
- prestataires
- apprenants
- formateurs
- porteurs de projet
- partenaires
- parents
- administrateurs / équipe C2P

L’idée centrale du projet est simple :

- rendre visibles des talents, services, formations et projets
- organiser les parcours d’inscription, d’abonnement, de paiement et de suivi
- garder les interactions sensibles sous contrôle du **centre d’opération C2P**

Ce dépôt est le **monorepo principal** du produit.

## Ce que fait le produit

La plateforme est structurée autour de 3 grands modules publics.

### 1. SenPresta / AlloPresta

Module de mise en relation autour des prestations.

Il permet notamment :

- de publier et consulter des profils prestataires
- de rechercher par domaine, disponibilité, localité ou modalité d’intervention
- de gérer les niveaux `visiteur`, `abonné`, `vérifié`
- de piloter la visibilité payante par **billet / code / visibilité**
- de faire remonter les demandes sensibles vers C2P

### 2. Espace Numérique

Module formation et éducation, avec deux branches métier :

- **Form’Actions** : post-formation, renforcement de compétences, formations complémentaires
- **École Numérique de Dakar (END)** : logique enseignement, classes, suivi apprenant, suivi parent

Le module couvre :

- catalogue de formations
- inscription aux parcours
- progression apprenant
- examens et certificats
- gestion formateur
- classes virtuelles

### 3. ProjectCenter

Module d’accompagnement de projets et d’incubation.

Il permet :

- le dépôt de projets
- l’accompagnement technique
- le suivi de financement
- la collaboration porteur / partenaire
- la médiation C2P sur les échanges sensibles

## Règles métier structurantes

Le projet suit quelques règles fortes :

- les données personnelles sensibles ne sont pas exposées publiquement
- les interactions sensibles passent par **C2P** plutôt qu’en direct
- les rôles n’ont pas tous les mêmes droits ni les mêmes surfaces d’accès
- les abonnements, la visibilité, les commissions et les paiements font partie du modèle produit
- le produit doit fonctionner sur web public, dashboards métier et back-office admin

## Rôles principaux

Le produit gère plusieurs espaces selon le rôle connecté :

- `client / prestateur`
- `prestataire`
- `apprenant`
- `parent`
- `formateur`
- `porteur`
- `partenaire`
- `admin`

Chaque rôle dispose de ses propres écrans, permissions, flux de messagerie, notifications et actions métier.

## Architecture technique

### Frontend

- React 19
- Vite
- TypeScript
- Tailwind CSS
- React Router

Le frontend contient :

- les pages publiques
- les dashboards par rôle
- les pages admin
- les smoke tests front

### Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis

Le backend gère :

- authentification et autorisation
- permissions métier
- données applicatives
- finance, wallet, abonnements, escrow, payouts
- notifications, messagerie, outbox
- monitoring et endpoints de santé

### Production

La stack de production est prévue pour Docker Compose avec :

- Nginx reverse proxy
- frontend statique
- backend NestJS
- PostgreSQL
- Redis
- Prometheus
- Alertmanager
- Grafana
- Loki / Promtail

## Structure du dépôt

```text
.
├── backend/   # API NestJS, règles métier, sécurité, finance, Prisma
├── front/     # application React, pages publiques, dashboards, admin
├── ops/       # déploiement, monitoring, scripts d’exploitation
├── docs/      # documents produit et cadrage fonctionnel
└── README.md
```

## Ce qu’un nouveau contributeur doit comprendre rapidement

1. Ce projet n’est pas un simple site vitrine.
2. C’est une **plateforme métier multi-rôles**.
3. Les flux critiques sont :
   - authentification
   - permissions
   - paiements / abonnements
   - messagerie / notifications
   - dashboards par rôle
4. La logique produit importante se trouve surtout dans :
   - `backend/src`
   - `front/src/pages`
   - `front/src/lib`

## État actuel du projet

Le dépôt couvre déjà :

- les modules publics principaux
- les dashboards métier principaux
- une base de sécurité applicative
- des tests de sécurité et smoke tests
- une préparation sérieuse de la mise en production

Le projet est en phase de **stabilisation et durcissement** avant montée en production.

## Lancer le projet en local

### Frontend

```bash
cd front
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run build
npm run start:dev
```

Par défaut, le backend local est attendu sur `http://localhost:3003/api` si `backend/.env` contient `PORT=3003`.
Le script `start:dev` utilise le watcher Nest CLI, plus stable sous Node 22 que l'ancien loader `ts-node/esm`.

## Vérifications utiles

### Front

```bash
cd front
npm run verify
npm run type-check
npm run build
npm run smoke:test
```

### Backend

```bash
cd backend
npm run db:check
npm run build
npm run verify
npm run security:test
npm run data:access:test
npm run messaging:flow:test
npm run notifications:flow:test
```

Les checks HTTP backend supposent une API déjà lancée. Pour les exécuter ensemble :

```bash
cd backend
API_URL=http://localhost:3003/api npm run http:checks
```

Pour les smoke tests front, garder le même hostname côté front et API afin que les cookies de session soient renvoyés :

```bash
cd front
npm run dev -- --host 0.0.0.0 --port 3000
npm run smoke:test:client
```

Le registre des limites et risques techniques est maintenu dans `docs/ARCHITECTURE_RISK_REGISTER.md`.

## Mise en production

Le projet dispose déjà :

- d’un préflight de production
- d’un check Compose
- d’un check post-déploiement
- d’une stack Docker Compose de production

Séquence de base :

```bash
npm --prefix backend run production:env:init
# remplir ensuite BREVO_API_KEY, SendText, DexPay et Cloudflare R2
npm --prefix backend run production:env:set -- --require-all
npm --prefix backend run production:readiness:local
npm --prefix backend run production:readiness:report -- --strict
npm --prefix backend run production:env:status -- --strict
npm --prefix backend run production:external:check
npm --prefix backend run production:ready:check
npm --prefix backend run production:preflight
npm --prefix backend run production:compose:check
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml build
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d
npm --prefix backend run production:postdeploy
npm --prefix backend run production:restore:drill -- --backup-dir backups/postgres
```

`production:readiness:local` ignore uniquement Docker et le backup PostgreSQL pour faciliter le diagnostic depuis un poste de développement. Sur le VPS, utiliser `production:readiness:report -- --strict` sans option de skip avant tout déploiement.

`production:external:check` charge `ops/env/backend.production.env`, refuse les placeholders actifs, puis vérifie le provider uploads configuré. En production avec Cloudflare R2, ce check doit écrire puis supprimer un objet de test dans le bucket R2 avant tout go-live.

## Résumé

C2P est une plateforme métier complète, construite pour :

- connecter des profils professionnels
- gérer prestations, formations et projets
- encadrer les opérations sensibles via C2P
- faire tourner un produit multi-rôles exploitable en production

Si quelqu’un arrive sur ce dépôt pour la première fois, il doit retenir ceci :
**C2P n’est pas un site simple, c’est un écosystème SaaS métier avec front public, dashboards par rôle, back-office admin et logique finance/opérations.**
