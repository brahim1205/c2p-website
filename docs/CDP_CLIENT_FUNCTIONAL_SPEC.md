# C2P / CDP - Alignement fiche technique client

Date de consolidation: 2026-05-13

## Objet

Ce document traduit la fiche technique transmise par le client en specification exploitable pour le produit C2P.

Il sert de reference pour:

- les arbitrages produit
- l'alignement du vocabulaire public
- la priorisation des chantiers backend/frontend
- les futurs tests fonctionnels role par role

## Positionnement

Le **Centre de Developpement Professionnel (CDP / C2P)** est un ecosysteme d'accompagnement professionnel et entrepreneurial.

Le coeur du produit repose sur trois blocs actuellement exposes dans la plateforme:

1. `AlloPresta`
2. `Espace Numerique`
3. `ProjectCenter`

La fiche client precise une nomenclature plus metier:

- `SenPrest@` -> correspond au module `AlloPresta`
- `Form'Actions` -> correspond a la branche post-formation de `Espace Numerique`
- `Ecole Numerique de Dakar (END)` -> correspond a la branche education/enseignement de `Espace Numerique`
- `Projects'center` -> correspond au module `ProjectCenter`

## Cartographie produit cible

### 1. SenPrest@ / AlloPresta

Finalite:

- organiser les offres et demandes de prestations
- permettre la recherche criteree
- gerer abonnements, alertes, visibilite et verification
- garder le contact direct sensible derriere le centre d'operation C2P

Acteurs:

- visiteur
- prestataire
- prestateur / client
- admin / centre d'operation

Regles cle:

- le visiteur voit les annonces sans details sensibles
- le pseudo peut etre public, pas les donnees personnelles completes
- les details riches, alertes et recherches avancees dependent d'un abonnement
- la prise en charge finale passe par C2P
- la geolocalisation fine et la disponibilite detaillee restent maitrisees par l'operation

### 2. Espace Numerique

L'Espace Numerique couvre en realite deux sous-domaines fonctionnels.

#### 2.1 Form'Actions

Finalite:

- post-formation
- formations additionnelles / complementaires
- bootcamps, stages, seminaires, accompagnement par experts

Regles cle:

- tout utilisateur peut voir les annonces
- les services avances et l'agrement formateur supposent abonnement/paiement/reglement
- les utilisateurs peuvent rechercher par discipline, localite, quartier, disponibilite, agenda
- la reaction operationnelle C2P doit etre tracee dans un delai de 24h

#### 2.2 Ecole Numerique de Dakar (END)

Finalite:

- enseignement en ligne et en presentiel
- suivi des apprenants
- suivi parent/enfant
- barometres de qualite des enseignants et des cours

Regles cle:

- cours `online`, `onsite`, `hybrid` ou `programmes`
- possibilite d'inscription apprenant
- possibilite de suivi parent
- possibilite d'afficher les classements de maniere parametree
- classes virtuelles et emplois du temps pilotes selon programmation

### 3. Projects'center / ProjectCenter

Finalite:

- incubation
- co-portage
- mentorat technique
- accompagnement financier
- structuration de projet jusqu'a l'autonomisation

Acteurs:

- porteur / createur
- expert associe
- financier associe
- bailleur / promoteur
- admin / centre d'operation

Regles cle:

- le porteur depose un projet ou un dossier
- l'expert associe peut apporter encadrement technique
- le financier associe peut apporter financement
- la relation est suivie, contractualisee et pilotee
- le contact sensible passe par C2P plutot qu'en direct

## Roles metier a retenir

Le produit actuel couvre deja plusieurs roles. La fiche client permet de les reclasser.

- `visiteur`
- `client / prestateur`
- `prestataire`
- `apprenant`
- `parent` (pas encore modelise comme role distinct)
- `formateur`
- `porteur`
- `partenaire technique`
- `partenaire financier`
- `admin / centre d'operation`

## Regles transverses a considerer comme canon

### Confidentialite

- les donnees personnelles completes ne doivent pas etre visibles publiquement
- la plateforme doit privilegier pseudo, qualification, zone d'intervention, niveau, certification

### Centre d'operation C2P

- les mises en relation sensibles doivent etre orientees vers C2P
- la messagerie directe ne doit pas contourner ce principe
- les notifications metier sensibles doivent rester serveur-first

### Monétisation

Les axes commerciaux explicites du client sont:

- frais d'inscription
- abonnements
- billets / codes / visibilite
- frais de suivi
- commissions sur prestations
- vente de modules
- mensualites
- investissements / partenariats

### Modalites de service

Les modalites a traiter explicitement dans l'UX et le backend sont:

- `en ligne`
- `en presentiel`
- `hybride`
- `programme`
- `temporaire`
- `durable`

## Mapping avec l'etat actuel du produit

### Deja aligne

- `AlloPresta` existe et fonctionne avec recherche/listing/detail
- `Espace Numerique` supporte `online / onsite / hybrid`
- `ProjectCenter` supporte `partenaire technique / financier`
- la communication sensible est deja recadree vers `admin / C2P` sur plusieurs flux

### A completer

- formaliser `prestateur` comme vocabulaire/metier distinct du simple `client`
- modeliser `parent` si l'END devient un vrai sous-produit
- ajouter les niveaux d'abonnement / visibilite / alertes conformes a `SenPrest@`
- distinguer dans l'Espace Numerique les branches `Form'Actions` et `END`
- ajouter les workflows de `barometre` / classement enseignant si le client confirme ce besoin
- enrichir `ProjectCenter` avec co-portage plus explicite expert/financier

## Priorites d'implementation conseillees

### Priorite 1

- harmoniser le vocabulaire public
- fixer les regles d'acces visiteur / abonne / verifie
- garder C2P comme point de passage pour les interactions sensibles

### Priorite 2

- structurer `Espace Numerique` en sous-domaines `Form'Actions` et `END`
- modeliser les alertes/abonnements metier de `SenPrest@`
- renforcer les tableaux de bord `porteur / partenaire`

### Priorite 3

- ajouter les notions `parent`, `barometre`, `cohortes`, `stages`, `bootcamps`
- durcir le reporting et les KPI par module

## Decision d'architecture immediate

Pour le code actuel:

- on conserve **3 modules publics** visibles (`AlloPresta`, `Espace Numerique`, `ProjectCenter`)
- on documente que:
  - `AlloPresta` = `SenPrest@`
  - `Espace Numerique` = `Form'Actions + END`
  - `ProjectCenter` = `Projects'center`

Cette decision evite une fausse explosion de navigation tant que les sous-domaines ne sont pas separes proprement dans le backend, les permissions et les abonnements.

