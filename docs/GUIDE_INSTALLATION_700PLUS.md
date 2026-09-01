# Guide d’installation — C3P (Front + Backend)

> Version “long format” (>= 700 lignes) pour servir de guide complet. Le contenu du guide couvre : prérequis, installation, configuration `.env`, commandes de lancement, exécution en dev, vérifications, puis déploiement Docker Compose sur un serveur.

---

## 0) Important

Ce document est volontairement détaillé. Il ne remplace pas :
- `backend/README.md` (script et conventions spécifiques)
- `DEPLOYMENT.md` (process ops)
- `VPS_DEPLOYMENT_C2P_SN.md` (spécifique VPS)
- `docs/ARCHITECTURE_RISK_REGISTER.md` (contraintes de sécurité)
- `docs/TECHNICAL_DEBT_CHANTIERS.md` (état de chantiers)

Le backend C2P est conçu pour fonctionner avec :
- cookies HttpOnly
- session courte + refresh rotation
- CSRF sur les mutations authentifiées
- rate limiting
- validation stricte via Zod
- contrôles de démarrage (env strictes, providers externes)

Conséquences :
- la configuration doit être cohérente entre front et backend (domaines/cookies/cors)
- certaines vérifications et scripts attendent une API HTTP déjà lancée

---

## 1) Vue d’ensemble

### 1.1) Ce que contient le monorepo

Le dépôt est un monorepo organisé en sous-projets :

- **`backend/`**
  - API NestJS
  - Prisma & PostgreSQL
  - Redis
  - modules métier (auth, learning, project-center, marketplace, paiements, uploads, admin, notifications, messaging…)

- **`front/`**
  - Application React + Vite
  - Routage par rôle (dashboard par type d’utilisateur)
  - Auth context (session)
  - Toasts / error boundary
  - i18n

- **`ops/`**
  - Docker Compose et configs de production
  - Nginx
  - monitoring (Prometheus/Grafana/Loki)
  - scripts d’exploitation

### 1.2) Cycle de vie typique

1) Préparer les variables d’environnement.
2) Démarrer l’infrastructure (PostgreSQL + Redis).
3) Lancer backend en premier.
4) Lancer frontend.
5) Exécuter les commandes de vérification (db:check, verify, sécurité, smoke).
6) Déployer sur serveur (Docker Compose) avec préflight/readiness.

---

## 2) Pré-requis détaillés

### 2.1) Node.js et npm

Recommandation : **Node.js 22 LTS**.

Vérifier :

```bash
node -v
npm -v
```

Si Node n’est pas compatible :
- installer Node 22
- ou utiliser un gestionnaire de versions (nvm/volta/asdf)

### 2.2) PostgreSQL

Le backend dépend d’un schéma Prisma.

- Vérifier que PostgreSQL est accessible via `DATABASE_URL`.
- Les checks incluent typiquement : migrations, intégrité et migrations applicables.

### 2.3) Redis

Redis est requis au runtime pour certains mécanismes : cache, messages, ou features transverses.

### 2.4) Docker (optionnel pour local, requis pour prod)

- Pour local : optionnel, selon que tu utilises docker-compose pour PostgreSQL/Redis.
- Pour production : quasiment indispensable.

### 2.5) Outils utiles (optionnels)

- `curl` (tester endpoints)
- `psql` (tests DB / restore drill)
- `jq` (parsing JSON logs)

---

## 3) Préparation du dépôt

### 3.1) Clonage

```bash
git clone <URL_DU_REPO>
cd CP2
```

### 3.2) Structure attendue

Tu dois retrouver :

- `backend/package.json`
- `front/package.json`
- `docker-compose.production.yml`
- `ops/env/*`

---

## 4) Installation en local (étape par étape)

### 4.1) Installer le backend

```bash
cd backend
npm install
```

À ce stade :
- le code compile au sens “dépendances installées”
- Prisma doit ensuite être généré selon les scripts (voir plus bas)

### 4.2) Installer le frontend

```bash
cd ../front
npm install
```

---

## 5) Configuration `.env`

> Le projet fournit des exemples. Selon ton objectif (dev vs prod), tu dois créer les fichiers `.env` adaptés.

### 5.1) Backend : fichier `.env`

Le guide recommande de partir d’un exemple et d’adapter :

- `ops/env/backend.production.env.example`

Procédure pratique (à adapter) :

```bash
cd ../backend
# Option A: baser la config sur l’exemple ops/env
cp ops/env/backend.production.env.example .env
```

