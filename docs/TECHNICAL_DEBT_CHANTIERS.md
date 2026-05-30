# Suivi des chantiers dette technique

Ce fichier suit l'execution des dettes par chantier. Un chantier est ferme seulement si son critere de sortie est verifie par commande.

## Chantier 1 - Fermer les ecritures legacy `/data`

Statut: ferme.

Objectif:

- empecher toute mutation generique via `/data/:table`;
- rendre impossible un demarrage production avec `DATA_LEGACY_API_MODE=compat`;
- bloquer les regressions dans `backend npm run verify`.

Actions realisees:

- toutes les tables connues sont declarees `COMMAND_ONLY_WRITE_TABLES`;
- `DATA_LEGACY_API_MODE=compat` est rejete en production;
- `data:legacy-surface:test` echoue si une table connue redevient mutable via `/data`;
- le check strict est integre a `backend npm run verify`.

Verification:

```bash
cd backend
npm run data:legacy-surface:test
npm run data:legacy-mode:test
npm run verify
```

Resultat mesure:

- tables connues: 60;
- tables command-only write: 60;
- surface mutation generique restante: 0.

## Chantier 2 - Supprimer l'adaptateur legacy frontend

Statut: ferme.

Objectif:

- retirer le client frontend historique compatible Supabase-like;
- interdire tout appel direct `/data` depuis `front/src`;
- forcer les pages a passer par des API metier dediees.

Actions realisees:

- suppression de `front/src/lib/backendClient.ts`;
- suppression de l'exception `legacy-data-adapter` dans `front/scripts/state-boundary-check.mjs`;
- mise a jour du message d'erreur pour orienter vers les API metier.

Verification:

```bash
cd front
npm run state:check
npm run type-check
npm run lint
```

Resultat mesure:

- acces direct `/data` autorises: 0;
- violations directes `/data`: 0.

## Chantier 3 - Stabiliser `AppRow` et les projections Prisma

Statut: en cours.

Objectif:

- garder `AppRow` comme stockage historique uniquement;
- confirmer que les domaines critiques restent portes par Prisma;
- ajouter des checks de divergence quand une projection normalisee existe.

Actions recommandees:

- inventorier les tables encore uniquement stockees en JSON;
- garder `npm run app-row:governance:check` dans `backend npm run verify`;
- prioriser learning et project-center apres fermeture de la dette active Marketplace;
- ajouter un check de projection par domaine avant suppression progressive d'`AppRow`.

Actions realisees:

- Lot Marketplace normalise dans Prisma pour `providers`, `provider_services`, `provider_reviews`, `client_orders`, `client_favorites` et `provider_verification_requests`;
- lectures Marketplace basculees vers `MarketplacePrismaReadService` avec fallback AppRow;
- mutations Marketplace relues depuis la projection Prisma apres persistence quand elle est disponible;
- check de coherence AppRow/Prisma Marketplace branche dans la CI;
- tables Marketplace retirees du registre de dette `AppRow` active.
- fondation Learning public ajoutee pour `courses`, `course_sections`, `course_lessons`, `course_reviews` et `virtual_classes`.
- lectures publiques Learning basculees vers Prisma avec fallback AppRow et garde-fou dans `learning:prisma-foundation:check`.
- fondation Learning progression ajoutee pour `course_enrollments` et `lesson_progress` avec double-run Prisma et check de coherence.
- lectures progression apprenant basculees vers Prisma via `LearningProgressReadService`, avec fallback AppRow conserve.
- fondation Learning examens/certificats ajoutee pour `exams`, `quiz_questions`, `quiz_choices`, `submissions` et `certificates` avec double-run Prisma.
- lectures examens, quiz, soumissions et certificats Learning basculees vers Prisma via `LearningAssessmentsReadService`, avec fallback AppRow conserve.
- mutations soumission/correction Learning relues depuis la projection Prisma apres persistence quand elle est disponible.
- mutations certificats formateur relues/verifiees via la projection Prisma apres persistence/delete.
- mutations examens, questions et choix quiz formateur relues/verifiees via la projection Prisma apres persistence/delete.
- garde-fou CI `learning:assessments-mutations:check` ajoute pour verrouiller les contrats de readback/assertion Prisma.
- extraction de `LearningAssessmentsCommandService` etendue aux commandes examens, questions et choix quiz hors du gros `LearningService`.
- fondation Project Center ajoutee pour `projects`, `project_milestones`, `project_documents`, `project_history`, `project_funding_rounds`, `funding_investors`, `project_partnerships`, `project_tracking` et `project_collaborations` avec projection double-run Prisma et check de coherence dedie.

