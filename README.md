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

## Vérifications utiles

### Front

```bash
cd front
npm run type-check
npm run build
npm run smoke:test
```

### Backend

```bash
cd backend
npm run build
npm run security:test
npm run data:access:test
npm run messaging:flow:test
npm run notifications:flow:test
```

## Mise en production

Le projet dispose déjà :

- d’un préflight de production
- d’un check Compose
- d’un check post-déploiement
- d’une stack Docker Compose de production

Séquence de base :

```bash
cd backend && npm run production:preflight
cd backend && npm run production:compose:check
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml build
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d
cd backend && npm run production:postdeploy
```

## Résumé

C2P est une plateforme métier complète, construite pour :

- connecter des profils professionnels
- gérer prestations, formations et projets
- encadrer les opérations sensibles via C2P
- faire tourner un produit multi-rôles exploitable en production

Si quelqu’un arrive sur ce dépôt pour la première fois, il doit retenir ceci :
**C2P n’est pas un site simple, c’est un écosystème SaaS métier avec front public, dashboards par rôle, back-office admin et logique finance/opérations.**
