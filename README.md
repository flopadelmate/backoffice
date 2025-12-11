# PadelMate Back-Office

Back-office d'administration pour PadelMate - Application de matchmaking de padel.

## 🎯 Objectif

Ce projet est un back-office interne pour administrateurs permettant de :
- Gérer les clubs de padel
- Consulter les KPIs et statistiques
- Tester l'algorithme de matchmaking avec des joueurs fictifs

## 🛠️ Stack Technique

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript (strict mode)
- **Styling** : Tailwind CSS
- **Composants UI** : shadcn/ui
- **Data Fetching** : TanStack Query (React Query)
- **Authentification** : JWT en mémoire (simple access token)
- **Déploiement** : Vercel

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec votre URL backend

# Lancer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Lancer la version production
npm start
```

## 📁 Structure du Projet

```
backoffice/
├── app/                      # Next.js App Router
│   ├── (admin)/             # Groupe de routes protégées
│   │   ├── dashboard/       # Page d'accueil admin
│   │   ├── clubs/           # Module Clubs
│   │   ├── kpi/             # Module KPI
│   │   └── matchmaking/lab/ # Matchmaking Lab
│   ├── login/               # Page de connexion
│   ├── layout.tsx           # Layout racine
│   └── globals.css          # Styles globaux
├── components/
│   ├── ui/                  # Composants shadcn/ui
│   ├── layout/              # Composants de layout (Sidebar, Header)
│   ├── clubs/               # Composants spécifiques aux clubs
│   └── matchmaking/         # Composants du Matchmaking Lab
├── hooks/                   # Hooks React personnalisés
│   ├── use-auth.ts          # Hooks d'authentification
│   ├── use-clubs.ts         # Hooks pour les clubs
│   ├── use-kpi.ts           # Hooks pour les KPIs
│   └── use-matchmaking.ts   # Hooks pour le matchmaking
├── lib/
│   ├── api-client.ts        # Client API centralisé
│   ├── auth.ts              # Utilitaires d'authentification
│   ├── monitoring.ts        # Stub monitoring (à configurer)
│   └── utils.ts             # Utilitaires (shadcn)
├── providers/
│   ├── auth-provider.tsx    # Provider d'authentification
│   └── query-provider.tsx   # Provider TanStack Query
├── types/
│   └── api.ts               # Types TypeScript pour l'API
└── middleware.ts            # Middleware Next.js
```

## 🔐 Authentification

L'authentification est gérée en mémoire pour cette V1 :
- **Access token** stocké en mémoire (React state)
- **Pas de refresh token** pour l'instant
- En cas d'erreur 401, l'utilisateur est redirigé vers `/login`
- Protection des routes `/admin/*` côté client (via AuthProvider)

### Prochaines étapes
- Ajouter un refresh token avec cookie HTTP-only
- Implémenter un refresh automatique
- Ajouter une protection côté serveur dans le middleware

## 📦 Modules Fonctionnels

### 1. Module Clubs
- **Liste** : `/admin/clubs` - Table avec recherche et pagination
- **Détail** : `/admin/clubs/[id]` - Visualisation et édition de club
- Champs éditables : statut, visibilité, nombre de courts

### 2. Module KPI
- **Dashboard** : `/admin/kpi` - Métriques et statistiques
- Métriques affichées :
  - Matchs créés (24h)
  - Temps moyen de matchmaking
  - Utilisateurs actifs
  - Taux de succès

### 3. Matchmaking Lab
- **Page** : `/admin/matchmaking/lab`
- **Player Factory** : Créer des joueurs de test (manuels ou aléatoires)
- **Queue Control** : Inscrire des joueurs dans la file de matchmaking
- **Algo Runner** : Lancer l'algorithme et visualiser les logs

## 🔗 API Backend

### Configuration
Définir l'URL du backend dans `.env.local` :
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### Endpoints Attendus

Le client API est prêt pour se connecter aux endpoints suivants :

#### Auth
- `POST /auth/admin/login` - Connexion admin
- `POST /auth/admin/logout` - Déconnexion

#### Clubs
- `GET /admin/clubs` - Liste des clubs (pagination, recherche)
- `GET /admin/clubs/:id` - Détail d'un club
- `PATCH /admin/clubs/:id` - Mise à jour d'un club

#### KPIs
- `GET /admin/kpis` - Récupération des métriques

#### Matchmaking
- `POST /admin/matchmaking/test-players` - Créer un joueur de test
- `GET /admin/matchmaking/test-players` - Liste des joueurs de test
- `POST /admin/matchmaking/test-players/:id/enqueue` - Inscrire en file
- `POST /admin/matchmaking/run` - Lancer le matchmaking
- `GET /admin/matchmaking/runs/:id` - Détails d'un run
- `GET /admin/matchmaking/runs/:id/logs` - Logs d'un run

### Données Mockées

**Important** : Pour l'instant, tous les modules utilisent des **données mockées** côté front pour permettre de tester l'UI sans backend.

Les hooks (dans `hooks/`) contiennent des commentaires `TODO` indiquant où remplacer les mocks par les vrais appels API.

## 🎨 Développement

### Ajouter un Composant shadcn/ui

```bash
npx shadcn@latest add [component-name]
```

### Linting

```bash
npm run lint
```

### Build

```bash
npm run build
```

## 🚢 Déploiement sur Vercel

1. Connecter le repository GitHub à Vercel
2. Configurer les variables d'environnement :
   - `NEXT_PUBLIC_API_URL` : URL du backend en production
3. Déployer automatiquement à chaque push

## 📝 Notes Importantes

### V1 - Ce qui est implémenté
- ✅ Authentification simple (access token en mémoire)
- ✅ Squelettes fonctionnels de tous les modules
- ✅ Client API structuré et typé
- ✅ Hooks TanStack Query prêts à brancher
- ✅ Données mockées pour tester l'UI
- ✅ Layout admin avec sidebar et navigation

### V1 - Ce qui n'est PAS implémenté
- ❌ Tests (unitaires, E2E)
- ❌ Analytics / Monitoring (Sentry, PostHog, etc.)
- ❌ Refresh tokens automatiques
- ❌ Validation côté serveur dans le middleware
- ❌ Persistance des données (tout est mocké)

### Prochaines Itérations
1. Brancher les vrais endpoints backend
2. Implémenter le refresh token avec cookies HTTP-only
3. Ajouter Sentry pour le monitoring des erreurs
4. Ajouter des validations plus poussées
5. Tests E2E avec Playwright
6. Améliorer l'UX (toasts, confirmations, etc.)

## 🤝 Contribution

Ce projet est un outil interne. Suivez les conventions :
- TypeScript strict mode activé
- ESLint + Prettier configurés
- Commits descriptifs
- Pas de push force sur main

## 📄 Licence

Projet interne PadelMate - Tous droits réservés.
