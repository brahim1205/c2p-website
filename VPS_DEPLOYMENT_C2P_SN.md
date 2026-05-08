# Deploiement VPS `c2p.sn`

Ce runbook suppose :

- Ubuntu `24.04 LTS`
- un VPS neuf
- un acces SSH par cle
- le domaine `c2p.sn`
- PostgreSQL heberge sur le VPS via Docker Compose
- les acces DexPay et SendText disponibles cote metier

Ce runbook n'expose pas Grafana, Prometheus, Alertmanager ou Loki publiquement. L'acces se fait par tunnel SSH. C'est le choix le plus propre pour un premier niveau enterprise sur VPS.

## 0. Preparer les DNS

Chez ton registrar ou ton DNS provider, cree au minimum :

- `A c2p.sn -> IP_PUBLIQUE_DU_VPS`
- `A www.c2p.sn -> IP_PUBLIQUE_DU_VPS`

Verifier :

```bash
dig +short c2p.sn
dig +short www.c2p.sn
```

Les deux doivent retourner l'IP publique du VPS.

## 1. Premiere connexion

Depuis ta machine locale :

```bash
ssh root@IP_PUBLIQUE_DU_VPS
```

## 2. Mettre le systeme a jour

Sur le VPS :

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git ufw fail2ban unzip jq
timedatectl set-timezone Africa/Dakar
```

Verifier :

```bash
timedatectl
```

## 3. Creer un utilisateur de deploiement

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Tester une seconde session avant de couper root :

```bash
ssh deploy@IP_PUBLIQUE_DU_VPS
```

## 4. Durcir SSH

Sur le VPS :

```bash
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sed -i 's/^#\\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart ssh
```

Verifier dans une nouvelle session :

```bash
ssh deploy@IP_PUBLIQUE_DU_VPS
```

## 5. Activer le firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

Note importante : Docker peut contourner certaines regles `ufw`. Ici, seules les publications de ports voulues existent :

- `80` et `443` en public
- `9090`, `9093`, `3004`, `3100` bindes sur `127.0.0.1`

## 6. Activer fail2ban

```bash
cat >/etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban
fail2ban-client status sshd
```

## 7. Installer Docker Engine et Compose

Base officielle Docker pour Ubuntu :

```bash
apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc || true
apt update
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
tee /etc/apt/sources.list.d/docker.sources >/dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
docker version
docker compose version
usermod -aG docker deploy
```

Reconnecte-toi en `deploy` apres l'ajout au groupe `docker`.

## 8. Recuperer le monorepo

En tant que `deploy` :

```bash
mkdir -p /srv
cd /srv
git clone VOTRE_REPO_GIT c2p
cd /srv/c2p
```

## 9. Generer les secrets de prod

Depuis `/srv/c2p` :

```bash
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
```

Tu vas utiliser ces valeurs au minimum pour :

- `REDIS_PASSWORD`
- `GF_SECURITY_ADMIN_PASSWORD`
- toute cle fournisseur DexPay / SendText que tu dois regenerer

Tous les anciens secrets de base de donnees, Redis, DexPay, SendText, Cloudinary et Grafana doivent etre rotes avant prod si leur valeur a circule hors coffre.

## 10. Creer les fichiers d'environnement de production

```bash
cp ops/env/backend.production.env.example ops/env/backend.production.env
cp ops/env/compose.production.env.example ops/env/compose.production.env
```

Edite d'abord le runtime backend :

```bash
nano ops/env/backend.production.env
```

Remplis au minimum :

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://c2p:...mot-de-passe-fort...@postgres:5432/c2p?schema=public&connection_limit=20&pool_timeout=10
APP_ORIGINS=https://c2p.sn,https://www.c2p.sn
COOKIE_DOMAIN=.c2p.sn
COOKIE_SECURE=true
TRUST_PROXY=true

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DISABLED=false
REDIS_USERNAME=default
REDIS_PASSWORD=...secret fort...
REDIS_DB=0
REDIS_TLS=false

SMS_PROVIDER=sendtext
SMS_SENDER_ID=C2P
SENDTEXT_BASE_URL=https://backend.sendtext.sn
SENDTEXT_SEND_PATH=/...chemin_reel_fourni_par_sendtext...
SENDTEXT_API_KEY=...
SENDTEXT_API_SECRET=...

DEXPAY_ENABLED=true
DEXPAY_BASE_URL=https://...base-url-reelle-dexpay...
DEXPAY_API_KEY=...
DEXPAY_API_SECRET=...
DEXPAY_DEFAULT_ASSET=DUSD
DEXPAY_DEFAULT_CHAIN=BSC
DEXPAY_ONRAMP_TYPE=BUY
DEXPAY_OFFRAMP_TYPE=SELL

```

