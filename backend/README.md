# Kodify Backend

Backend NestJS maintenu comme **monolithe modulaire**.

## Architecture

- un seul backend HTTP
- modules métier explicites
- séparation contrôleurs / services / DTO / persistance
- sécurité et validation centralisées au backend

Référence interne :

- [docs/ARCHITECTURE.md](/home/cherif/Bureau/kodify/CP2/backend/docs/ARCHITECTURE.md)

## Modules

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

## Runtime de sécurité

Le projet n’utilise pas JWT comme source de vérité principale.

Il utilise :

- cookies `HttpOnly`
- access session courte
- refresh token rotatif
- validation backend stricte

Donc un template `.env.prod` provenant d’un projet JWT ne doit pas être copié tel quel ici.
Il faut garder uniquement les variables réellement consommées par ce backend.

## Fichiers d’environnement

- `.env.example` : développement local
- `.env.prod.example` : production backend simple
- `../ops/env/backend.production.env.example` : production Docker/VPS

Variables importantes :

- `APP_ORIGINS` ou `CORS_ORIGIN`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `TRUST_PROXY`
- `REDIS_URL` ou `REDIS_HOST/PORT`
- `SENDTEXT_*`
- `DEXPAY_*`
- `CLOUDINARY_*`

## Commandes

- `npm install`
- `npm run start:dev`
- `npm run build`
- `npm run start`
- `npm run security:test`
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Développement local

1. Copier `.env.example` en `.env`
2. Ajuster `DATABASE_URL`
3. Lancer `npm run start:dev`

## Production

Le backend refuse de démarrer en `production` si la configuration critique est incohérente.
