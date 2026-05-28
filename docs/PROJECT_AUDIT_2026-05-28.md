# Audit projet C2P - 2026-05-28

## Synthese

Le projet est une plateforme SaaS metier avancee, pas un prototype. L'architecture monolithe modulaire NestJS + React/Vite + Prisma/PostgreSQL est adaptee au stade actuel. Les controles recents ferment le principal risque historique: l'ecriture generique via `/data`.

Niveau global: bon, avec reserves sur la dette `AppRow`, les gros services historiques et le restore drill Docker a executer sur un environnement qui dispose du daemon Docker.

## Findings prioritaires

### P0 - Restore drill production Docker non prouve dans cet environnement

Constat:

- un backup PostgreSQL local a ete genere et verifie;
- le restore drill local via `psql` passe;
- le restore drill Docker echoue ici car le daemon Docker n'est pas disponible.

Impact:

- le backup local est restaurable, mais le scenario Docker/VPS reste a rejouer dans l'environnement de production.

Action:

- executer `npm run production:backup:check` sur l'environnement production;
- executer `npm run production:restore:drill -- --backup-dir backups/postgres` apres le premier backup reel;
- journaliser la date du dernier drill.

### P1 - Dette `AppRow` encore structurante

Constat:

- 60 tables data connues;
- 13 tables avec projection normalisee ou auth normalisee;
- 50 tables classees comme dette `AppRow`;
- 0 table non classee.

Impact:

- modele mental double: JSON generique + Prisma normalise;
- risque de divergence tant que learning, project-center, marketplace, messaging, notifications et admin restent partiellement dans `AppRow`.

Action:

- migrer domaine par domaine vers Prisma;
- commencer par learning/public catalog ou project-center public;
- garder `npm run app-row:governance:check` obligatoire.

### P1 - Gros services backend

Constat:

- 12 gros fichiers backend suivis par ratchet;
- principaux fichiers: `auth.service.ts`, `wallet.service.ts`, `provider-integration.service.ts`, `learning-access.service.ts`.

Impact:

- review difficile;
- risque de regression quand plusieurs responsabilites changent ensemble.

Action:

- extraire par sous-service sans changer les contrats API;
- abaisser le plafond dans `large-file-ratchet-check.mjs` apres chaque extraction.

### P2 - Budget frontend proche du plafond total

Constat:

- le budget passe, mais le total JS gzip est a 713.5 KB pour une limite de 750 KB;
- les plus gros chunks gzip sont `index` autour de 158 KB et une page autour de 103.7 KB.

Impact:

- peu de marge pour ajouter de grosses surfaces dashboard sans lazy-loading ou split supplementaire.

Action:

- garder `front npm run bundle:budget` obligatoire;
- prioriser le split des pages lourdes avant de relever le budget.

## Points forts

- `/data` legacy: 0 surface d'ecriture generique restante.
- Frontend: 0 acces direct `/data`.
- Production config: preflight OK, env strict OK, providers externes OK.
- Securite auth: cookies httpOnly, CSRF sur mutations authentifiees, rate limit, refresh rotation, lockout login, password policy, hash Argon2.
- Finance: ledger/state-machine/contract checks OK.
- Uploads: policy MIME et storage check OK.
- Monitoring: metrics protegees par token, logs JSON avec request id.
- Secrets prod: fichiers reels non suivis par Git et permissions `600`.

## Verifications executees

Backend:

- `npm run verify`: OK
- `npm run db:check`: OK
- `npm audit --omit=dev`: 0 vulnerabilite
- `npm run production:runtime:check`: OK
- `npm run production:compose:check -- --compose-env ops/env/compose.production.env.example`: OK
- `npm run production:preflight`: OK
- `npm run production:external:check`: OK
- `npm run production:readiness:local`: OK avec backup et docker skips
- `npm run production:backup:check`: OK avec backup local genere
- `npm run production:restore:drill:local -- --backup-dir backups/postgres`: OK, 31 tables publiques restaurees
- `API_URL=http://localhost:3003/api npm run http:checks`: OK

Frontend:

- `npm run verify`: OK
- `npm run smoke:test:client`: OK
- `npm audit --omit=dev`: 0 vulnerabilite
- bundle budget: OK, total JS gzip 713.5 KB pour limite 750 KB

## Etat prod observe

- `ops/env/backend.production.env`: present, non versionne, mode `600`.
- `ops/env/compose.production.env`: present, non versionne, mode `600`.
- `ops/monitoring/prometheus/secrets/metrics-token`: present, mode `600`.
- `ops/nginx/certs/privkey.pem`: present, non versionne, mode `600`.
- `DATA_LEGACY_API_MODE=read-only`.
- `UPLOAD_STORAGE_DRIVER=s3`.
- `EMAIL_PROVIDER=brevo`.
- R2 et Dexpay controles par scripts externes: OK.

## Roadmap recommandee

1. Executer le restore drill Docker sur le VPS.
2. Migrer une premiere famille `AppRow` vers Prisma: project-center public ou learning catalog.
3. Decouper `auth.service.ts` en session, password reset, profile et admin user management.
4. Abaisser les plafonds `large-file:ratchet` a chaque extraction.
5. Surveiller le budget frontend total avant les prochains gros dashboards.