Notes importantes :

1. `SENDTEXT_SEND_PATH` n'est pas public sur leur site. Il faut le chemin officiel fourni par SendText.
2. La doc DexPay publique decrit les endpoints relatifs, mais pas de base URL unique visible. Utilise la base URL fournie pendant l'onboarding DexPay.
3. La doc DexPay est incoherente sur le champ `type` pour l'on-ramp. C'est pour ca que `DEXPAY_ONRAMP_TYPE` et `DEXPAY_OFFRAMP_TYPE` sont parametrables.

Edite ensuite les variables Compose / monitoring :

```bash
nano ops/env/compose.production.env
```

Remplis au minimum :

```dotenv
BACKEND_ENV_FILE=./ops/env/backend.production.env
POSTGRES_DB=c2p
POSTGRES_USER=c2p
POSTGRES_PASSWORD=...mot-de-passe-fort...
REDIS_PASSWORD=...secret fort...
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=...secret fort...
GF_SERVER_ROOT_URL=http://127.0.0.1:3004
BACKUP_RETENTION_DAYS=14
BACKUP_CRON_SCHEDULE="30 2 * * *"
```

Important :

- `backend.production.env` = variables runtime du backend
- `compose.production.env` = variables d'interpolation Docker Compose
- `POSTGRES_*` dans `compose.production.env` doivent correspondre a la connexion utilisee dans `DATABASE_URL`
- ne mélange pas les deux, sinon tu auras des comportements incohérents entre `docker compose config` et l'exécution réelle

## 11. Obtenir les certificats TLS

Installe Certbot :

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

Assure-toi que `80/tcp` est ouvert, puis demande le certificat :

```bash
sudo certbot certonly --standalone -d c2p.sn -d www.c2p.sn --agree-tos -m admin@c2p.sn
```

Copie les certificats dans le repo :

```bash
mkdir -p /srv/c2p/ops/nginx/certs
sudo cp /etc/letsencrypt/live/c2p.sn/fullchain.pem /srv/c2p/ops/nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/c2p.sn/privkey.pem /srv/c2p/ops/nginx/certs/privkey.pem
sudo chown -R deploy:deploy /srv/c2p/ops/nginx/certs
chmod 644 /srv/c2p/ops/nginx/certs/fullchain.pem
chmod 600 /srv/c2p/ops/nginx/certs/privkey.pem
```

## 12. Verifier la configuration compose

Important : la stack lit des variables pour Redis et Grafana. Il faut toujours utiliser `--env-file`.

```bash
cd /srv/c2p
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml config >/tmp/c2p-compose.rendered.yml
sed -n '1,200p' /tmp/c2p-compose.rendered.yml
```

## 13. Construire et demarrer la stack

```bash
cd /srv/c2p
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml build
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml ps
```

Services attendus :

- `reverse-proxy`
- `frontend`
- `backend`
- `postgres`
- `redis`
- `prometheus`
- `alertmanager`
- `grafana`
- `loki`
- `promtail`
- `node-exporter`
- `cadvisor`

