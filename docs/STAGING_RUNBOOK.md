# Runbook staging C2P

Objectif: disposer d'un environnement iso-production pour tester les parcours sensibles sans toucher aux donnees ni aux providers de production.

## Principe

Staging doit rester separe de production:

- base PostgreSQL distincte;
- bucket upload distinct ou prefixe `uploads/staging`;
- cookies distincts (`c2p_staging_*`);
- domaine distinct (`https://staging.c2p.sn`);
- providers externes desactives ou en sandbox;
- secrets GitHub `STAGING_*` separes des secrets `PRODUCTION_*`.

## Fichiers attendus sur le VPS staging

Les vrais fichiers ne sont pas versionnes:

```bash
ops/env/compose.staging.env
ops/env/backend.staging.env
```

Templates:

```bash
ops/env/compose.staging.env.example
ops/env/backend.staging.env.example
```

Initialisation:

```bash
cp ops/env/compose.staging.env.example ops/env/compose.staging.env
cp ops/env/backend.staging.env.example ops/env/backend.staging.env
chmod 600 ops/env/compose.staging.env ops/env/backend.staging.env
```

Remplacer tous les `replace-with-*` par des secrets staging.

## Secrets GitHub requis

- `STAGING_SSH_HOST`
- `STAGING_SSH_PORT`
- `STAGING_SSH_USER`
- `STAGING_SSH_PRIVATE_KEY`
- `STAGING_SSH_KNOWN_HOSTS`
- `STAGING_DEPLOY_PATH`
- `STAGING_BASE_URL`
- `STAGING_POSTDEPLOY_RESTORE_DRILL`

Option temporaire seulement:

- `STAGING_ALLOW_SSH_KEYSCAN=true`

## Deploiement

Automatique:

- le workflow `staging-deploy` se lance apres `monorepo-ci` vert sur `main`.

Manuel:

```bash
gh workflow run staging-deploy.yml -f ref=main
```

## Validation staging

Apres deploiement:

```bash
cd backend
npm run production:postdeploy -- --base-url https://staging.c2p.sn --compose-env ops/env/compose.staging.env --backend-env ops/env/backend.staging.env

cd ../front
FRONT_URL=https://staging.c2p.sn API_URL=https://staging.c2p.sn/api C2P_E2E_ALLOW_MUTATIONS=true npm run smoke:test:forms
```

Les tests destructifs ou sensibles doivent etre lances sur staging avant production:

- paiement provider sandbox;
- assignation admin;
- suppression/anonymisation compte;
- campagnes de communication;
- restore drill.

## Critere de sortie du chantier staging

- workflow `staging-deploy` vert;
- domaine staging accessible;
- backend healthy;
- smoke UI complet vert;
- tests formulaire-affichage verts;
- aucun secret production reutilise.
