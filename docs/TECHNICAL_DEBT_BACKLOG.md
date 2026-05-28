# Backlog dette technique et ameliorations

Ce document regroupe les dettes a traiter avant d'accelerer sur de nouveaux flux critiques. Il complete le registre de risques architecture et sert de plan d'execution. Le suivi d'execution par chantier est maintenu dans `docs/TECHNICAL_DEBT_CHANTIERS.md`.

## Etat actuel

- Backend: monolithe modulaire NestJS avec Prisma/PostgreSQL, Redis, outbox, monitoring et modules metier.
- Frontend: React/Vite avec dashboards multi-roles et API metier dediees.
- Production: Docker Compose, Nginx, Postgres, Redis, Prometheus, Alertmanager, Grafana, Loki/Promtail, backups.
- Dette principale restante: coexistence `AppRow` / Prisma. L'ecriture generique `/data/:table` est bloquee et l'ancien adaptateur frontend a ete supprime.

## Priorites

### P0 - Bloquants production

| Sujet | Probleme | Action | Critere de sortie | Verification |
| --- | --- | --- | --- | --- |
| Mode legacy `/data` | Toute table exposee en ecriture generique contourne les endpoints metier. | Garder `DATA_LEGACY_API_MODE=read-only` en production, puis passer a `disabled` quand les lectures restantes ont des endpoints dedies. | Aucune mutation generique possible, meme si le mode compat est active en local. | `npm run data:legacy:inventory`, `npm run data:legacy-surface:test`, `npm run data:legacy-mode:test`, checks HTTP. |
| Secrets et env prod | Une prod incomplete peut demarrer avec integrations muettes ou dangereuses. | Valider les vrais fichiers env avec le statut strict et le preflight. | Aucun placeholder, cookies/proxy/Prisma obligatoires OK. | `npm run production:env:status -- --strict`, `npm run production:preflight`. |
| Base de donnees reelle | Les tests AppRow ne prouvent pas toujours les projections Prisma. | Verifier migrations, projections, ledger, uploads et outbox contre Postgres. | Prisma devient la source forte des domaines critiques. | `npm run db:check`, `npm run prisma:validate`, `npm run finance:validate`. |
| Backups | Un backup non restaure est une fausse securite. | Programmer backup + drill de restauration regulier. | Dernier drill OK et date documentee. | `npm run production:backup:check`, `npm run production:restore:drill:local`, `npm run production:restore:drill`. |
| Observabilite | Sans alertes testees, les incidents prod seront detectes tard. | Tester endpoints health/metrics/logs et alertes legacy. | Prometheus/Grafana/Loki operationnels apres deploiement. | `npm run production:postdeploy`, dashboards Grafana. |

### P1 - Migration architecture metier

| Sujet | Probleme | Action | Critere de sortie | Verification |
| --- | --- | --- | --- | --- |
| `/data` marketplace | `bookings`, `client_orders`, `client_favorites` gardent une surface generique. | Exposer des endpoints `marketplace/*` dedies avec DTO, permissions et tests role. | Tables marketplace retirees des mutations legacy. | `npm run data:legacy:inventory`, `npm run data:access:test`. |
| `/data` learning | Cours, progression, examens, certificats et commentaires restent partiellement generiques. | Migrer vers `learning/*` par cas d'usage: publication, inscription, progression, examen, certificat. | Plus aucune mutation learning via `/data`. | Tests apprenant/formateur + `state:check`. |
| `/data` project-center | Projets, documents, jalons, financements et collaborations restent generiques. | Ajouter commandes dediees `project-center/*` avec controles par role. | Plus aucune mutation project-center via `/data`. | Checks porteur/partenaire/admin. |
| Donnees publiques | Les lectures publiques doivent rester sur des endpoints metier dedies. | Garder les pages publiques sur `/public`, `/marketplace`, `/learning` et `/project-center`. | Aucun adaptateur frontend legacy `/data` dans `front/src`. | `front npm run state:check`, smoke public. |
| `AppRow` | Deux modeles mentaux: JSON generique et tables Prisma normalisees. | Normaliser progressivement les domaines critiques dans Prisma. | `AppRow` limite aux donnees historiques non critiques ou supprime. | Migration + tests de non-regression. |
| Gouvernance `AppRow` | Une nouvelle table peut etre ajoutee sans decision Prisma vs dette suivie. | Maintenir `app-row:governance:check` dans `backend npm run verify`. | Toute table data est classee en projection normalisee ou dette suivie. | `backend npm run app-row:governance:check`. |

### P2 - Maintenabilite

