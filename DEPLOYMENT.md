# C2P Deployment Runbook

## Release gate

Avant toute mise en production, la release doit passer:

1. `cd backend && npm run build`
2. `cd front && npm run type-check`
3. `cd front && npm run build`
4. `cd backend && npm run security:test`
5. `cd front && npm run smoke:test`

La CI GitHub exécute ces contrôles automatiquement sur `push`, `pull_request` et `release`.

## VPS hardening

Sur le serveur:

1. créer un utilisateur non-root dédié au déploiement
2. désactiver l’authentification SSH par mot de passe
3. n’autoriser que l’accès par clé SSH
4. activer `ufw` ou `nftables`
5. n’ouvrir que `22`, `80`, `443`
6. activer `fail2ban`
7. garder Docker, Docker Compose plugin et le système à jour

Exemple `ufw`:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Secrets

Ne pas versionner de secrets.

Fichiers attendus en prod:

- `ops/env/backend.production.env`
- `ops/nginx/certs/fullchain.pem`
- `ops/nginx/certs/privkey.pem`

Base de départ:

- [backend/.env.example](/home/cherif/Bureau/kodify/CP2/backend/.env.example)
- [ops/env/backend.production.env.example](/home/cherif/Bureau/kodify/CP2/ops/env/backend.production.env.example)

Important: la chaîne de connexion Neon qui a circulé hors coffre doit être considérée compromise et rotée avant la mise en production.

## Stack prod

Le monorepo est prévu pour tourner avec:

- `reverse-proxy` Nginx public
- `frontend` statique Nginx unprivileged
- `backend` NestJS
- `prometheus`
- `alertmanager`
- `grafana`
- `node-exporter`
- `cadvisor`

Fichier principal:

- [docker-compose.production.yml](/home/cherif/Bureau/kodify/CP2/docker-compose.production.yml)

## Déploiement

```bash
cp ops/env/backend.production.env.example ops/env/backend.production.env
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

Contrôles immédiats:

```bash
curl -I https://votre-domaine.example
curl -fsS https://votre-domaine.example/api/healthz
curl -fsS http://127.0.0.1:9090/-/healthy
curl -fsS http://127.0.0.1:9093/-/healthy
curl -fsS http://127.0.0.1:3004/api/health
```

## Monitoring

Provisioning inclus:

- [ops/monitoring/prometheus/prometheus.yml](/home/cherif/Bureau/kodify/CP2/ops/monitoring/prometheus/prometheus.yml)
- [ops/monitoring/prometheus/alerts.yml](/home/cherif/Bureau/kodify/CP2/ops/monitoring/prometheus/alerts.yml)
- [ops/monitoring/alertmanager/alertmanager.yml](/home/cherif/Bureau/kodify/CP2/ops/monitoring/alertmanager/alertmanager.yml)
- [ops/monitoring/grafana/dashboards/c2p-overview.json](/home/cherif/Bureau/kodify/CP2/ops/monitoring/grafana/dashboards/c2p-overview.json)

Par défaut, Grafana, Prometheus et Alertmanager sont bindés en `127.0.0.1` pour éviter une exposition publique.

## Rollback

Stratégie minimale:

1. tagger chaque image avec une version immuable
2. garder l’image N-1 locale
3. rollback par redeploy du tag précédent

Exemple:

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
# si incident:
docker compose -f docker-compose.production.yml down
# remettre les tags precedents puis relancer
docker compose -f docker-compose.production.yml up -d
```

## Sauvegardes

Minimum attendu:

- sauvegarde Neon automatisée côté fournisseur
- export régulier de la configuration VPS
- test de restauration planifié

## Limites restantes

Le gros point encore non conforme à un audit “CSP parfait” est la présence d’un nombre important de styles inline dans le front historique. Le reverse proxy applique déjà une politique stricte sur `script-src`, `frame-ancestors`, `object-src`, `base-uri`, `form-action`, mais la directive `style-src` conserve temporairement `unsafe-inline` tant que ce dette front n’est pas entièrement purgée.