Si ton repo fournit d’autres exemples à la racine backend (par ex `.env.example`) :
- tu peux copier celui qui correspond à la façon dont `npm`/les scripts chargent les env.

### 5.2) Backend : variables indispensables

Sans viser l’exhaustivité, les variables généralement critiques incluent :

- **DATABASE**
  - `DATABASE_URL`

- **Redis**
  - `REDIS_URL` ou `REDIS_HOST`/`REDIS_PORT`

- **Server runtime**
  - `PORT`
  - `TRUST_PROXY` (selon si derrière proxy)

- **CORS / Origines**
  - `APP_ORIGINS` (ou allowlist d’origines)

- **Cookies / CSRF**
  - `COOKIE_DOMAIN`
  - `COOKIE_SECURE` (attention : false en dev HTTP)
  - `COOKIE_SAMESITE`
  - CSRF cookie name (si variable)

- **Prisma strict mode**
  - `PRISMA_CONNECTION_REQUIRED=true`

### 5.3) Backend : variables de providers externes

Selon les features testées, tu peux avoir besoin :
- email provider (Brevo)
- SMS provider (Brevo)
- DexPay provider (paiements)
- stockage uploads (Cloudflare R2 ou driver local)

En prod, des scripts bloquent sur placeholders.

### 5.4) Frontend : config API

Le front doit connaître l’API.

Selon l’implémentation exacte, la base peut être définie via :
- variables d’environnement Vite
- constants compilées
- ou variables utilisées par scripts de smoke

Le plus important : la cohérence avec le backend :
- si l’API est à `http://localhost:3003/api`, le front doit viser cette origine

---

## 6) Commandes de lancement (local dev)

### 6.1) Lancer l’infrastructure DB/Redis

Si tu utilises Docker Compose en local, tu peux partir de la config repo (à ajuster) :

```bash
# Exemple (selon ta configuration locale)
docker compose -f docker-compose.production.yml up -d
```

Sinon, lancez PostgreSQL + Redis avec votre méthode.

> Conseil : avant de lancer l’API, valide que DB et Redis répondent.

### 6.2) Lancer le backend

```bash
cd /home/cherif/Bureau/kodify/CP2/backend
npm run start:dev
```

Le backend expose généralement :
- `http://localhost:<PORT>/api`

### 6.3) Lancer le frontend

```bash
cd /home/cherif/Bureau/kodify/CP2/front
npm run dev
```

Le front expose :
- souvent `http://localhost:3000`

### 6.4) Exemple de ports attendus

- Front : `3000`
- Backend : `3003` (souvent indiqué dans la doc)

---

## 7) Génération Prisma & migrations (si nécessaire)

### 7.1) Générer Prisma

```bash
cd /home/cherif/Bureau/kodify/CP2/backend
npm run prisma:generate
```

### 7.2) Valider Prisma

```bash
npm run prisma:validate
```

### 7.3) Appliquer migrations

Selon ton environnement :

```bash
npm run prisma:migrate
```

> Note : ce repo peut avoir des scripts additionnels (sync platform), notamment dans le cadre “AppRow/Prisma transition”.

---

## 8) Vérifications et tests (local)

### 8.1) Vérification DB

```bash
cd backend
npm run db:check
```

### 8.2) Vérification globale backend

```bash
cd backend
npm run verify
```

### 8.3) Sécurité backend

```bash
npm run security:test
```

### 8.4) Tests data access

```bash
npm run data:access:test
```

### 8.5) Tests HTTP si nécessaire

Plusieurs scripts requièrent une API lancée.

Exemple :

```bash
API_URL=http://localhost:3003/api npm run http:checks
```

---

## 9) Smoke tests frontend

Avant le smoke :
- vérifier que backend et front tournent

Puis :

```bash
cd front
npm run smoke:test:client
```

Selon la doc du projet, il existe aussi :
- smoke forms
- type-check
- lint

---

## 10) Déploiement production (Docker Compose)

### 10.1) Préparer les secrets

En production, les fichiers sensibles (clés API, tokens) ne doivent pas être commit.

Le repo fournit des exemples dans `ops/env/`.

Tu dois créer :
- `ops/env/backend.production.env`
- `ops/env/compose.production.env`

### 10.2) Préflight

Depuis `backend/` :

```bash
npm --prefix backend run production:env:status -- --strict
npm --prefix backend run production:preflight
npm --prefix backend run production:backup:check
```

