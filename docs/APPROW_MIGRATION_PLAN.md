# Plan de migration AppRow vers Prisma

Objectif: reduire `AppRow` aux donnees historiques non critiques, puis supprimer progressivement la dependance aux tables JSON pour les domaines metier.

Etat mesure:

- tables connues: 60;
- tables avec projection normalisee ou auth normalisee: 35;
- tables suivies comme dette `AppRow`: 44;
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

Etat 2026-05-29:

- fondation Prisma creee pour les 6 agregats Marketplace via `backend/prisma/migrations/202605290145_marketplace_foundation/migration.sql`;
- garde-fou `npm run marketplace:prisma-foundation:check` ajoute au `verify` backend;
- double-run de projection ajoute depuis `PlatformPersistenceService` vers les tables Prisma Marketplace;
- backfill Marketplace branche sur `PlatformSnapshotSyncService` et controle par `npm run marketplace:prisma-consistency:check` apres le seed CI;
- lectures runtime Marketplace basculees vers `MarketplacePrismaReadService` avec fallback AppRow;
- mutations Marketplace maintenues en compatibilite AppRow, mais relues depuis la projection Prisma apres persistence quand elle est disponible.
- les 6 tables Marketplace sont retirees du registre de dette `AppRow` active par `npm run app-row:governance:check`.

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

Etat 2026-05-29:

- fondation Prisma creee pour le catalogue public Learning via `backend/prisma/migrations/202605291345_learning_public_foundation/migration.sql`;
- projection double-run ajoutee pour `courses`, `course_sections`, `course_lessons`, `course_reviews` et `virtual_classes`;
- fondation Prisma progression ajoutee via `backend/prisma/migrations/202605291515_learning_progress_foundation/migration.sql`;
- projection double-run ajoutee pour `course_enrollments` et `lesson_progress`;
- backfill Learning public branche sur `PlatformSnapshotSyncService` et controle par `npm run learning:prisma-consistency:check`;
- lectures publiques runtime Learning basculees vers `LearningPublicReadService` avec fallback AppRow pour les listes cours, cours formateur, detail cours et detail classe virtuelle;
- lectures runtime progression apprenant basculees vers `LearningProgressReadService` avec fallback AppRow;
- ecritures runtime progression encore maintenues sur AppRow avec double-run Prisma;
- fondation Prisma examens/certificats ajoutee via `backend/prisma/migrations/202605291650_learning_assessments_foundation/migration.sql`;
- projection double-run ajoutee pour `exams`, `quiz_questions`, `quiz_choices`, `submissions` et `certificates`;
- lectures runtime examens, quiz, soumissions et certificats basculees vers `LearningAssessmentsReadService` avec fallback AppRow;
- soumissions et corrections d'evaluations relues depuis Prisma apres persistence quand la projection est disponible;
- emissions et suppressions de certificats formateur raccordees au reader Prisma apres persistence/delete;
- mutations examens, questions et choix quiz formateur relues ou verifiees via Prisma apres persistence/delete;
- contrat CI `learning:assessments-mutations:check` ajoute pour bloquer toute regression de readback/assertion Prisma sur ces mutations;
- service de commande `LearningAssessmentsCommandService` introduit pour extraire les ecritures examens, questions et choix quiz de `LearningService`;
- ecritures runtime examens/certificats encore maintenues sur AppRow avec double-run Prisma.

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

Etat 2026-05-29:

- fondation Prisma creee pour `projects` via `backend/prisma/migrations/202605291930_project_center_projects_foundation/migration.sql`;
- fondation Prisma creee pour `project_milestones` et `project_documents` via `backend/prisma/migrations/202605292000_project_center_detail_foundation/migration.sql`;
- fondation Prisma creee pour `project_history` via `backend/prisma/migrations/202605292025_project_center_history_foundation/migration.sql`;
- projection double-run ajoutee pour `projects`, `project_milestones`, `project_documents` et `project_history`;
- backfill Project Center branche sur `PlatformSnapshotSyncService` et controle par `npm run project-center:prisma-consistency:check`;
- autres tables Project Center encore maintenues dans `AppRow` en attendant les lots funding, partnerships et tracking.

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