## 14. Verifications immediates

Depuis le VPS :

```bash
curl -I http://127.0.0.1:3004
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml exec -T postgres pg_isready -U c2p -d c2p
curl -fsS http://127.0.0.1:9090/-/healthy
curl -fsS http://127.0.0.1:9093/-/healthy
curl -fsS http://127.0.0.1:3100/ready
curl -fsS https://c2p.sn/api/healthz
curl -fsSI https://c2p.sn | grep -Ei 'strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'
```

Verifier aussi les logs :

```bash
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml logs --tail=100 reverse-proxy backend postgres
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml logs --tail=100 grafana prometheus alertmanager loki promtail
```

## 15. Acceder a Grafana, Prometheus, Alertmanager et Loki

Depuis ta machine locale, ouvre un tunnel SSH :

```bash
ssh -L 3004:127.0.0.1:3004 -L 9090:127.0.0.1:9090 -L 9093:127.0.0.1:9093 -L 3100:127.0.0.1:3100 deploy@c2p.sn
```

Ensuite ouvre :

- Grafana : `http://127.0.0.1:3004`
- Prometheus : `http://127.0.0.1:9090`
- Alertmanager : `http://127.0.0.1:9093`
- Loki readiness : `http://127.0.0.1:3100/ready`

Identifiants Grafana :

- login : `GF_SECURITY_ADMIN_USER`
- mot de passe : `GF_SECURITY_ADMIN_PASSWORD`

## 16. Configurer Grafana

Une fois connecte :

1. Va dans `Dashboards`
2. Ouvre le dossier `C2P`
3. Ouvre `C2P Overview`
4. Verifie que la datasource `Prometheus` repond
5. Va dans `Explore`
6. Choisis la datasource `Loki`
7. Lance une requete :

```txt
{job="docker"}
```

Si tu vois les logs des conteneurs, Loki + Promtail sont bien en place.

## 17. Configurer Alertmanager

Par defaut, `ops/monitoring/alertmanager/alertmanager.yml` n'envoie rien vers l'exterieur. C'est volontaire pour eviter un faux webhook mort en prod.

Avant ouverture publique, edite ce fichier :

```bash
nano ops/monitoring/alertmanager/alertmanager.yml
```

Exemple webhook interne :

```yaml
receivers:
  - name: default
    webhook_configs:
      - url: https://votre-endpoint-interne.example/alertmanager
        send_resolved: true
```

Puis recharge :

```bash
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d alertmanager
```

Verifier :

```bash
curl -fsS http://127.0.0.1:9093/-/healthy
```

## 18. Verifier Prometheus

Ouvre `http://127.0.0.1:9090/targets` et controle que les targets suivantes sont `UP` :

- `c2p-backend`
- `node-exporter`
- `cadvisor`

Tu peux aussi verifier en CLI :

```bash
curl -fsS http://127.0.0.1:9090/api/v1/targets | jq '.data.activeTargets[] | {scrapeUrl: .scrapeUrl, health: .health}'
```

## 19. Verifier SendText

Une fois le vrai `SENDTEXT_SEND_PATH` renseigne :

```bash
curl -fsS -X POST https://c2p.sn/api/communications/sms/test \
  -H 'Content-Type: application/json' \
  -H 'X-CSRF-Token: ...' \
  --cookie 'c2p_csrf=...; c2p_at=...; c2p_rt=...' \
  -d '{"phone":"+221770000000","message":"Test C2P SendText"}'
```

En pratique, fais ce test depuis l'interface admin une fois connecte. Si tu veux le faire en CLI, il faut une session admin valide.

## 20. Verifier DexPay

Une fois `DEXPAY_*` rempli :

```bash
curl -fsS https://c2p.sn/api/payments/dexpay/status \
  -H 'X-CSRF-Token: ...' \
  --cookie 'c2p_csrf=...; c2p_at=...; c2p_rt=...'
```