| Sujet | Probleme | Action | Critere de sortie | Verification |
| --- | --- | --- | --- | --- |
| Gros services backend | Plusieurs services depassent 700 lignes, donc difficiles a reviewer. | Extraire par responsabilite, sans changer les contrats publics. | Aucun service critique au-dessus de 700 lignes hors donnees seed. | `npm run architecture:check`. |
| Ratchet gros fichiers | Les gros fichiers peuvent continuer a grossir pendant les ajouts. | Maintenir `large-file:ratchet` et abaisser les plafonds apres chaque extraction. | Aucun nouveau gros fichier non classe, aucun fichier suivi ne grossit au-dela de son plafond. | `npm run large-file:ratchet`. |
| `auth.service.ts` | Auth, sessions, 2FA, reset, audit et profil sont concentres. | Extraire `SessionService`, `TwoFactorService`, `PasswordResetService`, `AuthProfileService`. | AuthService orchestre au lieu de porter toute la logique. | Tests auth + build. |
| `wallet.service.ts` | Solde, mouvements, hold, payout et validations sont concentres. | Extraire lecture, state transitions et operations transactionnelles. | Transitions testables isolement. | `npm run finance:validate`. |
| `provider-integration.service.ts` | Provider paiement et parsing webhook concentrent trop de chemins. | Isoler clients provider, signature, mapping et reconciliation. | Ajout d'un provider sans modifier le coeur finance. | `npm run provider:webhook-replay:test`. |
| `project-center.service.ts` | Service encore proche du plafond ratchet. | Continuer l'extraction de commandes dediees, comme `owner-project-commands.service.ts`. | Service sous 700 lignes et commandes isolees. | `npm run large-file:ratchet && npm run build`. |
| Front dashboards | Plusieurs pages proches de 300 lignes accumulent session, UI et mutations. | Continuer le pattern `use*Session`, panels et modeles types. | Pages conteneurs plus fines, logique testable. | `front npm run type-check && npm run lint`. |

### P3 - Qualite produit et exploitation

| Sujet | Probleme | Action | Critere de sortie | Verification |
| --- | --- | --- | --- | --- |
| Smoke end-to-end | Les checks HTTP existent mais doivent couvrir les parcours les plus rentables. | Ajouter scenarios: inscription, paiement, messagerie, cours, projet, admin moderation. | Un echec de parcours critique bloque la release. | `npm run http:checks`, `front npm run smoke:test`. |
| Accessibilite frontend | Dashboards riches, risque de regressions clavier/lecteurs. | Ajouter checks cibles sur formulaires, modales, navigation dashboard. | Workflows principaux utilisables au clavier. | Tests Playwright/a11y manuels ou automatises. |
| Performance front | Bundle et pages dashboard peuvent grossir. | Suivre budget bundle et lazy-load des surfaces admin/dashboard lourdes. | Budget stable par release. | `front npm run bundle:budget`. |
| Documentation runbook | L'exploitation existe mais doit etre lisible en incident. | Maintenir `docs/PRODUCTION_RUNBOOK.md` et journaliser les exercices. | Un operateur peut restaurer/rollback sans dev senior. | Simulation incident trimestrielle. |
| Gouvernance donnees | Donnees personnelles et finance demandent tracabilite stricte. | Revoir retention, exports, suppression, audit admin. | Politique documentee + endpoints controles. | Audit manuel + tests permissions. |

## Ordre d'execution recommande

1. Verrouiller la prod: env strict, `DATA_LEGACY_API_MODE=read-only`, preflight, backup drill.
2. Migrer les mutations legacy par domaine: marketplace, learning, project-center.
3. Garder les lectures publiques sur endpoints publics dedies et interdire tout retour de l'adaptateur legacy.
4. Reduire `AppRow` aux donnees historiques, puis planifier sa suppression.
5. Decouper les gros services en gardant les contrats API stables.
6. Etendre les smoke tests aux parcours business critiques.

## Regle pour les nouveaux developpements

Tout nouveau flux critique doit respecter ces conditions avant merge:

- endpoint metier dedie, pas une nouvelle branche dans `/data`;
- DTO/validation explicite;
- permission role par role;
- audit/outbox si l'action a un impact finance, notification ou admin;
- test HTTP role autorise et role interdit;
- verification `backend npm run verify` et `front npm run verify` si le front est touche.

## Commandes de suivi

```bash
cd backend
npm run architecture:check
npm run app-row:governance:check
npm run data:legacy:inventory
npm run data:legacy-mode:test
npm run verify
API_URL=http://localhost:3003/api npm run http:checks
```

```bash
cd front
npm run state:check
npm run type-check
npm run lint
npm run build
npm run smoke:test:client
```

## Statut initial mesure

- Audits npm production backend/frontend: aucune vulnerabilite remontee.
- Backend build TypeScript: OK.
- Frontend type-check/lint/state-check: OK.
- Architecture check: OK.
- Inventaire legacy: 60 tables connues, 60 ecritures command-only, 0 table sensible encore mutable via `/data`, 0 table encore mutable si `DATA_LEGACY_API_MODE=compat`.
- Checks HTTP backend: OK.
- Smoke frontend client: OK.
- Backup local et restore drill local: OK.
- Restore drill Docker: a rejouer sur VPS/Docker, daemon indisponible localement.
