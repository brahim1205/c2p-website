# Informations d’accès — C2P

> Document destiné à centraliser toutes les informations d’accès nécessaires pour opérer le système.
>
> **Important** : ce document doit idéalement être maintenu en **privé** (ou chiffré) car il contient des éléments sensibles (accès SSH, FTP/SFTP, base de données, comptes admin, clés API).
>
> Pour éviter les fuites, ne commit pas de secrets en dur. Utilise des placeholders et/ou un coffre (Vault, 1Password, Bitwarden, etc.).

---

## 1) URLs / endpoints

### 1.1 URL du site (front)
- URL site : `https://<NOM_DE_DOMAINE>`
- (Optionnel) URL test/staging : `https://<STAGING_DOMAINE>`

### 1.2 URL de l’administration
- URL admin : `https://<NOM_DE_DOMAINE>/admin` (à adapter)
- (Optionnel) admin staging : `https://<STAGING_DOMAINE>/admin`

### 1.3 URL backend / API
- API base : `https://<NOM_DE_DOMAINE>/api`
- (Optionnel) API staging : `https://<STAGING_DOMAINE>/api`

---

## 2) Hébergeur / infrastructure

### 2.1 Hébergeur
- Hébergeur : `<ex: VPS provider / Cloud provider / bare metal>`
- Région/zone : `<...>`

### 2.2 Accès au dashboard d’hébergement (si applicable)
- UI admin infra : `https://<PROVIDER_DASHBOARD>`
- Organisation/Projet : `<...>`

---

## 3) Nom de domaine

- Domaine principal : `<DOMAIN>`
- Sous-domaines (si utilisés) :
  - `www.<DOMAIN>`
  - `api.<DOMAIN>`
  - `admin.<DOMAIN>`

---

## 4) Accès FTP/SFTP

> À compléter si uploads via SFTP/FTP sont utilisés.

- Méthode : `SFTP` (recommandé)
- Host : `sftp://<HOST>`
- Port : `<22|autre>`
- Utilisateur : `<ftp_user>`
- Chemin uploads : `<path uploads>`

### 4.1 Utilisateur(s) autorisé(s)
- Admin uploads : `<user>`
- Dev ops : `<user>`

---

## 5) Accès SSH (si applicable)

- Host : `<vps-hostname ou ip>`
- Port SSH : `<22|autre>`
- Utilisateur : `<ssh_user>`
- Mode :
  - clé SSH : `<ssh_key_reference>`
  - ou mot de passe (déconseillé)

### 5.1 Répertoire de travail
- Racine projet sur serveur : `<path>`
- Compose file : `<docker-compose.production.yml>`
- Env file : `ops/env/compose.production.env` et `ops/env/backend.production.env`

---

## 6) Accès base de données

### 6.1 Type de base
- PostgreSQL : `<oui/non>`

### 6.2 Connexion
- Host : `<db-host>`
- Port : `<5432>`
- Nom DB : `<db-name>`
- Utilisateur : `<db-user>`

### 6.3 Outils d’accès
- psql : commande et login
- GUI : `<ex: pgAdmin / DBeaver>`

### 6.4 Comptes admin DB
- Compte superuser : `<...>`
- Compte read-only (si existant) : `<...>`

---

## 7) Comptes administrateur (app)

> Éviter d’indiquer mots de passe ici.

### 7.1 Liste des admins applicatifs
- Admin 1 : `<email>`, rôle : `admin`
- Admin 2 : `<email>`, rôle : `superadmin` (si applicable)

### 7.2 Accès 2FA (si applicable)
- 2FA : `<oui/non>`
- Où sont les seeds/codes : `<vault>`

---

## 8) Clés API / tokens (si transmissibles en sécurité)

### 8.1 Clés intégrations externes
- Email provider (Brevo) : `<BREVO_API_KEY>`
- SMS provider (Brevo) : `<SENDTEXT_* ou SMS_PROVIDER tokens>`
- Payments (DexPay) : `<DEXPAY_* tokens>`
- Upload storage (Cloudflare R2 / S3) : `<CLOUDINARY_* / R2 creds>`

### 8.2 Stockage sécurisé
- Vault : `<ex: 1Password/Bitwarden/Secret Manager>`
- Rotation : `<date prévue>`

---

## 9) Règles de confidentialité

- Ne pas enregistrer de secrets dans le dépôt Git.
- Mettre à jour ce document uniquement avec placeholders si partagé.
- Si ce doc doit contenir des valeurs réelles :
  - chiffrer (GPG/age)
  - ou restreindre l’accès (permissions drive)

---

## 10) Check “accès valide” (référence)

> Checklist de vérification pour s’assurer que les accès sont encore valides.

- [ ] SSH fonctionne
- [ ] SFTP/FTP fonctionne (si utilisé)
- [ ] DB accessible
- [ ] Admin applicatif accessible
- [ ] API accessible

---

## 11) Historique / contact

- Dernière mise à jour : `<date>`
- Responsable : `<nom> / `<equipe>`

