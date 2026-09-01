# Documentation technique — C2P

> Objectif : fournir une vue technique stable et orientée “développeur/ops” pour le monorepo **C2P**.

---

## 1) Technologies utilisées

### 1.1 Frontend
- **React 19**
- **TypeScript**
- **Vite** (bundler + dev server)
- **Tailwind CSS**
- **React Router v7**
- **TanStack Query** (Data fetching/caching)
- **i18next** (internationalisation)
- UI : **Remix Icon** et composants applicatifs.

### 1.2 Backend
- **NestJS** (monolithe modulaire)
- **TypeScript**
- **Express** (plateforme HTTP derrière Nest)
- **Prisma** (ORM)
- **PostgreSQL**
- **Redis** (cache / mécanismes transverses)
- Validation runtime : **Zod**

### 1.3 Sécurité & runtime
- Sessions via **cookies HttpOnly**
- Mécanisme **CSRF** sur mutations authentifiées
- Rate limiting
- Helmet / CSP
- Observabilité : logs JSON structurés + request id

### 1.4 Déploiement / infra
- **Docker Compose**
- **Nginx** (reverse proxy)
- Monitoring : **Prometheus / Grafana**
- Logs : **Loki / Promtail**

---

## 2) Architecture du projet

### 2.1 Vue d’ensemble (monorepo)
Le dépôt est organisé comme suit :
- `backend/` : API + modules métier + sécurité + Prisma/DB
- `front/` : application web + pages par rôle
- `ops/` : configs Docker/Nginx/monitoring + scripts d’exploitation
- `docs/` : documentation technique et produit

### 2.2 Backend : monolithe modulaire NestJS
Le backend centralise toutes les routes HTTP sous le préfixe **`/api`**.

`backend/src/app.module.ts` compose les modules suivants (exemples) :
- `auth` / `modules/user`
- `public` (endpoints publics)
- `data` (legacy transition)
- `payments` (finance)
- `uploads` (gestion upload objets)
- `learning`, `project-center`, `marketplace`
- `admin`, `notifications`, `messaging`, `communications`, `outbox`
- `monitoring`, `cache`, `database`, `config`

#### Contrôle d’entrée (main.ts)
`backend/src/main.ts` met en place :
- CSP/Helmet
- `cookieParser`
- limitation taille body
- attach de l’auth côté requête (et log user/role)
- maintenance mode (piloté par DB)
- CSRF sur mutations authentifiées
- CORS allowlist
- Swagger (cookie session + x-csrf-token)

### 2.3 Frontend : routing multi-rôles
Le front utilise `BrowserRouter` et une architecture “pages + wrappers” :
- Auth provider
- Error boundary
- Toast provider
- i18n provider

Les dashboards sont organisés par rôles et exposent une UI alignée avec les capacités backend.

---

## 3) Structure des dossiers (repères rapides)

### 3.1 Racine
- `README.md` : entrée principale
- `docs/` : documents d’architecture, audit et dette
- `docker-compose.production.yml` : stack prod

### 3.2 `backend/`
- `src/`
  - `auth/` : logique session/auth
  - `database/` : Prisma service et connexion
  - `common/` : middleware/pipes/DTO
  - `payments/` : paiements, wallet, ledger, webhooks, outbox
  - `uploads/` : policy fichiers + stockage
  - `learning/`, `project-center/`, `marketplace/` : domaines métier
  - `admin/`, `notifications/`, `messaging/`
- `prisma/` : schema + migrations
- `scripts/` : checks/ratchets sécurité & data integrity

### 3.3 `front/`
- `src/`
  - `pages/` : pages par domaine & rôle
  - `router/` : routes
  - `lib/` : clients API et utilitaires
  - `hooks/` : hooks (auth, notifications, etc.)
  - `components/` : UI réutilisable

### 3.4 `ops/`
- `env/` : fichiers .env de production (exemples + réels côté ops)
- `nginx/` : config reverse proxy
- `monitoring/` : Prometheus/Grafana/Loki
- `scripts/` : scripts d’exploitation et de preflight/readiness

---

## 4) Base de données

### 4.1 ORM Prisma
- Prisma est utilisé comme couche d’accès principale.
- Le schéma est sous `backend/prisma/schema.prisma`.
- Les migrations sont dans `backend/prisma/migrations/`.

### 4.2 Transition AppRow / Prisma
Le backend conserve une **facade historique** appelée **`AppRow`** pour des données legacy.
- Objectif : éviter de casser les flux existants pendant la migration vers des projections Prisma.
- Les nouveaux domaines critiques sont progressivement basculés vers Prisma.

### 4.3 Règles opérationnelles liées à la DB
Le projet applique des checks de cohérence via scripts (dans `backend/scripts/`) et des checks via CI.

---

## 5) API (contrat et endpoints)

### 5.1 Préfixe et documentation
- Préfixe global : **`/api`**
- Swagger :
  - `/api/docs`
  - `/api/docs-json`
  - `/api/docs-yaml`

### 5.2 AuthN/AuthZ
- Auth via cookies HttpOnly
- CSRF sur mutations authentifiées (header `x-csrf-token`)
- Permissions/allowed roles gérées côté backend

### 5.3 Legacy `/data`
Le système a une surface legacy `data` pendant la transition.
- En prod, le mode legacy est maintenu **read-only/disabled** selon configurations.

---

## 6) Bibliothèques et conventions

### 6.1 NestJS conventions
- modules par domaine
- séparation controller/service/DTO
- validation runtime via pipes/DTO (Zod)

### 6.2 Observabilité
- logs JSON structurés (requestId, method, path, status, duration, user/role)

### 6.3 Contrôles anti-régression
- ratchets “large file ratchet” (limites de taille)
- checks CI/scripts pour : sécurité, accès data, cohérence Prisma, finance contract checks

---

## 7) Instructions de maintenance

### 7.1 Maintenance mode
Le backend possède une “maintenance mode” pilotée via une clé DB :
- `admin_feature_flags::maintenance_mode`

Quand actif : réponse `503` sur la majorité des routes exemptées uniquement pour certains endpoints (health, auth, monitoring, swagger, superadmin).

### 7.2 Scripts de maintenance / checks
Les scripts importants sont dans :
- `backend/scripts/`

Ils permettent de :
- vérifier sécurité
- vérifier accès data
- vérifier intégrité des flux finance/messaging/learning
- auditer uploads

### 7.3 Backup / Restore drill
En production, un restore drill doit être validé et consigné.
Les commandes (voir docs prod) typiques :
- `production:backup:check`
- `production:restore:drill -- --backup-dir <dir>`

---

## 8) Références
- `docs/ARCHITECTURE_RISK_REGISTER.md`
- `docs/PROJECT_AUDIT_2026-05-28.md`
- `docs/TECHNICAL_DEBT_BACKLOG.md`
- `docs/TECHNICAL_DEBT_CHANTIERS.md`
- `DEPLOYMENT.md`
- `VPS_DEPLOYMENT_C2P_SN.md`


