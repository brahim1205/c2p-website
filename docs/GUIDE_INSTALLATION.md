# Guide d’installation — C2P (Front + Backend)

> Ce document explique comment installer, configurer et lancer le monorepo **C2P** en local, puis comment le déployer sur un serveur.

---

## Sommaire
1. Vue d’ensemble
2. Pré-requis
3. Prendre en main le dépôt (monorepo)
4. Installation (local)
   - Backend
   - Frontend
5. Configuration `.env`
   - backend
   - front
6. Commandes de lancement
   - démarrage en développement
   - génération & vérifications
7. Vérifications rapides (smoke)
8. Déploiement sur un serveur (Docker Compose)
9. Checklist de troubleshooting

---

## 1) Vue d’ensemble
Le projet C2P est un monorepo structuré ainsi :
- `backend/` : API NestJS + Prisma + PostgreSQL + Redis
- `front/` : application React (Vite)
- `ops/` : configurations Docker, Nginx et monitoring
- `docs/` : documents produit/tech

Le backend sert l’API sous le préfixe `/api`.

---

## 2) Pré-requis

Ce guide suppose une exécution “normale” du monorepo, avec :
- backend NestJS démarré et connecté à PostgreSQL + Redis,
- front Vite démarré et capable de faire des appels à l’API.

> Le backend C2P utilise des **cookies HttpOnly** et un mécanisme **CSRF** sur les mutations. Cela implique une configuration cohérente entre front/back (domaines, CORS, cookies).

### Systèmes / outils
- **Git** : pour récupérer le dépôt.
- **Node.js** : recommandé **Node 22 LTS** (compatible avec le code actuel).
- **npm** : pour installer les dépendances.
- **(Optionnel) Docker** : pour lancer l’infrastructure locale (ou valider le build).
- **PostgreSQL** : requis si tu veux que `npm run db:check` et Prisma fonctionnent.
- **Redis** : requis si l’app attend Redis au runtime.

### Dépendances techniques (librairies)
- **NestJS** : framework backend.
- **Prisma** : génération du client, validations et migrations.
- **Zod** : validation côté backend.
- **React Router** + **TanStack Query** : front (chargement de données, caching).

### Version conseillée
- Node 22
- PostgreSQL : version compatible Prisma (voir `backend/prisma/schema.prisma`)

### Vérification rapide de l’environnement
Avant d’attaquer l’installation, tu peux lancer :

```bash
node -v
npm -v
```

Si tu n’es pas sur Node 22, change de version (nvm, volta, asdf…) avant de poursuivre : plusieurs scripts et la stabilité du démarrage backend sont supposés adaptés à Node 22.

---

## 2.1) Pourquoi la cohérence front/back est cruciale (cookies + CSRF)
Le backend est configuré pour :
- attacher une session/auth à chaque requête,
- exiger un **token CSRF** (via header `x-csrf-token`) sur les mutations authentifiées,
- utiliser des cookies (domain/samesite/secure) qui doivent correspondre à l’origine effective du front.

Conséquence pratique :
- Ne mélange pas un front servi en HTTPS et un back sur HTTP sans ajuster `COOKIE_SECURE`.
- Ne change pas arbitrairement `COOKIE_DOMAIN` : sinon tu risques des cookies non renvoyés.
- Ne change pas arbitrairement la valeur CORS/allowlist : sinon tu risques des erreurs bloquantes côté navigateur.

---

## 2.2) Où trouver les conventions d’exécution dans ce repo
Les docs “opérationnelles” et de durcissement se trouvent principalement dans :
- `docs/ARCHITECTURE_RISK_REGISTER.md` : contraintes d’ajout de nouveaux flux et règles autour de `/data`.
- `docs/TECHNICAL_DEBT_CHANTIERS.md` : état des chantiers (ex : lecture/écriture legacy).
- `docs/PROJECT_AUDIT_2026-05-28.md` : synthèse risques et points forts.
- `backend/README.md` : conventions dev pour scripts et checks.
- `ops/` : configs Docker/Nginx/monitoring.


---

## 3) Prendre en main le dépôt (monorepo)
Depuis la racine du projet :

```bash
cd /home/cherif/Bureau/kodify/CP2
```

Les répertoires importants :
- `backend/`
- `front/`
- `ops/`

---

## 4) Installation (local)

### 4.1) Backend

```bash
cd backend
npm install
```

### 4.2) Frontend

```bash
cd ../front
npm install
```

---

## 5) Configuration `.env`

> Le projet utilise des cookies HttpOnly et un mécanisme CSRF sur les mutations authentifiées. Les environnements doivent donc être cohérents entre front et back.

### 5.1) Backend : `.env`
1. Copier l’exemple :

```bash
cd /home/cherif/Bureau/kodify/CP2/backend
cp ops/env/backend.production.env.example .env 2>/dev/null || cp .env.example .env 2>/dev/null || true
```

