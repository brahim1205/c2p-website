# Donnees personnelles et operations RGPD

Ce document decrit les garanties operationnelles minimales pour les donnees personnelles C2P.

## Droits utilisateur couverts

| Droit | Etat | Verification |
| --- | --- | --- |
| Consultation du profil | Disponible via `GET /api/auth/profile/:id` pour soi ou admin. | `npm run security:test` |
| Export des donnees personnelles | Disponible via `GET /api/auth/profile/:id/export` pour soi ou admin. | `npm run security:test` |
| Suppression du compte | Disponible via `DELETE /api/auth/profile/:id` pour le titulaire. | `npm run security:test` |
| Revue sessions securite | Disponible via `GET /api/auth/security/:userId`. | `npm run security:test` |
| Revocation sessions | Disponible via endpoints `/api/auth/security/sessions`. | `npm run security:test` |

## Regles d'export

L'export utilisateur doit inclure:

- profil editable;
- role et statut;
- metadata de sessions sans token;
- logs d'audit utilisateur;
- informations de retention.

L'export ne doit jamais inclure:

- mot de passe;
- hash de mot de passe;
- historique de mots de passe;
- backup codes;
- hash de token;
- token CSRF;
- refresh token.

## Suppression compte

La suppression en self-service retire:

- l'utilisateur;
- les sessions actives;
- les refresh tokens;
- les challenges 2FA/reset en attente;
- les logs d'audit directement rattaches au compte.

Restriction:

- le dernier superadmin actif ne peut pas etre supprime.

## Retention

Politique cible:

- sessions expirees: purge reguliere;
- challenges 2FA/reset expires: purge reguliere;
- logs d'audit securite: retention selon obligations operationnelles;
- donnees finance: conservation selon obligations comptables;
- uploads temporaires: purge via `npm run uploads:tmp:cleanup`.

## Verification release

```bash
cd backend
npm run security:test
npm run uploads:tmp:audit
```

Si un nouveau domaine stocke des donnees personnelles, il doit documenter:

- source des donnees;
- finalite;
- role autorise a lire/ecrire;
- duree de retention;
- comportement en cas de suppression/anonymisation compte.
