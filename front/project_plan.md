# C2P - Plateforme de Développement Professionnel

## Vision
Plateforme web complète pour la mise en relation entre professionnels, formateurs, apprenants, porteurs de projets et partenaires au Sénégal et en Afrique francophone.

## Architecture Technique
- **Framework**: React 19 + TypeScript + Vite + TailwindCSS
- **State**: Context API (AuthContext mock, ToastContext)
- **Routing**: React Router v7 avec protection de routes
- **UI**: Remix Icon + Recharts + Custom components
- **Animation**: Transitions de page CSS (fade/slide)
- **Internationalisation**: i18next (français par défaut)

## Modules Réalisés

### 1. Authentification & Rôles
- [x] Système de login avec mock users et vérification email/mdp
- [x] Système d'inscription avec sélection de type de compte
- [x] Authentification 2FA (mock, tout code à 6 chiffres valide)
- [x] Context Auth avec login/logout/register/verify2FA/updateUser
- [x] Persistance du user dans localStorage
- [x] Logout avec suppression de session et redirection vers l'accueil
- [x] Affichage du nom/prénom et rôle dans le header dashboard
- [x] **Redirection automatique vers le bon dashboard selon le rôle**

### 2. Protection des Routes
- [x] Middleware `RequireAuth` avec redirection vers login si non authentifié
- [x] Redirection des pages auth (login/register) si déjà connecté
- [x] `allowedRoles` sur chaque route protégée (admin, prestataire, formateur, etc.)
- [x] Redirection vers le dashboard approprié si rôle non autorisé
- [x] `RouteWrapper` pour encapsuler layout + auth + transition
- [x] Layout Public, Dashboard et Admin avec wrappers cohérents

### 3. Transitions de Pages
- [x] Composant `PageTransition` avec animation fade + slide vertical
- [x] Déclenchement automatique sur chaque changement de route
- [x] Intégration transparente dans le RouteWrapper

### 4. Dashboards par Rôle
- [x] **Dashboard générique** (`/dashboard`) - client par défaut
- [x] **Prestataire** (`/dashboard/prestataire`) - demandes, avis, services
- [x] **Formateur** (`/dashboard/formateur`) - formations, apprenants, cours
- [x] **Apprenant** (`/dashboard/apprenant`) - formations en cours, certificats
- [x] **Porteur de projet** (`/dashboard/porteur`) - projets, jalons, mentors
- [x] **Partenaire** (`/dashboard/partenaire`) - investissements, ROI
- [x] Navigation sidebar adaptée au rôle connecté

### 5. Espace Admin
- [x] Dashboard administrateur (`/admin/dashboard`)
- [x] Gestion utilisateurs avec valider/suspendre (bulk + solo)
- [x] Gestion contenus avec publier/rejeter (bulk + solo)
- [x] Gestion accréditations avec approuver/rejeter
- [x] Pages paiements, signalements, statistiques, sécurité
- [x] Page profil admin complète (4 onglets)
- [x] Skeleton loaders sur tous les tableaux

### 6. Avatar Utilisateur (Upload)
- [x] Composant `AvatarUpload` réutilisable avec preview en temps réel
- [x] Validation : fichiers image uniquement, max 2Mo
- [x] Affichage dans le header, la sidebar et la page profil
- [x] Persistance de l'avatar via `updateUser` dans le contexte auth
- [x] Fallback avec initiales si aucune photo

### 7. Notifications en Temps Réel
- [x] Hook `useNotifications` avec polling simulé (~45s)
- [x] Badge rouge dynamique dans le header avec compteur
- [x] Dropdown panel avec tabs "Toutes / Non lues"
- [x] Navigation vers les liens associés au clic
- [x] Persistance dans localStorage
- [x] Marquer comme lu / tout marquer comme lu / supprimer
- [x] Page `/dashboard/notifications` complète avec historique et préférences

### 8. Toast System
- [x] ToastProvider global dans l'app
- [x] 4 méthodes: success, error, warning, info
- [x] Hook useToast réutilisable partout
- [x] Auto-dismiss après 5 secondes avec icônes et couleurs
- [x] Toasts connectés aux actions d'admin (exporter, valider, suspendre)

### 9. Breadcrumbs
- [x] Composant Breadcrumb réutilisable
- [x] Intégré sur toutes les pages dashboard et admin

### 10. Autres
- [x] Page 404 design avec liens rapides
- [x] Layout public avec hero, CTA, footer
- [x] AlloPresta, Espace Numérique, Project Center pages

## Données Mock
- `src/mocks/users.ts` - 7 utilisateurs avec rôles variés
- `src/mocks/messages.ts`, `src/mocks/notifications.ts`
- Mot de passe universel mock: `password123`

## Utilisateurs de Démo
| Email | Rôle | 2FA |
|---|---|---|
| admin@c2p.sn | Admin | Oui |
| prestataire@c2p.sn | Prestataire | Non |
| formateur@c2p.sn | Formateur | Oui |
| apprenant@c2p.sn | Apprenant | Non |
| porteur@c2p.sn | Porteur | Non |
| partenaire@c2p.sn | Partenaire | Oui |
| client@c2p.sn | Client | Non |

## Prochaines Étapes
- [ ] Connexion Supabase pour auth réel
- [ ] Backend pour les actions CRUD
- [ ] Système de messagerie temps réel
- [ ] Notifications push