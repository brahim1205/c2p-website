# Standard SaaS C2P

Ce document transforme les attentes "SaaS production" en controles concrets. Une release est acceptable seulement si les controles obligatoires passent ou si une exception est documentee avec un proprietaire et une date de reprise.

## Niveau actuel

Statut: conforme avec reserves.

Le socle production est solide: auth securisee, RBAC, CI, monitoring, backups, Docker, finance ledger, outbox, preflight prod et tests HTTP. Les reserves restantes concernent surtout la migration progressive `AppRow`, les drills de restauration production et la profondeur des parcours E2E.

## Controles obligatoires

| Domaine | Standard attendu | Verification |
| --- | --- | --- |
| Authentification | Cookies httpOnly, CSRF sur mutations, rotation refresh, lockout, hash fort, 2FA superadmin si activee. | `cd backend && npm run security:test` |
| Autorisations | Tout flux sensible a un role autorise et un role interdit testes. | `cd backend && npm run data:access:test` |
| Donnees critiques | Pas de nouveau flux critique uniquement dans `AppRow`; endpoint metier dedie avec validation. | `cd backend && npm run app-row:governance:check && npm run data:legacy-surface:test` |
| Paiements | Ledger append-only, webhook idempotent, reconciliation et provider controles. | `cd backend && npm run finance:validate && npm run provider:webhook-replay:test` |
| Uploads | Type MIME controle, stockage S3/R2 en prod, metadata auditable. | `cd backend && npm run uploads:validate && npm run uploads:storage:check` |
| Observabilite | Health, metrics protegees, logs avec request id, postdeploy check. | `cd backend && npm run production:postdeploy` |
| Backup/restore | Backup cree et restauration testee dans une base temporaire. | `cd backend && npm run production:backup:check && npm run production:restore:drill -- --backup-dir backups/postgres` |
| Frontend | Pas d'acces direct `/data`, type-check, lint, build, budget bundle. | `cd front && npm run verify` |
| Parcours UI | Dashboards charges, formulaires critiques coherents avec l'affichage. | `cd front && npm run smoke:test && npm run smoke:test:forms` |
| Secrets | Aucun vrai secret versionne, env prod strict sans placeholder. | CI `Secret hygiene` + `cd backend && npm run production:env:status -- --strict` |

## Definition de done pour un flux critique

- API metier dediee, pas de mutation generique `/data`.
- DTO ou validation explicite cote backend.
- Permission role par role.
- Audit/outbox si l'action impacte finance, notification, admin ou donnees sensibles.
- Test autorise/interdit cote backend.
- Test UI si le flux a un formulaire ou un dashboard.
- Documentation d'exploitation si le flux peut generer un incident.

## Exceptions connues

| Exception | Risque | Plan |
| --- | --- | --- |
| Dette `AppRow` restante | Donnees metier encore partiellement JSON, modele mental double. | Migrer domaine par domaine vers Prisma, en commencant par marketplace, learning, project-center. |
| Restore drill Docker a journaliser regulierement | Backup non prouve en conditions VPS si non execute apres chaque changement infra. | Executer le drill apres le premier backup reel, puis mensuellement. |
| Parcours E2E destructifs non lances en prod | Risque de regression sur paiement, suppression, assignation, envoi reel. | Les couvrir sur staging ou avec donnees jetables explicites. |
| Conformite data a formaliser | Retention/export/suppression utilisateur pas encore gouvernes dans un document produit. | Ajouter une politique RGPD et les endpoints associes si absents. |

## Commande release minimale

```bash
cd backend
npm run verify
API_URL=http://localhost:3003/api npm run http:checks

cd ../front
npm run verify
npm run smoke:test
npm run smoke:test:forms
```

En production, avant deploy:

```bash
cd backend
npm run production:env:status -- --strict
npm run production:preflight
npm run production:external:check
npm run production:backup:check
```