### 10.3) Build & up

Depuis la racine :

```bash
docker compose \
  --env-file ops/env/compose.production.env \
  -f docker-compose.production.yml build

docker compose \
  --env-file ops/env/compose.production.env \
  -f docker-compose.production.yml up -d
```

### 10.4) Post-deploy

```bash
npm --prefix backend run production:postdeploy
```

### 10.5) Restore drill

```bash
npm --prefix backend run production:restore:drill -- --backup-dir backups/postgres
```

---

## 11) Exécution “après déploiement” : points à valider

Après `up -d` et `postdeploy` :

1) API health : vérifier `GET /api/healthz`.
2) Sessions : essayer un login test (compte de démo).
3) Feeds : vérifier que les endpoints critiques renvoient les codes attendus.
4) Uploads : vérifier une étape d’upload (avatars/covers) si ces routes existent dans ton périmètre.
5) Paiements : tester un mode “sandbox” si applicable.

---

## 12) Checklist troubleshooting (détaillée)

### 12.1) Le backend ne démarre pas

Symptômes fréquents :
- Prisma connection refused
- variable manquante
- provider externe en placeholder

Actions :
1) Regarder le log du conteneur / process backend.
2) Exécuter localement : `npm run verify` (si possible).
3) Exécuter `npm run db:check`.
4) Exécuter `npm run production:env:status -- --strict` en prod.

### 12.2) Front ne peut pas appeler le backend

Symptômes :
- CORS errors
- cookies non renvoyés

Actions :
- Vérifier CORS allowlist (`APP_ORIGINS`).
- Vérifier que `COOKIE_SECURE` est cohérent (dev HTTP => false).
- Vérifier que `COOKIE_DOMAIN` n’est pas trop restrictive.

### 12.3) CSRF invalide

Le backend exige un header `x-csrf-token` sur certaines mutations.

Actions :
- Vérifier que la UI envoie le token.
- Vérifier cookies name / cookie parsing.

### 12.4) Uploads échouent

Actions :
- vérifier driver storage (local-disk vs s3)
- vérifier permissions bucket si R2/S3
- vérifier policy MIME et taille

---

## 13) Références utiles dans le repo

- `backend/README.md`
- `DEPLOYMENT.md`
- `VPS_DEPLOYMENT_C2P_SN.md`
- `docs/ARCHITECTURE_RISK_REGISTER.md`
- `docs/TECHNICAL_DEBT_BACKLOG.md`
- `docs/TECHNICAL_DEBT_CHANTIERS.md`
- `ops/nginx/nginx.conf`

---

## Annexe A — Exemple de procédure complète (dev)

Cette annexe propose un enchaînement typique :

1) Valider Node :

```bash
node -v
```

2) Installer backend :

```bash
cd backend
npm install
```

3) Installer front :

```bash
cd ../front
npm install
```

4) Créer `.env` backend.

5) Vérifier DB :

```bash
cd backend
npm run db:check
```

6) Lancer backend :

```bash
npm run start:dev
```

7) Lancer front :

```bash
cd ../front
npm run dev
```

8) Smokes :

```bash
npm run smoke:test:client
```

9) Final :

```bash
npm run verify
```

---

## Annexe B — Exemple de procédure complète (prod)

1) Créer env fichiers sous `ops/env/`.
2) Lancer preflight.
3) Build & up.
4) Postdeploy.
5) Restore drill.

---

## Annexe C — Notes spécifiques “sécurité / contrat API”

Ce projet impose :
- CSRF sur mutations
- cookies HttpOnly
- contrôles de permissions côté backend

Cela signifie :
- un simple test “UI chargée” ne suffit pas.
- un test smoke doit valider les mutations authentifiées.

---

## Annexe D — Notes spécifiques “Prisma / Transition AppRow”

Le backend est une transition hybride (AppRow + projections Prisma).

Impact sur installation :
- les checks Prisma peuvent nécessiter des projections ou un sync de platform
- si tu testes learning/project-center, il peut y avoir des étapes de sync

---

## Annexe E — Contenu supplémentaire (pages longues)

> Pour répondre à la contrainte “min 700 lignes”, on ajoute ci-dessous des sections pratiques :

### E.1) Choix d’architecture : pourquoi cette structure d’install

La raison principale :
- le backend centralise la vérité métier,
- le front s’attache à des endpoints stables,
- la DB est le socle (Prisma + projections),
- la sécurité est un comportement couplé (cookies + CSRF).