Verification cible:

```bash
cd backend
npm run app-row:governance:check
npm run db:check
npm run prisma:validate
npm run finance:validate
```

Critere de sortie:

- aucun nouveau flux critique uniquement dans `AppRow`;
- projections normalisees testees pour les domaines critiques;
- strategie de migration documentee pour les donnees historiques restantes.

Statut mesure:

- 60 tables connues par la policy data;
- 40 tables avec projection normalisee ou auth normalisee;
- 44 tables suivies explicitement comme dette `AppRow`;
- 0 table non classee.

## Chantier 4 - Decouper les gros services backend

Statut: en cours.

Objectif:

- reduire les services difficiles a reviewer;
- isoler les responsabilites sans changer les contrats API.

Actions realisees:

- ajout de `large-file:ratchet` dans les verifies backend et front;
- blocage de tout nouveau fichier backend au-dessus de 700 lignes sans classification;
- blocage de tout nouveau fichier frontend au-dessus de 300 lignes sans classification;
- plafonds fixes pour les gros fichiers existants, a abaisser apres chaque extraction.
- extraction de la suppression projet proprietaire dans `owner-project-commands.service.ts` pour garder `project-center.service.ts` sous son plafond.
- `learning.service.ts` retire du registre des gros fichiers suivis apres extraction des commandes examens/quiz (`589` lignes, sous la limite backend par defaut).
- extraction du fallback public AppRow Learning dans `learning-public-fallback.service.ts`, en gardant les routes publiques et le fallback Prisma/AppRow inchanges.
- extraction des helpers de mapping/formatage Learning dans `learning-access-formatters.ts`, pour sortir la logique pure du service Nest principal.
- extraction des helpers de policy/progression/commentaires Learning dans `learning-access-helpers.ts`; `learning-access.service.ts` devient un orchestrateur sous le seuil backend par defaut.
- extraction des routes publiques et parent Learning dans `learning-public.controller.ts` et `learning-parent.controller.ts`; `learning.controller.ts` ne porte plus seul toute la surface HTTP Learning.
- extraction des filtres, guards, builders de detail et helpers ProjectCenter dans `project-center.helpers.ts`; `project-center.service.ts` devient un orchestrateur sous le seuil backend par defaut.
- extraction des helpers de commandes paiement dans `payment-command-helpers.ts` pour sortir les acces AppRow, guards de role, ids idempotents et normaliseurs du service Nest principal.
- extraction des lectures admin DexPay dans `provider-integration-read.service.ts`; `provider-integration.service.ts` se concentre davantage sur les synchronisations, webhooks, reconciliation et actions operateur.
- extraction de la synchronisation Prisma `PaymentIntent`/`ProviderTransaction`/`SettlementRecord` dans `provider-artifacts.service.ts`, plus extraction du builder transaction checkout DexPay dans `provider-integration.helpers.ts`.
- extraction de l'upload replay classe virtuelle dans `useVirtualClassReplayUpload.ts` pour remettre `useVirtualClassesPageSession.ts` sous le plafond frontend.

Priorite:

1. `backend/src/auth/auth.service.ts`
2. `backend/src/database/wallet.service.ts`
3. `backend/src/payments/provider-integration.service.ts`
4. `backend/src/learning/learning-access.service.ts`

Verification cible:

