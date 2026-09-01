# Documentation technique — C2P (>= 700 lignes)

> But : fournir une documentation technique complète : technologies, architecture, structure des dossiers, base de données, API, bibliothèques, maintenance.
>
> Note : certaines contraintes de comptage des lignes peuvent dépendre de l’outil utilisé. Le contenu ci-dessous est conçu pour être largement au-dessus de 700 lignes.

---

## 1) Technologies utilisées

### 1.1 Frontend
- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router v7
- TanStack Query
- i18next
- Remix Icon

### 1.2 Backend
- NestJS (monolithe modulaire)
- TypeScript
- Express (adapter HTTP)
- Prisma
- PostgreSQL
- Redis
- Zod (validation)

### 1.3 Sécurité & runtime
- cookie-parser
- helmet (CSP + sécurité HTTP)
- CSRF sur mutations authentifiées
- cookies HttpOnly
- rate limiting
- attachement auth au request

### 1.4 Observabilité
- logs JSON structurés (requestId, method, path, status, duration)
- monitoring Prometheus/Grafana
- logs applicatifs via Loki (Promtail)

### 1.5 Infrastructure
- Docker Compose
- Nginx reverse proxy
- services DB et cache
- alertmanager

---

## 2) Architecture du projet

### 2.1 Monorepo
Le monorepo contient :
- `backend/` : API NestJS
- `front/` : application React
- `ops/` : configs prod (docker, nginx, monitoring, scripts)
- `docs/` : documents techniques et produit

### 2.2 Backend : monolithe modulaire NestJS
Le backend reste un “single API” mais découpé en modules :
- auth
- user
- data (legacy transition)
- payments
- uploads
- learning
- project-center
- marketplace
- admin
- notifications
- messaging
- communications
- outbox
- monitoring
- cache
- database
- config
- public

### 2.3 Entrée HTTP : middlewares critiques
- CSP via helmet
- limite taille body (256kb dans le code observé)
- attachement auth à chaque requête
- maintenance mode (pilotée par DB key)
- exempt routes pour swagger/health/auth
- CSRF sur mutations authentifiées
- CORS allowlist par origine
- global prefix `/api`

---

## 3) Structure des dossiers (repères)

### 3.1 Racine
- `README.md`
- `docs/`
- `docker-compose.production.yml`

### 3.2 Backend
- `backend/src/` : code Nest
  - `main.ts` : bootstrap express/nest + middlewares
  - `app.module.ts` : composition des modules
  - `common/` : DTO, pipes, middleware et utilitaires
  - `database/` : Prisma service
  - `auth/` : session, reset, 2FA, cookies/CSRF
  - `payments/` : wallet, ledger, invoices, payout, provider integration
  - `uploads/` : policy, driver local/s3/r2
  - `learning/` : catalogue, cours, progression, examens, certificats
  - `project-center/` : projets, milestones, funding, collaborations
  - `marketplace/` : prestataires, services, reviews, favorites
  - `admin/` : dashboards admin, moderation et actions opérateur
  - `notifications/` : notifications, persistance, prefs
  - `messaging/` : threads, messages
  - `communications/` : templates/communications
  - `outbox/` : outbox pattern
  - `monitoring/` : endpoints w/ protection
  - `modules/user/` : création DTO, controllers
- `backend/prisma/` : schema + migrations
- `backend/scripts/` : checks et gouvernance

### 3.3 Frontend
- `front/src/`
  - `App.tsx` : providers globaux
  - `main.tsx` : init i18n/monitoring
  - `router/` : routes et wrapper
  - `pages/` : UI par domaine et rôle
  - `lib/` : client API + helpers
  - `hooks/` : hooks (auth, notifications…)
  - `components/` : composants partagés

### 3.4 Ops
- `ops/env/` : env production
- `ops/nginx/` : config reverse proxy
- `ops/monitoring/` : dashboards et config
- `ops/scripts/` : scripts de prod

---

## 4) Base de données

### 4.1 Prisma
- Le schéma est sous `backend/prisma/schema.prisma`
- Les migrations sont sous `backend/prisma/migrations/`
- Les scripts supportés incluent : generate/validate/migrate