Depuis le front :

1. connecte-toi
2. va dans `Dashboard > Paiements`
3. ouvre `DexPay`
4. cree une operation
5. ouvre le detail
6. clique `Synchroniser DexPay`

## 21. Smoke applicatif apres deploiement

Si tu veux verifier le front depuis le serveur lui-meme :

```bash
curl -fsS https://c2p.sn >/dev/null
curl -fsS https://c2p.sn/api/healthz
```

La smoke fonctionnelle complete reste mieux en CI, mais tu peux au moins verifier :

- page d'accueil
- connexion admin
- dashboard client
- dashboard prestataire
- dashboard formateur
- dashboard apprenant
- dashboard porteur
- dashboard partenaire
- page `Paiements`
- page `Communications`

## 22. Verifier CI, CodeQL, Dependabot et Trivy

### 22.1. Configurer les checks obligatoires sur GitHub

Dans GitHub :

1. ouvre le depot
2. va dans `Settings`
3. ouvre `Branches`
4. cree une regle de protection pour `main`
5. active :
   - `Require a pull request before merging`
   - `Require status checks to pass before merging`
   - `Require branches to be up to date before merging`
6. ajoute comme checks obligatoires :
   - `build-test-security`
   - le check GitHub natif de `Code scanning` / `CodeQL` visible dans l'interface de protection de branche

Ces checks correspondent a :

- `monorepo-ci` : build, type-check, audits npm, Trivy, tests de securite backend, smoke test front
- `Code scanning` : analyse CodeQL geree par GitHub via la configuration par defaut activee dans le depot

### 22.2. Ouvrir l'interface GitHub Actions

Dans GitHub :

1. va dans `Actions`
2. ouvre `monorepo-ci`

Ce que tu dois verifier :

- le workflow `monorepo-ci` est vert
- les etapes `Trivy filesystem scan`, `Trivy backend image scan` et `Trivy frontend image scan` sont vertes
- l'onglet `Security > Code scanning` remonte bien les analyses CodeQL

Si `monorepo-ci` echoue :

1. ouvre l'execution
2. ouvre le job `build-test-security`
3. regarde l'etape rouge
4. corrige avant tout merge

### 22.3. Ouvrir CodeQL

Dans GitHub :

1. va dans `Security`
2. ouvre `Code scanning`

Etat attendu :

- zero alerte critique ouverte
- zero alerte haute ouverte non justifiee

### 22.4. Ouvrir Dependabot

Dans GitHub :

1. va dans `Security`
2. ouvre `Dependabot alerts`

Etat attendu :

- zero alerte critique ouverte
- zero alerte haute ouverte non traitee

Les mises a jour automatiques sont definies dans `.github/dependabot.yml`.

### 22.5. Savoir si tout est en ordre cote CI

Le depot est dans un etat acceptable si :

- `Actions > monorepo-ci` est vert sur `main`
- `Security > Code scanning` ne contient pas d'alerte critique ouverte
- `Security > Dependabot alerts` ne contient pas d'alerte critique ouverte

## 23. Sauvegarde PostgreSQL nocturne

Les scripts d'exploitation sont deja dans le repo :

- `ops/scripts/postgres-backup.sh`
- `ops/scripts/postgres-restore.sh`
- `ops/scripts/install-postgres-backup-cron.sh`

Creer d'abord le dossier de sauvegarde :

```bash
mkdir -p /srv/c2p/backups/postgres
chmod 700 /srv/c2p/backups /srv/c2p/backups/postgres
```

Tester une sauvegarde manuelle :

```bash
cd /srv/c2p
COMPOSE_ENV_FILE=/srv/c2p/ops/env/compose.production.env ./ops/scripts/postgres-backup.sh
ls -lh /srv/c2p/backups/postgres
```

Installer ensuite le cron systeme :

