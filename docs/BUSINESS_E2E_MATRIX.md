# Matrice E2E business C2P

Cette matrice distingue les parcours qui bloquent deja la release et ceux qui doivent etre executes sur staging avec donnees jetables ou providers sandbox.

## Commandes

Release locale/staging:

```bash
cd front
npm run smoke:test:release
```

Backend API:

```bash
cd backend
API_URL=http://localhost:3003/api npm run http:checks
```

## Couverture bloquante actuelle

| Parcours | Couverture | Commande |
| --- | --- | --- |
| Public: accueil, catalogues, detail prestataire, formation, projet, contact | Navigation + formulaire contact | `front npm run smoke:test` |
| Auth: login, refresh, lockout, reset, permissions | HTTP role autorise/interdit | `backend npm run security:test` |
| Inscription roles | Creation comptes smoke pour client, prestataire, formateur, apprenant, porteur, partenaire | `front npm run smoke:test` |
| Dashboards roles | Client, prestataire, formateur, apprenant, porteur, partenaire, admin, superadmin | `front npm run smoke:test` |
| Admin settings | Creation/toggle/suppression categorie | `front npm run smoke:test:forms` |
| Admin communications | Creation campagne planifiee, affichage, preview, suppression | `front npm run smoke:test:forms` |
| Paiements et ledger | State machines, ledger, webhook replay, flows HTTP | `backend npm run http:checks` |
| Uploads | Policy, storage, upload flow | `backend npm run uploads:validate && npm run uploads:flow:test` |
| Messagerie et notifications | Flows HTTP dedies | `backend npm run messaging:flow:test && npm run notifications:flow:test` |
| Export donnees personnelles | Export self OK, cross-user refuse, aucun secret expose | `backend npm run security:test` |

## Couverture staging obligatoire avant actions sensibles prod

| Parcours | Pourquoi staging | Critere |
| --- | --- | --- |
| Paiement provider complet | Eviter transaction reelle prod | Provider sandbox ou mock, reconciliation OK |
| Assignation admin reservation | Modifie donnees client/prestataire | Donnees jetables, notification attendue |
| Suppression/anonymisation compte | Irreversible sur prod | Compte test, verification sessions/tokens |
| Envoi campagne immediate | Peut contacter de vrais utilisateurs | Audience test uniquement |
| Restore drill Docker | Manipule base temporaire et containers | Drill OK, journal d'exploitation rempli |

## Regle

Un nouveau parcours critique doit ajouter au moins:

- un test HTTP role autorise/interdit;
- un test UI si un formulaire existe;
- un nettoyage automatique ou une execution limitee a staging.
