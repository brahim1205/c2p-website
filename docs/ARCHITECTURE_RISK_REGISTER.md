# Registre architecture et risques

Ce document cadre les risques techniques actuels du monorepo C2P et les actions attendues avant d'ajouter de nouveaux flux critiques.

## Etat d'architecture

- Le backend reste un monolithe modulaire NestJS.
- Le frontend React consomme le backend comme source de verite metier.
- `AppRow` reste la facade de transition pour des donnees historiques.
- Prisma porte deja les domaines qui demandent des garanties plus fortes: auth, RBAC, finance, outbox, paiements, audit.
- La production cible Docker Compose avec Nginx, Postgres, Redis et monitoring.

## Risques et controles

| Risque | Impact | Controle attendu |
| --- | --- | --- |
| `DataController` concentre trop de logique metier | Regressions difficiles a localiser, permissions fragiles | Tout nouveau domaine critique doit avoir un service/module dedie ou une justification explicite si `data/:table` est conserve. Les validateurs/normaliseurs communs sont deja sortis dans `data-normalizers.ts`. La CI bloque aussi tout nouvel acces frontend direct a `/data/*` hors `front/src/lib/backendClient.ts`. |
| API legacy `/data` encore necessaire pendant la transition | Surface generique large, migration difficile a piloter | En production, `DATA_LEGACY_API_MODE` doit rester `read-only` ou `disabled`. Utiliser `npm run data:legacy:inventory` pour suivre les tables restantes et prioriser la migration vers des endpoints metier. |
| Nouvelle table exposee via `data/:table` sans policy | Fuite de donnees ou blocage role | Ajouter la table dans `data-access-policy.ts`, verifier `data-row-access.ts`, puis couvrir par un script HTTP si la table est sensible. |
| Flux critique encore stocke uniquement dans `AppRow` | Peu de garanties relationnelles, divergence possible avec Prisma | Pour finance, auth, outbox, paiements, audit et sessions, privilegier Prisma. Ne pas ajouter de nouveau flux financier uniquement dans `AppRow`. |
| Coexistence `AppRow` / Prisma | Deux modeles mentaux et synchronisation a surveiller | Garder la synchronisation explicite, idempotente, et valider avec `npm run prisma:validate` + checks domaine. |
| Etat metier cache dans le navigateur | Divergence entre client et base, certificat/progression non fiables, bugs multi-device | Tout nouvel usage de `localStorage`/`sessionStorage` doit etre declare dans `front/scripts/state-boundary-check.mjs`. L'acceptation des clauses d'abonnement est serveur-side via `/auth/onboarding/monetized-clauses/accept`. La progression des lecons passe par `lesson_progress` et `course_enrollments`. Les questions apprenant de lecon passent par `/learning/apprenant/lessons/:lessonId/comments` et remontent cote formateur. Les usages LMS historiques restants restent autorises temporairement mais sont une dette de migration vers le backend. |
| Smoke local avec hostnames differents | Connexion UI qui semble reussir mais cookies non renvoyes | Utiliser `localhost` partout: `FRONT_URL=http://localhost:3000` et `API_URL=http://localhost:3003/api`. |
| `ts-node/esm` fragile sous Node 22 | Backend dev impossible a lancer | `npm run start:dev` utilise le watcher Nest CLI. L'ancien chemin reste disponible sous `start:dev:loader` pour diagnostic. |
| Base Prisma inaccessible en local | Tests AppRow passent mais la DB normalisee n'est pas prouvee | Pour valider la persistance reelle, lancer Postgres local ou fournir un `DATABASE_URL` accessible avant les checks DB. En production, `PRISMA_CONNECTION_REQUIRED=true` rend la connexion bloquante. |
| Secrets production incomplets | Demarrage prod bloque ou integrations muettes | Executer `npm run production:env:status -- --strict`, puis `npm run production:preflight` avec les env reels avant de deployer. Le deploy script lance aussi ce statut strict automatiquement. |
| Backup non restaurable | Fausse securite operationnelle, perte de donnees en incident | Lancer `npm run production:restore:drill -- --backup-dir backups/postgres` apres le premier backup puis regulierement. Le drill restaure dans un conteneur temporaire, jamais dans la DB prod. |
| Wizard formateur trop dense | UI difficile a maintenir et validations dupliquees | Garder le modele de brouillon, les libelles et validations dans `courseWizardModel.ts`; les futures extractions doivent viser les sous-vues par etape. |

## Checklist avant nouveau domaine metier

1. Identifier si le domaine est critique: paiement, abonnement, messagerie, donnees personnelles, certification, admin ou audit.
2. Si critique, creer un module/service explicite plutot qu'ajouter uniquement des branches dans `DataController`.
3. Ajouter les permissions dans les policies backend avant de brancher le front.
4. Ajouter un check HTTP ou un scenario smoke pour au moins un role autorise et un role interdit.
5. Verifier `npm run verify` cote backend et `npm run type-check && npm run lint && npm run build` cote front.

## Commandes de verification recommandees

Backend, sans serveur HTTP:

```bash
cd backend
npm run db:check
npm run verify
npm run architecture:check
npm run data:legacy:inventory
```

Reset DB locale apres des scenarios smoke destructifs:

```bash
cd backend
C2P_CONFIRM_LOCAL_DB_RESET=reset npm run db:reset:local
```

Backend, avec API locale deja lancee sur `http://localhost:3003/api`:

```bash
cd backend
API_URL=http://localhost:3003/api npm run http:checks
```

Frontend:

```bash
cd front
npm run architecture:check
npm run state:check
npm run type-check
npm run lint
npm run build
```

Smoke local:

```bash
cd backend
PORT=3003 npm run start:dev

cd ../front
npm run dev -- --host 0.0.0.0 --port 3000
npm run smoke:test:client
```
