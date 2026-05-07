# Kodify Backend

Monolithique NestJS organisé selon une architecture modulaire et propre.

## Fonctionnalités

- Backend Node.js avec NestJS
- Architecture modulaire + domaine/application/infrastructure
- PostgreSQL via Prisma
- Redis via ioredis
- Validation `zod`
- Docker + Docker Compose
- Kubernetes manifests pour backend, Postgres et Redis

## Commandes

- `npm install`
- `npm run start:dev`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Développement local

1. Copier `.env.example` en `.env`
2. `docker-compose up --build`
3. La backend écoute sur `http://localhost:3000/api`
