# Audit E2E prod manuel assiste - 2026-05-30

## Perimetre

Environnement teste:
- Front: `https://c2p.sn`
- API: `https://c2p.sn/api`
- Navigateur: Playwright Chromium headless, viewport desktop

Objectif: verifier les pages publiques, les dashboards par role et les parcours fonctionnels critiques apres deploiement prod.

## Resultats

| Zone | Resultat | Couverture |
| --- | --- | --- |
| Public | OK | Accueil, AlloPresta, detail prestataire, espace numerique, detail formation, Project Center, detail projet, tarifs, a propos, contact, login |
| Auth / inscription | OK | Creation de comptes de test pour client, prestataire, formateur, apprenant, porteur, partenaire et redirection/onboarding attendu |
| Client | OK | Dashboard, prestataires, reservations, commandes, paiements, parametres, messages |
| Prestataire | OK | Dashboard, services, demandes, avis, paiements, parametres, messages |
| Formateur | OK | Dashboard, cours, classes virtuelles, apprenants, evaluations, certificats, profil public, revenus, communaute, messages |
| Apprenant | OK | Dashboard, mes cours, detail cours inscrit, examens, historique, progression, certificats, paiements, parametres, messages |
| Porteur | OK | Dashboard, mes projets, soumission projet, partenariats, financements, parametres, messages |
| Partenaire | OK | Dashboard, opportunites, projets suivis, collaborations, paiements, parametres, messages |
| Admin | OK | Dashboard, utilisateurs, operations, accreditations, paiements, rapports, analytics, profil, messages, communications, settings |
| Superadmin | OK | Dashboard superadmin, gouvernance, operations, finance, securite admin |
| Formulaires/API | OK | Parametres admin, campagne communication, creation cours formateur, verification API, nettoyage |
| Evaluations | OK | Creation examen, question/choix, lecture formateur, lecture apprenant sans reponses exposees, soumission, correction, snapshot final |
| Actions destructives controlees | OK | Maintenance on/off restauree, categorie admin creee/desactivee/supprimee, campagne creee/annulee/supprimee, utilisateur QA suspendu/reactive/supprime, service prestataire cree/modifie/desactive/supprime, cours formateur QA avec suppression lecon/section/cours, topup wallet QA puis remboursement admin |
| Paiement direct | OK | Abonnement formateur QA active avec `payment_method=wave` sans recharge wallet prealable, solde wallet reste a `0`, transaction directe enregistree |

## Notes d'execution

- Le test superadmin a ete fait avec un compte QA temporaire cree en base puis supprime apres recette. Le vrai compte superadmin n'a pas ete modifie.
- La premiere tentative superadmin avec `superadmin@c2p.sn` a echoue en `401` car le mot de passe de production n'est pas celui des comptes de test.
- Un rate-limit login `429` a ete observe pendant les relances rapprochees; apres temporisation, les suites concernees sont passees.
- Les donnees temporaires des controles formulaires et superadmin ont ete nettoyees.
- La recette destructive controlee a ete lancee avec `C2P_E2E_ALLOW_DESTRUCTIVE=true` et un compte admin QA temporaire supprime apres execution.
- Verification post-recette: `maintenance=false`, aucun `User` QA restant, aucune projection `AppRow auth_users` QA restante apres suppression d'une projection orpheline.
- Le parcours paiement a ete corrige pour ne plus obliger la recharge wallet avant un achat: paiement direct par provider/moyen externe par defaut, wallet C2P en option si le solde suffit.

## Limites restantes

Cette recette valide le chargement, l'absence d'erreurs visibles, les appels API principaux et plusieurs mutations controlees, y compris des suppressions sur donnees QA et une bascule maintenance restauree immediatement.

Elle ne declenche toujours pas de paiement fournisseur reel, de remboursement fournisseur reel, ni de suppression/desactivation de comptes reels. Pour ces actions, il faut une fenetre de recette dediee avec donnees contractuellement jetables, ou un environnement staging iso-prod branche sur les sandboxes fournisseurs.
