# Plan de migration AppRow vers Prisma

Objectif: reduire `AppRow` aux donnees historiques non critiques, puis supprimer progressivement la dependance aux tables JSON pour les domaines metier.

Etat mesure:

- tables connues: 60;
- tables avec projection normalisee ou auth normalisee: 13;
- tables suivies comme dette `AppRow`: 50;
- surface de mutation generique restante via `/data`: 0.

## Regles de migration

1. Ne pas creer de nouveau flux critique uniquement dans `AppRow`.
2. Migrer par domaine, pas table par table isolee.
3. Garder les endpoints publics stables pendant la migration.
4. Ajouter d'abord la lecture Prisma en double-run, puis basculer les ecritures.
5. Supprimer la lecture `AppRow` seulement apres smoke et checks HTTP.

## Ordre recommande

### Lot 1 - Marketplace

Tables:

- `providers`
- `provider_services`
- `provider_reviews`
- `client_orders`
- `client_favorites`
- `provider_verification_requests`

Pourquoi en premier:

- impact direct client/prestataire;
- formulaires et dashboards deja couverts par smoke;
- domaine plus petit que learning/project-center.

Critere de sortie:

- endpoints marketplace lisent/ecrivent Prisma;
- `/allopresta` et dashboards client/prestataire passent;
- `npm run data:legacy:inventory` ne classe plus ces tables en dette active.

### Lot 2 - Learning

Tables:

- `courses`
- `course_sections`
- `course_lessons`
- `course_enrollments`
- `lesson_progress`
- `lesson_comments`
- `lesson_assets`
- `exams`
- `quiz_questions`
- `quiz_choices`
- `submissions`
- `certificates`
- `virtual_classes`

Pourquoi ensuite:

- domaine large, mais critique pour progression, certificats et formateurs;
- forte valeur SaaS recurrente.

Critere de sortie:

- progression et certificats persistants cote serveur;
- creation/edition cours formateur testee;
- parcours apprenant cours/examen/certificat couvert.

### Lot 3 - Project Center

Tables:

- `projects`
- `project_documents`
- `project_milestones`
- `project_funding_rounds`
- `project_partnerships`
- `project_collaborations`
- `project_tracking`
- `funding_investors`
- `project_history`

Pourquoi apres learning:

- donnees relationnelles plus riches;
- besoin de verifier porteur/partenaire/admin ensemble.

Critere de sortie:

- soumission projet, suivi partenaire, financement et moderation admin passent en E2E;
- historique projet reconstruit depuis commandes metier ou audit.

### Lot 4 - Messaging et notifications

Tables:

- `conversations`
- `messages`
- `notifications`

Critere de sortie:

- messagerie temps reel ou quasi temps reel conservee;
- notifications generees par outbox ou commandes metier;
- tests role autorise/interdit couverts.

### Lot 5 - Admin configuration

Tables:

- `admin_campaigns`
- `admin_platform_categories`
- `admin_platform_rules`
- `admin_feature_flags`
- `admin_integrations`
- `admin_audit_logs`
- `admin_security_alerts`
- `admin_backups`
- `admin_reports`
- `admin_content_items`
- `admin_accreditations`

Critere de sortie:

- mode maintenance et feature flags en Prisma;
- audit admin non alterable sans trace;
- tests `smoke:test:forms` maintenus.

## Verification par lot

Avant merge:

```bash
cd backend
npm run app-row:governance:check
npm run data:legacy-surface:test
npm run data:access:test
npm run prisma:validate
npm run build
```

Si le front est touche:

```bash
cd front
npm run state:check
npm run type-check
npm run lint
npm run smoke:test
npm run smoke:test:forms
```

## Definition de sortie globale

- `trackedAppRowDebtTables` proche de 0;
- `publicReadDebtTables` proche de 0;
- aucun endpoint public ou dashboard ne depend d'une lecture legacy;
- `DATA_LEGACY_API_MODE=disabled` possible en production sans regression.
