# Parite mobile/web C2P

Ce dossier initialise l'application Flutter qui doit consommer les memes endpoints que le frontend web.

## Socle deja pose

- `ApiClient`: meme logique que le web pour `/api`, `X-Requested-With`, `X-Request-Id`, cookies de session et `c2p_csrf`.
- Authentification: connexion, inscription par role, demande de reinitialisation.
- Navigation: pages publiques, inscription, connexion, dashboard.
- Dashboards: structure par role pour client, prestataire, formateur, apprenant, porteur, partenaire, admin, superadmin.

## Modules a brancher ensuite, par chantier

1. Public:
   - accueil;
   - AlloPresta;
   - Espace numerique;
   - Project Center;
   - tarifs/contact/a propos.

2. Auth:
   - verification 2FA;
   - reset password avec code;
   - onboarding clauses/abonnement.

3. Formateur:
   - creation de formation;
   - brouillons;
   - programme;
   - classes virtuelles;
   - replays;
   - evaluations;
   - revenus.

4. Apprenant:
   - catalogue/cours achetes;
   - progression;
   - examens;
   - certificats;
   - historique.

5. Autres roles:
   - client/prestataire;
   - porteur/partenaire;
   - admin/superadmin.

6. Transverse:
   - messagerie;
   - notifications;
   - paiements;
   - uploads R2;
   - securite/parametres.

## Regle de coherence

Chaque ecran mobile doit utiliser le meme endpoint backend que le web. Si un endpoint n'existe pas encore ou si le web utilise une logique locale, creer d'abord le contrat backend avant d'ajouter l'ecran mobile.
