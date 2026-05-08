# Architecture backend

Le backend reste un **monolithe modulaire**.

## Principe

- un seul processus backend
- une seule base principale
- des modules métier explicites
- pas de microservices prématurés
- des dépendances orientées vers le centre

## Modules actifs

- `auth`
- `data`
- `communications`
- `payments`
- `uploads`
- `public`
- `monitoring`
- `config`
- `database`
- `cache`
- `modules/user`

## Règle de structure

Chaque module doit tendre vers cette séparation :

1. `controller` / adaptateur HTTP
2. `service` / cas d’usage applicatif
3. `dto` / validation d’entrée
4. `store` ou accès persistance / infrastructure

## Choix auth

Ce projet n’utilise pas de JWT comme source de vérité principale.

Il utilise :

- cookies sécurisés
- session access token courte
- refresh token rotatif
- hachage serveur des jetons
- contrôle backend comme source de vérité

Conséquence :

- les variables `JWT_SECRET` et `JWT_REFRESH_SECRET` ne font pas partie du runtime actuel
- ajouter ces variables sans implémentation réelle serait du bruit de configuration

## Environnements

- `.env.example` : développement local
- `.env.prod.example` : exemple de runtime backend production
- `ops/env/backend.production.env.example` : exemple pour la stack VPS Docker

## Validation de démarrage

En production, le backend refuse désormais de démarrer si :

- `COOKIE_SECURE` n’est pas `true`
- `TRUST_PROXY` n’est pas `true`
- `COOKIE_DOMAIN` est vide
- les origines CORS sont absentes
- Redis est activé sans configuration exploitable
- SendText est activé sans credentials complets
- DexPay est activé sans credentials complets
- Cloudinary n’est pas entièrement configuré