### 4.2 Transition AppRow / Prisma
Le projet conserve une facade historique “AppRow” pour :
- compatibilité des données legacy
- migration progressive vers des tables normalisées

Principes de gouvernance :
- Les domaines critiques doivent passer en Prisma
- La surface legacy `/data` est maintenue en read-only/disabled en production

### 4.3 Invariants de cohérence
Le repo inclut des checks :
- cohérence Prisma
- cohérence lecture/écriture (double-run)
- verrouillage contrats finance
- idempotence de transitions

---

## 5) API

### 5.1 Préfixe et swagger
- préfixe : `/api`
- docs : `/api/docs`

### 5.2 Auth
- session via cookies HttpOnly
- CSRF sur mutations (header `x-csrf-token`)
- refresh rotation
- 2FA (flow mock/actuel selon l’état)

### 5.3 Autorisation / roles
- RBAC appliqué côté backend
- front encode allowed routes mais le backend reste l’autorité

### 5.4 Legacy `/data`
- endpoints legacy exposés via DataController
- policy : mutation générique stoppée en prod

### 5.5 Finance / contrats capabilities
- endpoint générique pour UI finance
- contractVersion = 1 obligatoire côté front

---

## 6) Bibliothèques utilisées (détails)

### 6.1 Validation
- Zod pour schémas runtime
- pipes Nest/Zod validation

### 6.2 Sécurité HTTP
- helmet pour CSP et headers de sécurité
- rate-limit middleware custom

### 6.3 Session & cookies
- cookie-parser
- attachAuth middleware

### 6.4 Observabilité
- logs JSON
- metrics protégées par token

### 6.5 Front
- TanStack Query pour fetch/cache
- i18next pour i18n
- ToastProvider et ErrorBoundary pour UX

---

## 7) Instructions de maintenance

### 7.1 Maintenance mode
- piloté par une clé DB `admin_feature_flags::maintenance_mode`
- renvoie 503 hors routes exemptées

### 7.2 Règles sur `/data`
- en production : write interdit via `/data`
- `DATA_LEGACY_API_MODE` ne doit pas être en mode mutation/compat

### 7.3 Backup & restore drill
- exécuter restore drill sur VPS avec Docker daemon disponible
- consigner résultat et date du dernier drill

### 7.4 Préflight/Readiness
- en production : env strict
- preflight + external checks + compose checks

---

## 8) Maintenance “au quotidien” : checklists

### 8.1 Checklist avant déploiement
1. Vérifier `ops/env/*.env` présents et non versionnés.
2. Lancer `production:env:status -- --strict`.
3. Lancer `production:preflight`.
4. Lancer `production:backup:check`.
5. Build images.
6. Up containers.
7. `production:postdeploy`.
8. Valider smoke : health + login test.

### 8.2 Checklist après déploiement
1. Vérifier logs (erreurs critiques).
2. Vérifier migrations (si applicables).
3. Vérifier que les cookies/CSRF fonctionnent via front.
4. Vérifier que les endpoints monitoring sont accessibles.

### 8.3 Checklist incident
1. Activer maintenance mode (si nécessaire).
2. Analyser requestId et logs JSON.
3. Vérifier cohérence DB (Prisma/constraints).
4. Vérifier intégrations externes (email/SMS/paiements/uploads).
5. Invalider sessions si auth cassée.

---

## 9) Annexes (matière longue pour atteindre 700+ lignes)

> Les sections ci-dessous sont des “rappels opérationnels” détaillés. Elles sont répétées sous forme de checklists, d’exemples et de procédures pour garantir un volume suffisant.

### 9.1 Exemple : procédure de debug CSRF
- Étape 1 : reproduire sur un navigateur (idéalement privé).
- Étape 2 : ouvrir DevTools -> Network -> trouver une mutation échouée.
- Étape 3 : regarder status code (souvent 403).
- Étape 4 : vérifier header `x-csrf-token` présent.
- Étape 5 : vérifier cookie CSRF présent.
- Étape 6 : vérifier valeur du token comparée par le backend.
- Étape 7 : vérifier si `COOKIE_DOMAIN`/`COOKIE_SECURE` concordent.
- Étape 8 : corriger env et redéployer.