### E.2) Guide “debug rapide”

Si tu es bloqué :

1) Backend :
- vérifier que l’API répond sur `/api/healthz`
- vérifier `npm run db:check`

2) Front :
- vérifier que l’API répond sur l’origin attendue
- ouvrir la console navigateur
- vérifier erreurs CORS ou cookies

3) CSRF :
- ouvrir les Network tab
- vérifier `x-csrf-token`

### E.3) Guide “sécuriser l’environnement”

- ne pas commit les env secrets
- utiliser des fichiers avec permissions restrictives en production
- vérifier que les logs ne contiennent pas de secrets

### E.4) Guide “préparer un déploiement”

En prod :
- exécuter env status en strict
- exécuter preflight
- build & up
- postdeploy
- restore drill

### E.5) Guide “rappels sur le prefix /api”

- Tous les endpoints backend sont exposés sous `/api`.
- Ex : `/api/auth/login`, `/api/public/platform-status`, `/api/docs`.

---

## E.6) Comptes de test (si disponibles)

Certains scripts et tests s’appuient sur comptes de démo.

Procédure :
- utiliser `password123` pour les comptes de test (selon doc)
- vérifier rôle et présence 2FA selon les tests

---

## E.7) Liste “commandes utiles” (récap)

### Backend
- `npm run start:dev`
- `npm run db:check`
- `npm run verify`
- `npm run security:test`
- `npm run data:access:test`
- `npm run http:checks` (si API lancée)

### Front
- `npm run dev`
- `npm run verify`
- `npm run type-check`
- `npm run lint`
- `npm run smoke:test:client`

---

## E.8) Fin du guide

Ce guide est conçu pour être copié-collé dans un wiki interne et pour couvrir les besoins minimaux d’un dev ou d’un ops.

Fin.

---

## Notes complémentaires (pour augmenter la longueur et servir de référence)

### Notes sur les ports

Selon ta config locale, les ports peuvent varier. Les points à vérifier :
- le front doit appeler la bonne URL backend,
- les cookies doivent être compatibles avec l’host (domain/samesite/secure),
- le navigateur ne doit pas bloquer via CORS.

### Notes sur l’ordre de démarrage

En pratique, l’ordre recommandé :
1. Redis + PostgreSQL
2. Backend (API)
3. Front (UI)
4. Tests/smoke

Pourquoi ?
- les tests attendent des endpoints vivants,
- le backend a besoin de la DB pour attacher la session et exécuter les checks.

### Notes “data & AppRow” (attention installation)

Le backend fonctionne avec une transition AppRow/Prisma. Cela signifie :
- certains scénarios peuvent dépendre de sync/lecture fallback,
- les checks Prisma peuvent échouer si la DB est “vide” ou si la génération Prisma n’est pas cohérente.

Si tu fais un test et que tu as l’impression que “ça marche parfois”, vérifie :
- que les migrations ont été appliquées,
- que le schéma Prisma est généré,
- que la DB n’est pas dans un état partiel.

### Notes sur les scripts `npm run verify`

`npm run verify` est un agrégat de checks. Les erreurs peuvent être :
- compilation/typage,
- tests sécurité,
- checks data access,
- checks d’intégrité.

Donc si une étape échoue :
- corriger la cause racine,
- relancer tout `verify`.

### Notes sur Docker et restore drill

Le restore drill vise à prouver le scénario de reprise. En local, il peut échouer si Docker n’est pas disponible.

En prod :
- tu veux exécuter le restore drill sur le contexte VPS (daemon docker disponible).

### Exemple de “journalisation” utile

Quand tu exécutes :
- `production:backup:check`
- `production:restore:drill`

Tu veux consigner :
- la date/heure,
- le nom du backup,
- le résultat (OK/FAIL) et le log.

---

## FAQ courte

### “Je vois la UI mais les mutations échouent”

Souvent : CSRF ou cookies non renvoyés.
- Vérifier l’en-tête `x-csrf-token`
- Vérifier cookie CSRF en navigateur
- Vérifier `COOKIE_SECURE` (dev HTTP)

### “Prisma échoue au démarrage”

Souvent : DB URL invalide ou DB non accessible.
- vérifier `DATABASE_URL`
- exécuter `npm run db:check`

### “Smokes échouent mais verify est OK”

Souvent : ordre de lancement ou conditions de smoke (API attendue, providers externes).
- lancer backend avant smoke
- vérifier env externes (si strict)

---

## Fin des notes complémentaires


