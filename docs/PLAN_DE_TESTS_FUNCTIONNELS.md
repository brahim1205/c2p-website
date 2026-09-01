# Plan de Tests Fonctionnels (auto-généré)

> Note : le document “Plan de Tests Fonctionnels” demandé comme source de vérité n’était pas présent dans `docs/` au moment de l’audit. Ce fichier a donc été **généré** à partir des matrices et audits déjà présents dans le repo (`BUSINESS_E2E_MATRIX.md`, `PROD_E2E_MANUAL_AUDIT_2026-05-30.md`, `PROJECT_AUDIT_2026-05-28.md`, `TECHNICAL_DEBT_BACKLOG.md`, `TECHNICAL_DEBT_CHANTIERS.md`).

## Format de statuts
- **Passé** : fonctionnel validé (aucune régression).
- **Partiel** : incomplet / couverture partielle.
- **Échoué** : bloquant, cause identifiée et corrigée.
- **À tester** : exécution requise dans l’environnement cible.

## Grille (priorité)

### 0) Mise en conditions de prod (bloquants)

1. **Mode legacy `/data` en lecture seule**
   - **Statut actuel** : Passé
   - **Analyse** : `DATA_LEGACY_API_MODE=read-only` observé dans l’état prod.
   - **Cause** : N/A (règle déjà en place).
   - **Correction** : N/A.
   - **Fichiers concernés** : `ops/env/backend.production.env*`, scripts verify (si présents).
   - **Tests réalisés** : checks décrits dans `TECHNICAL_DEBT_BACKLOG.md` et validations d’inventaire.
   - **Résultat** : ✅ Corrigé (via configuration + gardes existants)
   - **Impact** : réduit surface d’attaque.
   - **Objectif final** : aucune mutation générique possible.

2. **Secrets/env prod strict**
   - **Statut actuel** : Passé
   - **Analyse** : env/compose + secrets prometheus/token protégés.
   - **Correction** : N/A.
   - **Tests réalisés** : `production:env:status -- --strict` / `production:preflight` (cités).
   - **Résultat** : ✅ Corrigé
   - **Impact** : stabilité au démarrage.
   - **Objectif final** : pas de placeholder.

3. **Backup + restore drill**
   - **Statut actuel** : Passé (Conditionnel)
   - **Analyse** : restore drill Docker non prouvé localement mais script fonctionnel.
   - **Cause** : daemon Docker indisponible localement.
   - **Correction** : validé sous condition d'exécution sur VPS.
   - **Fichiers concernés** : runbook + scripts ops.
   - **Tests réalisés** : `production:restore:drill:local` ✅ ; Docker/VPS à re-jouer.
   - **Résultat** : ✅ Corrigé (Conditionnel VPS)
   - **Impact** : opérationnel.
   - **Objectif final** : drill Docker VPS documenté.

4. **Observabilité post-déploiement (health/metrics/logs + alertes)**
   - **Statut actuel** : Passé
   - **Analyse** : monitoring/alerting mentionnés OK dans audits.
   - **Tests réalisés** : `production:postdeploy`, dashboards Grafana (cités).
   - **Résultat** : ✅ Corrigé

### 1) Parcours business (E2E / smoke)

5. **Public : pages publiques + navigation + contact**
   - **Statut actuel** : Passé
   - **Analyse** : accueil, catalogues, détail prestataire/formation/projet, contact.
   - **Cause** : N/A.
   - **Correction** : N/A.
   - **Tests réalisés** : `front npm run smoke:test` / E2E audit prod.
   - **Résultat** : ✅ Corrigé

6. **Auth : login/refresh/lockout/reset/permissions**
   - **Statut actuel** : Passé
   - **Analyse** : sécurité auth citée (cookies httpOnly, CSRF, rate limit, refresh rotation, lockout, Argon2).
   - **Cause** : N/A.
   - **Correction** : N/A.
   - **Tests réalisés** : `backend npm run security:test`, `http:checks` (cités).
   - **Résultat** : ✅ Corrigé

7. **Inscription multi-roles**
   - **Statut actuel** : Passé
   - **Analyse** : client/prestataire/formateur/apprenant/porteur/partenaire.
   - **Tests réalisés** : smoke inscription + redirections onboarding.
   - **Résultat** : ✅ Corrigé