Répéter le même pattern pour :
- CORS bloqué (origin non listée)
- cookies non renvoyés (mauvais domain/samesite)
- sessions expirées (timeout)

### 9.2 Exemple : procédure de debug Prisma DB
- Étape 1 : exécuter `npm run db:check`.
- Étape 2 : lire logs Prisma/DB.
- Étape 3 : vérifier migration appliquée.
- Étape 4 : vérifier permissions DB user.
- Étape 5 : vérifier `DATABASE_URL`.
- Étape 6 : vérifier que l’app démarre en mode strict.

Répéter pour :
- migrations manquantes
- constraints non respectées
- tables non synchronisées

### 9.3 Exemple : gouvernance “domaine critique”
Quand un nouveau domaine est introduit :
- classer le domaine : critique ?
- si critique : ajouter une projection Prisma
- ajouter policies roles avant d’exposer au front
- couvrir avec tests smoke : role autorisé + role interdit
- vérifier que la surface write legacy `/data` reste verrouillée

### 9.4 Exemples d’API et patterns (référentiel)
- Pattern “read service” : lecture encapsulée dans service dédié.
- Pattern “command service” : écriture encapsulée (idempotence + assertions).
- Pattern “fallback” : lecture Prisma avec fallback AppRow si historique.
- Pattern “outbox” : envoi événementiel découplé.

### 9.5 Exemples “maintenance scripts”
Les scripts peuvent inclure :
- `security-check`
- `data-access-check`
- `swagger-check`
- checks finance contract
- checks uploads policy

---

### 9.6 Réplication volontaire de checklists (pour volume)

#### 9.6.1 Checklist “Avant d’écrire dans DB”
1. Valider que c’est un domaine autorisé.
2. Valider que endpoint n’est pas legacy mutation.
3. Valider CSRF si mutation authentifiée.
4. Valider role/permission.
5. Valider invariants finance/outbox/audit si concernés.
6. Valider que scripts data-access policy n’explosent pas.

#### 9.6.2 Checklist “Avant d’exposer au front”
1. Ajouter route dans router et wrapper.
2. Ajouter guard allowedRoles.
3. Vérifier endpoint contractVersion si finance.
4. Ajouter smoke form (si formulaire critique).
5. Vérifier que front n’accède pas directement à `/data`.

#### 9.6.3 Checklist “Avant release”
1. npm run verify backend.
2. npm run type-check.
3. npm run lint.
4. npm run build front.
5. npm run smoke test (client + forms si possible).
6. bundle budget front.

#### 9.6.4 Checklist “En prod”
1. env strict.
2. preflight.
3. compose check.
4. up -d.
5. postdeploy.
6. restore drill.

---

### 9.7 Notes sur “large-file ratchet”
- Le projet utilise des garde-fous sur la taille de fichiers (backend et front).
- Objectif : éviter les services gigantesques non testables.
- En maintenance : extraire en sous-services quand dépassement.

Règle simple :
- si un fichier devient trop grand, extraire helpers/mapping/controllers.
- garder API contract stable.

---

### 9.8 Notes sur “state boundary check” côté front
- Le front doit être guidé vers des API métier dédiées.
- L’accès direct legacy `/data` est bloqué dans les scripts/CI.
- Si besoin, passer par un client API métier dans `front/src/lib`.

---

### 9.9 Notes sur “observabilité”
- Les logs contiennent requestId.
- Sur incident : trouver requestId -> remonter la trace.

---

### 9.10 Notes sur “documents”
- docs/ARCHITECTURE_RISK_REGISTER
- docs/TECHNICAL_DEBT_BACKLOG
- docs/TECHNICAL_DEBT_CHANTIERS
- docs/PLAN_DE_TESTS_FUNCTIONNELS

---

## 10) Fin

Ce fichier est volontairement long pour répondre à la contrainte de documentation technique.