2. Ajuster au minimum :
- `DATABASE_URL` : URL de connexion PostgreSQL
- `REDIS_URL` (ou `REDIS_HOST`/`REDIS_PORT`)
- `PORT` (si besoin)
- `APP_ORIGINS` ou équivalent (CORS / allowlist)
- `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE`
- `PRISMA_CONNECTION_REQUIRED=true` (par défaut, conseillé pour éviter un démarrage “dégradé”)

3. Utiliser un schéma de démarrage classique :
- Backend en local sur `http://localhost:3003/api`

> Les variables de service externes (email/SMS/DEXPay/R2) peuvent être nécessaires selon les fonctionnalités déclenchées. Si tu veux un smoke minimal, configure celles requises par les checks de démarrage.

### 5.2) Frontend : configuration runtime
La config front passe par :
- Vite / variables de build
- un `API_URL` côté scripts ou configuration (selon l’architecture du projet)

Point d’attention :
- **front et back doivent partager la logique cookie** (domain/samesite/secure) et la cohérence d’origine (CORS).

---

## 6) Commandes de lancement

### 6.1) Lancer PostgreSQL & Redis (si nécessaire)
Option A : Docker Compose (recommandé)
- se référer à `docker-compose.production.yml` ou à la configuration locale disponible

Option B : services installés nativement
- configurer `DATABASE_URL` et `REDIS_URL`

### 6.2) Démarrage en développement (dev)

#### Backend

```bash
cd /home/cherif/Bureau/kodify/CP2/backend
npm run start:dev
```

#### Frontend

```bash
cd /home/cherif/Bureau/kodify/CP2/front
npm run dev
```

> À vérifier :
> - front expose son serveur (souvent `http://localhost:3000`)
> - backend expose l’API avec le préfixe `/api`

---

## 7) Vérifications rapides (smoke)

### 7.1) Backend verification

```bash
cd /home/cherif/Bureau/kodify/CP2/backend
npm run db:check
npm run verify
npm run security:test
npm run data:access:test
```

> Certaines suites attendent l’API HTTP déjà lancée.

### 7.2) Checks HTTP backend

```bash
API_URL=http://localhost:3003/api npm run http:checks
```

### 7.3) Smoke tests frontend

```bash
cd /home/cherif/Bureau/kodify/CP2/front
npm run smoke:test:client
```

---

## 8) Déploiement sur un serveur (Docker Compose)

### 8.1) Prérequis serveur
- Docker + Docker Compose
- Accès réseau entre containers (ports et firewall)
- Secrets et fichiers sensibles en dehors du repo

### 8.2) Utiliser les env de production `ops/env`
- `ops/env/backend.production.env.example`
- `ops/env/compose.production.env.example`

Créer les fichiers réels (sans les commit) :
- `ops/env/backend.production.env`
- `ops/env/compose.production.env`

> Ces fichiers contiennent typiquement :
> - clés email/SMS
> - clés providers (DexPay)
> - configuration uploads (Cloudflare R2)
> - domaines & cookies

### 8.3) Preflight / readiness avant le deploy
Depuis `backend/` :

```bash
npm run production:env:status -- --strict
npm run production:preflight
npm run production:backup:check
```

### 8.4) Build & up Docker Compose
Depuis la racine du projet :

```bash
docker compose \
  --env-file ops/env/compose.production.env \
  -f docker-compose.production.yml build

docker compose \
  --env-file ops/env/compose.production.env \
  -f docker-compose.production.yml up -d
```

### 8.5) Post-deploy
Depuis `backend/` :

```bash
npm --prefix backend run production:postdeploy
```

### 8.6) Restore drill (obligatoire opérationnellement)

```bash
npm --prefix backend run production:restore:drill -- --backup-dir backups/postgres
```

> Les scripts de restore drill servent à valider l’ensemble du scénario dans le contexte Docker (l’API et les conteneurs selon votre infra).

---

## 9) Checklist de troubleshooting

### Problèmes fréquents

#### CORS / Cookies
- Vérifier l’allowlist d’origine (`APP_ORIGINS` côté backend)
- Vérifier `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE`

#### Prisma / Base de données
- Vérifier `DATABASE_URL`
- Lancer :

```bash
npm --prefix backend run db:check
```

#### CSRF invalid
- Le front doit envoyer `x-csrf-token` et le cookie CSRF
- Vérifier configuration CSRF cookie name et comportement d’origine

#### Fonctionnalités externes non configurées
- Les checks prod peuvent refuser les placeholders
- Vérifier les variables email/SMS/payments/uploads

---

## Conclusion
Le chemin “standard” recommandé :
1. Installer dépendances (`backend` + `front`)
2. Configurer `.env` (back en premier)
3. Lancer backend puis front
4. Exécuter `db:check`, `verify` et smoke tests
5. Déployer via Docker Compose avec préflight/readiness et restore drill

---

> Note : en cas d’écart entre les versions Node/Pnpm/Npm, ajuster en conservant Node 22 et les scripts fournis par le repo.