```bash
cd backend
npm run large-file:ratchet
npm run build
npm run verify
```

Critere de sortie:

- les services critiques orchestrent des sous-services plus petits;
- les contrats publics restent stables;
- les checks domaine passent.

Statut mesure:

- 11 gros fichiers backend suivis avec plafond de ratchet;
- aucun nouveau fichier backend au-dessus de 700 lignes sans classification;
- aucun nouveau fichier frontend au-dessus de 300 lignes sans classification.
- `project-center.service.ts`: 609 lignes apres extraction des helpers ProjectCenter.
- `payment-commands.service.ts`: 695 lignes apres extraction des helpers de commandes paiement.
- `provider-integration.service.ts`: 692 lignes apres extraction des lectures admin DexPay et des artefacts provider Prisma.
- `learning.controller.ts`: 700 lignes apres extraction des routes publiques et parent.
- `learning-access.service.ts`: 586 lignes apres extraction du fallback public, des helpers de formatage et des helpers d'acces.
- `useVirtualClassesPageSession.ts`: 278 lignes apres extraction de l'upload replay.

## Chantier 5 - Etendre les tests de parcours metier

Statut: en cours.

Objectif:

- couvrir les parcours qui font perdre de l'argent ou des donnees si casses.

Actions realisees:

- ajout de `front/scripts/form-coherence.mjs`;
- ajout de `npm run smoke:test:forms`;
- integration du test coherence formulaire-affichage dans la CI;
- extension du smoke admin a `/admin/settings`.

Parcours deja couverts:

- dashboards publics et roles applicatifs via `front/scripts/smoke.mjs`;
- categorie admin: creation, affichage, toggle actif/inactif, suppression;
- campagne admin planifiee: creation, affichage, date, apercu du contenu, suppression.
- formation formateur: creation wizard, affichage programme, edition section/lecon, coherence API, nettoyage.
- evaluations formateur: creation examen, configuration quiz, lecture sans reponse cote apprenant, soumission apprenant, correction formateur, snapshot final et nettoyage via `learning:evaluations:flow:test`.
- classe virtuelle formateur: creation, demarrage, terminaison, publication replay, exposition replay public, suppression.

Parcours cibles:

- inscription + login + refresh;
- booking client/prestataire;
- paiement et webhook provider;
- messagerie;
- progression apprenant et certificat;
- moderation admin.

Verification cible:

```bash
cd backend
API_URL=http://localhost:3003/api npm run http:checks

cd ../front
npm run smoke:test:client
npm run smoke:test:forms
```

Critere de sortie:

- un parcours critique casse bloque la release;
- chaque test couvre au moins un role autorise et un role interdit quand c'est pertinent.
- les formulaires critiques qui creent une donnee verifient aussi son affichage et son nettoyage.

Statut mesure:

- `API_URL=http://localhost:3003/api npm run http:checks`: OK.
- `front npm run smoke:test:client`: OK.
- `front npm run smoke:test:forms`: integre CI, a executer sur la cible de release.

## Chantier 6 - Runbook production et exercices

Statut: partiellement ferme.

Objectif:

- rendre les operations reproductibles sans improvisation.

Actions recommandees:

- maintenir `docs/PRODUCTION_RUNBOOK.md`;
- documenter rollback, backup restore, incident provider, mode maintenance;
- lancer un restore drill apres le premier backup reel;
- documenter la date du dernier drill.

Verification cible:

```bash
cd backend
npm run production:env:status -- --strict
npm run production:preflight
npm run production:backup:check
npm run production:restore:drill
```

Critere de sortie:

- preflight reel OK;
- backup restaurable;
- procedure d'incident testee.

Statut mesure:

- runbook production cree;
- commandes de preflight, postdeploy, backup, restore drill, rollback et incidents documentees;
- backup PostgreSQL local genere et controle;
- restore drill local via `psql` OK;
- restore drill Docker a executer sur environnement production reel, daemon Docker indisponible localement.