```bash
cd /srv/c2p
sudo COMPOSE_ENV_FILE=/srv/c2p/ops/env/compose.production.env BACKUP_RETENTION_DAYS=14 BACKUP_CRON_SCHEDULE='30 2 * * *' ./ops/scripts/install-postgres-backup-cron.sh
sudo cat /etc/cron.d/c2p-postgres-backup
sudo cp /srv/c2p/ops/logrotate/c2p-postgres-backup /etc/logrotate.d/c2p-postgres-backup
sudo logrotate -d /etc/logrotate.d/c2p-postgres-backup
```

Ce cron lance une sauvegarde chaque nuit a `02:30`, conserve `14` jours, et ecrit les logs dans :

```txt
/var/log/c2p-postgres-backup.log
```

Verifier le cron :

```bash
sudo systemctl status cron --no-pager
sudo grep c2p-postgres-backup /etc/cron.d/c2p-postgres-backup
sudo tail -n 50 /var/log/c2p-postgres-backup.log || true
```

Restaurer une sauvegarde :

```bash
cd /srv/c2p
COMPOSE_ENV_FILE=/srv/c2p/ops/env/compose.production.env ./ops/scripts/postgres-restore.sh /srv/c2p/backups/postgres/c2p-postgres-YYYYMMDDTHHMMSSZ.sql.gz
```

## 24. Renouvellement des certificats

Teste d'abord :

```bash
sudo certbot renew --dry-run
```

Puis ajoute un hook de copie :

```bash
sudo tee /usr/local/bin/c2p-refresh-certs.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cp /etc/letsencrypt/live/c2p.sn/fullchain.pem /srv/c2p/ops/nginx/certs/fullchain.pem
cp /etc/letsencrypt/live/c2p.sn/privkey.pem /srv/c2p/ops/nginx/certs/privkey.pem
chown deploy:deploy /srv/c2p/ops/nginx/certs/fullchain.pem /srv/c2p/ops/nginx/certs/privkey.pem
chmod 644 /srv/c2p/ops/nginx/certs/fullchain.pem
chmod 600 /srv/c2p/ops/nginx/certs/privkey.pem
cd /srv/c2p
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d reverse-proxy
EOF
sudo chmod +x /usr/local/bin/c2p-refresh-certs.sh
```

Ajoute le cron root :

```bash
sudo crontab -e
```

Puis :

```cron
15 3 * * * certbot renew --quiet --deploy-hook /usr/local/bin/c2p-refresh-certs.sh
```

## 25. Mise a jour applicative

```bash
cd /srv/c2p
git fetch --all --tags
git checkout main
git pull --ff-only
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml build
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml ps
```

## 26. Rollback

Si tu deploies par tag git :

```bash
cd /srv/c2p
git fetch --all --tags
git checkout v1.0.0
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml build
docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d
```

## 27. Checklist de sortie

Le deploiement est propre si :

- `https://c2p.sn` repond
- `https://c2p.sn/api/healthz` repond
- les headers de securite sont presents
- `docker compose ps` ne montre aucun service en boucle
- une sauvegarde `.sql.gz` recente existe dans `/srv/c2p/backups/postgres`
- Grafana affiche `C2P Overview`
- Prometheus montre les targets `UP`
- Loki remonte les logs Docker
- Alertmanager repond et a un receiver configure
- la connexion admin fonctionne
- le dashboard Paiements ouvre DexPay
- la page Admin Communications remonte l'etat SMS

## 28. Ecarts connus a garder en tete

1. La CSP front reste forte sur `script-src`, mais `style-src 'unsafe-inline'` est encore necessaire tant que tout le front historique n'a pas ete purge de ses styles inline.
2. `SENDTEXT_SEND_PATH` doit venir de la documentation ou du support SendText : ce point n'est pas public.
3. La base URL DexPay doit venir de l'onboarding fournisseur : leur doc publique liste les endpoints relatifs, pas une base unique explicite.