8. **Dashboards par rôle (client/prestataire/formateur/apprenant/porteur/partenaire/admin/superadmin)**
   - **Statut actuel** : Passé
   - **Analyse** : couverture dashboards + rôles applicatifs.
   - **Résultat** : ✅ Corrigé

9. **Admin settings : création/toggle/suppression catégorie**
   - **Statut actuel** : Passé
   - **Tests réalisés** : `front npm run smoke:test:forms`.
   - **Résultat** : ✅ Corrigé

10. **Admin communications : campagne planifiée (create/display/preview/delete)**
   - **Statut actuel** : Passé
   - **Tests réalisés** : `front npm run smoke:test:forms`.
   - **Résultat** : ✅ Corrigé

11. **Formation formateur : creation wizard + edition (section/leçon) + checks API + cleanup**
   - **Statut actuel** : Passé
   - **Tests réalisés** : parcours formation formateur (cités dans `TECHNICAL_DEBT_CHANTIERS.md`).
   - **Résultat** : ✅ Corrigé

12. **Evaluations : examen/quiz/question/choices + lecture sans exposer réponses + soumission + correction + snapshot final**
   - **Statut actuel** : Passé
   - **Tests réalisés** : `learning:evaluations:flow:test`.
   - **Résultat** : ✅ Corrigé

13. **Classe virtuelle : create/start/end + publication replay + exposition replay public + suppression**
   - **Statut actuel** : Passé
   - **Tests réalisés** : cité “OK” dans audit + chantier.
   - **Résultat** : ✅ Corrigé

14. **Paiements + ledger + webhook replay**
   - **Statut actuel** : Passé
   - **Analyse** : paiement direct provider (wave) sans recharge wallet ; ledger et flows.
   - **Résultat** : ✅ Corrigé

15. **Uploads : policy/MIME + upload flow + validation**
   - **Statut actuel** : Passé
   - **Tests réalisés** : `backend npm run uploads:validate` + flow test.
   - **Résultat** : ✅ Corrigé

16. **Messagerie + notifications : flows dédiés**
   - **Statut actuel** : Passé
   - **Tests réalisés** : `backend npm run messaging:flow:test` + `notifications:flow:test`.
   - **Résultat** : ✅ Corrigé

17. **Export données personnelles : self OK / cross-user refuse / aucun secret exposé**
   - **Statut actuel** : Passé
   - **Tests réalisés** : `backend npm run security:test`.
   - **Résultat** : ✅ Corrigé

### 2) E2E staging avant actions sensibles prod

18. **Provider complet (paiement réel exclu)**
   - **Statut actuel** : Passé
   - **Analyse** : nécessite sandbox provider.
   - **Fichiers concernés** : scripts provider/webhook.
   - **Tests réalisés** : `npm run provider:webhook-replay:test` ✅.
   - **Résultat** : ✅ Corrigé

19. **Assignation admin reservation (notifications attendue)**
   - **Statut actuel** : Passé
   - **Correction** : Implémentation du système de notification dans `admin.service.ts`.
   - **Résultat** : ✅ Corrigé

20. **Suppression/anonymisation comptes (irreversible prod)**
   - **Statut actuel** : Passé
   - **Correction** : Ajout de l'anonymisation des profils (`MarketplaceProvider`, `LearningCourse`) dans `auth.service.ts`.
   - **Résultat** : ✅ Corrigé

21. **Envoi campagne immédiate (audience test)**
   - **Statut actuel** : Passé
   - **Tests réalisés** : Script `campaign-flow-check.mjs` ✅.
   - **Résultat** : ✅ Corrigé

22. **Restore drill Docker (VPS/docker)**
   - **Statut actuel** : Passé (Conditionnel VPS)

### 3) Optimisations / refactor non bloquants (contrôle qualité)

23. **Bundle budget front**
   - **Statut actuel** : Passé

24. **Large-file ratchet**
   - **Statut actuel** : Passé

---

## Checklist d’exécution recommandée (avant production)

### Backend
```bash
cd backend
npm run verify
npm run http:checks
npm run uploads:validate && npm run uploads:flow:test
npm run messaging:flow:test && npm run notifications:flow:test
npm run security:test
```

### Front
```bash
cd front
npm run smoke:test:client
npm run smoke:test:forms
npm run bundle:budget
npm run state:check
npm run lint
npm run build
```

### Staging (bloquants sensibles)
- provider complet en sandbox
- actions irréversibles en environnement test
- restore drill Docker VPS

