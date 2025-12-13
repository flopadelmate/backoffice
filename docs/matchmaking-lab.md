# Documentation: Matchmaking Lab

## 1. Vue d'ensemble

Le **Matchmaking Lab** est une interface d'administration pour tester l'algorithme de matchmaking de PadelMate. Il permet de:
- Créer des joueurs de test
- Composer des équipes 2v2
- Inscrire des joueurs dans la queue de matchmaking
- Exécuter l'algorithme et visualiser les résultats

**Page principale:** `app/admin/matchmaking/lab/page.tsx`

---

## 2. Architecture des fichiers

```
app/admin/matchmaking/lab/
└── page.tsx                              # Page racine avec onglets

components/matchmaking/
├── player-factory.tsx                    # Formulaire création joueurs
├── player-base.tsx                       # Table des joueurs
├── queue-control.tsx                     # Gestion queue (composant majeur ~460 lignes)
├── algo-runner.tsx                       # Lancement algo + résultats
├── player-slot.tsx                       # Avatar joueur éditable
├── player-selection-modal.tsx            # Modal sélection joueur
├── team-composition-widget.tsx           # Gestionnaire équipe 2v2
└── results/
    ├── matchmaking-results.tsx           # Container résultats
    ├── match-card.tsx                    # Carte match créé (vert)
    ├── unmatched-group-card.tsx          # Carte groupe non matché (rouge)
    ├── expired-group-card.tsx            # Carte groupe expiré (orange)
    ├── report-summary-cards.tsx          # KPIs + toggle debug
    ├── player-slot-readonly.tsx          # Avatar lecture seule
    └── debug/
        ├── match-debug-panel.tsx         # Debug info match
        └── unmatched-debug-panel.tsx     # Debug info non-matché

hooks/
└── use-matchmaking.ts                    # Tous les hooks (~560 lignes)

lib/
└── matchmaking-report-utils.ts           # Transformation rapport → ViewModel

types/api.ts                              # Types TypeScript matchmaking
```

---

## 3. Structure de la page

### 3.1 Onglets principaux

La page utilise un système d'onglets (`Tabs` de shadcn/ui):

| Onglet | Composants | Fonction |
|--------|------------|----------|
| **Gestion joueurs** | `PlayerFactory` + `PlayerBase` | Créer et gérer les joueurs de test |
| **Matchmaking** | `QueueControl` + `AlgoRunner` | Inscrire, configurer et lancer l'algo |

### 3.2 Schéma visuel

```
┌─────────────────────────────────────────────────────────────┐
│                 Matchmaking Lab (page.tsx)                   │
│                                                              │
│ ┌──────────────────────┬────────────────────────────────┐   │
│ │  Gestion joueurs     │     Matchmaking                 │   │
│ ├──────────────────────┼────────────────────────────────┤   │
│ │ ┌──────────────────┐ │ ┌────────────────────────────┐ │   │
│ │ │ PlayerFactory    │ │ │ QueueControl               │ │   │
│ │ │ Formulaire       │ │ │ • Table joueurs            │ │   │
│ │ │ Créer joueur     │ │ │ • Tolérance                │ │   │
│ │ └──────────────────┘ │ │ • Compositions équipe      │ │   │
│ │                      │ │ • Disponibilités           │ │   │
│ │ ┌──────────────────┐ │ │ • Actions inscription      │ │   │
│ │ │ PlayerBase       │ │ └────────────────────────────┘ │   │
│ │ │ Table joueurs    │ │                                │   │
│ │ │ + suppression    │ │ ┌────────────────────────────┐ │   │
│ │ └──────────────────┘ │ │ AlgoRunner                 │ │   │
│ │                      │ │ • Compteur joueurs en file │ │   │
│ │                      │ │ • Heure exécution          │ │   │
│ │                      │ │ • Bouton Lancer            │ │   │
│ │                      │ │ • Résultats (3 onglets)    │ │   │
│ │                      │ └────────────────────────────┘ │   │
│ └──────────────────────┴────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Onglet "Gestion joueurs"

### 4.1 PlayerFactory (Création de joueurs)

**Fichier:** `components/matchmaking/player-factory.tsx`

**Fonctionnalités:**
- Formulaire avec validation Zod
- Champs: Nom, PMR (0.1-9.0), Côté préféré (Gauche/Droite/Les deux)
- Génération aléatoire du nom (si champ vide)
- Support décimal avec virgule ou point

**Hook utilisé:** `useCreatePlayer()`

**API:** `POST /backoffice/players`

**Validation PMR:**
```typescript
pmr: z.number().min(0.1).max(9.0)
preferredCourtPosition: z.enum(["LEFT", "RIGHT", "BOTH"])
```

### 4.2 PlayerBase (Liste des joueurs)

**Fichier:** `components/matchmaking/player-base.tsx`

**Fonctionnalités:**
- Table avec 4 colonnes: Nom, Niveau PMR, Côté, Actions
- Bouton supprimer pour chaque joueur
- Affichage état de chargement

**Hooks utilisés:** `usePlayers()`, `useDeletePlayer()`

**API:** `GET /backoffice/players`, `DELETE /backoffice/players/{publicId}`

---

## 5. Onglet "Matchmaking"

### 5.1 QueueControl (Gestion de la queue)

**Fichier:** `components/matchmaking/queue-control.tsx` (~460 lignes)

C'est le **composant le plus complexe** de la page.

#### 5.1.1 Colonnes de la table

| Colonne | Description | Éditable |
|---------|-------------|----------|
| Nom | Nom du joueur | Non |
| Niveau | PMR du joueur | Non |
| Côté | Préférence de position | Non |
| Tolérance | Écart de niveau accepté (±0.25, ±0.5, ±1, ±2, Tout) | Oui |
| Groupe | Composition équipe 2v2 | Oui (si owner) |
| Disponibilité | Fenêtre horaire start/end | Oui |
| Statut | En file / Hors file | - |
| Actions | Inscrire / Update / Quitter | Oui |

#### 5.1.2 Pattern "Server State + Draft State"

Ce composant utilise un pattern sophistiqué pour gérer les modifications locales tout en synchronisant avec le backend:

```
Backend (source vérité) ←── Poll 7s
         ↓
editStateByGroupId[groupId] = {
  draft: GroupDraft,      // Modifications locales
  dirty: boolean,         // Utilisateur a modifié?
  awaitingAck: boolean    // Attente confirmation backend
}
```

**Règles de synchronisation:**
- Si `dirty=false` et `awaitingAck=false`: sync depuis backend → draft
- Si `dirty=true`: garde le draft local (utilisateur modifie)
- Si `awaitingAck=true`: ne pas écraser (attente réponse PUT)

**Flux:**
```
Utilisateur modifie → dirty=true
     ↓
Click "Update" → PUT API → awaitingAck=true, dirty=false
     ↓
Poll détecte changement backend → awaitingAck=false
     ↓
Sync backend → draft (si pas dirty)
```

#### 5.1.3 Composition d'équipe (TeamCompositionWidget)

**Fichier:** `components/matchmaking/team-composition-widget.tsx`

**Layout visuel:**
```
[Joueur A] [Coéquipier B]  VS  [Adversaire C] [Adversaire D]
   Owner      Teammate          Opponent 1      Opponent 2
```

**Slots:**
- **Slot A:** Joueur principal (owner, non modifiable)
- **Slots B, C, D:** Sélectionnables via `PlayerSelectionModal`

**Contraintes:**
- Un joueur ne peut être que dans UNE seule composition
- Un joueur déjà en queue ne peut pas être ajouté comme coéquipier
- Seul le owner (créateur de la composition) peut la modifier
- Les joueurs "bloqués" (utilisés ailleurs) sont grisés

**Fichiers associés:**
- `player-slot.tsx` - Avatar éditable avec boutons +/×
- `player-selection-modal.tsx` - Dialog de sélection avec recherche

#### 5.1.4 Actions disponibles

| Action | Condition | API |
|--------|-----------|-----|
| **Inscrire** | Joueur hors file + pas dans compo d'un autre | `POST /backoffice/matchmaking/queue` |
| **Update** | dirty=true (groupe modifié) | `PUT /backoffice/matchmaking/queue/{groupId}` |
| **Quitter** | Joueur en file | `DELETE /backoffice/matchmaking/queue/{groupId}` |

### 5.2 AlgoRunner (Exécution de l'algorithme)

**Fichier:** `components/matchmaking/algo-runner.tsx`

**Fonctionnalités:**
- Compteur de joueurs actuellement en file
- Input heure d'exécution (format HH:mm, défaut: maintenant)
- Bouton "Lancer le matchmaking" avec spinner de chargement
- Affichage des résultats après exécution

**Hook utilisé:** `useRunMatchmaking()`

**API:** `POST /backoffice/matchmaking/run`

**Validation:** Minimum 1 joueur doit être enqueued pour lancer

**Détection format résultat:**
```typescript
// Format complet (avec phases debug)
if (isMatchmakingReport(result)) {
  // Affiche MatchmakingResults
}
// Format simplifié (legacy)
else {
  // Affiche simple message succès
}
```

---

## 6. Affichage des résultats

### 6.1 Structure des résultats

Après exécution, les résultats sont affichés dans **3 onglets** via `MatchmakingResults`:

| Onglet | Couleur | Composant | Contenu |
|--------|---------|-----------|---------|
| **Matchs créés** | Vert | `MatchCard` | Matchs générés par l'algo |
| **Non matchés** | Rouge | `UnmatchedGroupCard` | Groupes sans match trouvé |
| **Expirés** | Orange | `ExpiredGroupCard` | Groupes dont la fenêtre a expiré |

### 6.2 ReportSummaryCards (KPIs)

**Fichier:** `components/matchmaking/results/report-summary-cards.tsx`

Affiche **6 métriques** en grille:
1. **Groupes traités** (bleu) - `summary.groupsProcessed`
2. **Matchs créés** (vert) - `summary.matchesCreated`
3. **Joueurs matchés** (vert) - `summary.playersMatched`
4. **Joueurs non matchés** (rouge) - `summary.playersUnmatched`
5. **Groupes expirés** (orange) - `summary.groupsExpired`
6. **Durée exécution** (violet) - `meta.durationMs`

**Header:**
- Run ID (copie clipboard au clic)
- Date/heure exécution
- **Toggle Debug Mode** pour afficher les panneaux de détails

### 6.3 MatchCard (Match créé)

**Fichier:** `components/matchmaking/results/match-card.tsx`

**Styling:** Bordure verte, fond `bg-green-50`

**Contenu affiché:**
- **Header:** Club + date/heure + Court ID + Status badge
- **Équipes:** Layout 2v2 avec avatars (`PlayerSlotReadOnly`)
- **Stats:** PMR moyen équipe 1/2, Qualité, Score
- **Info:** Capitaine désigné
- **Debug:** Accordion `MatchDebugPanel` (si mode debug activé)

### 6.4 UnmatchedGroupCard (Non matché)

**Fichier:** `components/matchmaking/results/unmatched-group-card.tsx`

**Styling:** Bordure rouge, fond `bg-red-50`

**Contenu affiché:**
- **Header:** "Groupe non matché" + type badge
- **Joueurs:** Jusqu'à 4 slots (avec remplissage slots vides)
- **Raison:** Explication du non-match
- **Infos:** Fenêtre horaire, clubs acceptés, ID groupe
- **Debug:** Accordion `UnmatchedDebugPanel` (si mode debug activé)

### 6.5 ExpiredGroupCard (Expiré)

**Fichier:** `components/matchmaking/results/expired-group-card.tsx`

**Styling:** Bordure orange, fond `bg-orange-50`

**Contenu affiché:**
- **Header:** Type badge + créateur
- **Raison:** Explication de l'expiration
- **Timestamp:** Date/heure d'expiration

### 6.6 Panneaux Debug

Les panneaux debug (`MatchDebugPanel`, `UnmatchedDebugPanel`) affichent des informations techniques sur le processus de matching:

- **Buckets:** Slots générés (ID, club, horaire, type)
- **Candidats:** Liste des candidats évalués avec scores
- **Vérifications:** Checks de compatibilité (PMR, créneaux)
- **Rejections:** Raisons de rejet avec groupes affectés

---

## 7. Hooks et gestion d'état

### 7.1 État local module-scope

Le fichier `hooks/use-matchmaking.ts` utilise des variables au niveau module (persist entre re-renders mais pas entre rechargements):

```typescript
// Tolérance pré-inscription (avant d'être enqueued)
PLAYER_TOLERANCE: Map<publicId, number>

// Compositions d'équipe [coéquipier, adversaire1, adversaire2]
PLAYER_TEAM_COMPOSITION: Record<publicId, [string | null, string | null, string | null]>

// Disponibilités temporelles
MOCK_PLAYER_AVAILABILITY: Record<publicId, { start: string; end: string }>
```

### 7.2 Hooks principaux

| Hook | Rôle | Polling |
|------|------|---------|
| `usePlayers()` | Liste joueurs + état UI enrichi | Via queue |
| `useMatchmakingQueue()` | Groupes en queue | **7 secondes** |
| `useCreatePlayer()` | Mutation création joueur | - |
| `useDeletePlayer()` | Mutation suppression joueur | - |
| `useEnqueuePlayer()` | Mutation inscription queue | - |
| `useDequeuePlayer()` | Mutation retrait queue | - |
| `useUpdateMatchmakingGroup()` | Mutation update groupe | - |
| `useRunMatchmaking()` | Mutation lancement algo | - |
| `usePlayerAvailability()` | Gestion disponibilités | - |
| `usePlayerTeamComposition()` | Gestion compositions | - |
| `usePlayersInCompositions()` | Dérivation joueurs bloqués | - |

### 7.3 Type enrichi PlayerWithUIState

Le hook `usePlayers()` enrichit les données backend avec l'état UI:

```typescript
interface PlayerWithUIState extends Player {
  tolerance: number | null;              // Tolérance locale (pré-inscription)
  isEnqueued: boolean;                   // Dérivé de la queue backend
  enqueuedGroupPublicId: string | null;  // ID du groupe si en queue
  teamComposition?: [string | null, string | null, string | null];
}
```

### 7.4 Helpers importants

| Fonction | Rôle |
|----------|------|
| `buildEnqueuePayload()` | Construit le DTO d'inscription depuis l'état UI |
| `buildEnqueuedPlayerSet()` | Dérive Set des joueurs en queue |
| `buildPlayerToGroupMap()` | Mappe joueur → groupId |
| `getPlayersInCompositions()` | Identifie joueurs "bloqués" |
| `cleanPlayerFromCompositions()` | Nettoie joueur de toutes les compos |
| `roundToNext30Min()` | Arrondit datetime au slot 30min |

---

## 8. API Endpoints utilisés

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| GET | `/backoffice/players` | Liste des joueurs |
| POST | `/backoffice/players` | Créer un joueur |
| DELETE | `/backoffice/players/{publicId}` | Supprimer un joueur |
| GET | `/backoffice/matchmaking/queue` | Liste des groupes en queue (poll 7s) |
| POST | `/backoffice/matchmaking/queue` | Inscrire un joueur |
| PUT | `/backoffice/matchmaking/queue/{publicId}` | Mettre à jour un groupe |
| DELETE | `/backoffice/matchmaking/queue/{publicId}` | Retirer un groupe |
| POST | `/backoffice/matchmaking/run` | Lancer l'algorithme |

---

## 9. Payload d'inscription (buildEnqueuePayload)

Quand un joueur clique "Inscrire", le payload suivant est construit:

```typescript
{
  clubPublicIds: string[];       // Clubs favoris du joueur
  timeWindowStart: string;       // ISO 8601 (ex: "2024-12-12T14:30:00Z")
  timeWindowEnd: string;         // ISO 8601
  slotA: { playerPublicId };     // Joueur principal (obligatoire)
  slotB?: { playerPublicId };    // Coéquipier (optionnel)
  slotC?: { playerPublicId };    // Adversaire 1 (optionnel)
  slotD?: { playerPublicId };    // Adversaire 2 (optionnel)
  teammateTol: number;           // Tolérance (0.25 à 10)
}
```

**Valeurs de tolérance:**
- `0.25` - Très restrictif
- `0.5` - Restrictif (défaut)
- `1` - Modéré
- `2` - Large
- `10` - "Tout niveau" (affiche "Tout" dans l'UI)

---

## 10. Flux utilisateur complet

```
1. CRÉER JOUEURS (Onglet "Gestion joueurs")
   └─> PlayerFactory → POST /backoffice/players
   └─> Joueurs apparaissent dans PlayerBase

2. COMPOSER ÉQUIPES (Onglet "Matchmaking")
   └─> QueueControl → TeamCompositionWidget
   └─> Sélectionner coéquipiers via PlayerSelectionModal
   └─> Slots B, C, D remplis (optionnel)

3. CONFIGURER INSCRIPTION
   └─> Sélectionner tolérance (±0.25 à Tout)
   └─> Définir fenêtre horaire (start/end via DateTimePicker)

4. INSCRIRE À LA QUEUE
   └─> Bouton "Inscrire" → POST /backoffice/matchmaking/queue
   └─> Joueur passe en statut "En file" (badge vert)
   └─> Poll backend toutes les 7s synchronise l'état

5. MODIFIER SI NÉCESSAIRE
   └─> Changer tolérance/disponibilité → draft local (dirty=true)
   └─> Bouton "Update" apparaît → PUT /backoffice/matchmaking/queue/{id}
   └─> awaitingAck=true jusqu'à confirmation backend

6. LANCER L'ALGORITHME
   └─> AlgoRunner → Choisir heure d'exécution
   └─> Bouton "Lancer" → POST /backoffice/matchmaking/run
   └─> Spinner pendant l'exécution

7. ANALYSER RÉSULTATS
   └─> MatchmakingResults avec 3 onglets
   └─> ReportSummaryCards affiche 6 KPIs
   └─> Activer mode Debug pour informations détaillées
   └─> Parcourir matchs créés, non-matchés, expirés
```

---

## 11. Composants UI (shadcn/ui)

| Composant | Usage |
|-----------|-------|
| `Tabs` | Navigation onglets principaux |
| `Card` | Containers de sections |
| `Table` | Listes joueurs/queue |
| `Button` | Actions (Inscrire, Update, Quitter, Lancer) |
| `Input` | Formulaires (nom, heure) |
| `Select` | Dropdown tolérance |
| `Dialog` | Modal sélection joueur |
| `Badge` | Statuts et labels (En file, PMR, type groupe) |
| `Accordion` | Panels debug (expansibles) |
| `Alert` | Avertissements (divergence données) |
| `DateTimePicker` | Fenêtre horaire (custom) |

---

## 12. Points techniques importants

### 12.1 Gestion du polling
- Queue refresh automatique toutes les **7 secondes**
- Pattern `awaitingAck` évite écrasement des données locales après PUT
- Désactivé si utilisateur non authentifié

### 12.2 Compositions d'équipe
- Un joueur = une seule composition maximum
- Owner (slot A) peut modifier, autres non
- Joueurs déjà enqueued non disponibles pour sélection
- Hook `usePlayersInCompositions()` track les joueurs "bloqués"

### 12.3 Tolérance (teammateTol)
- **Pré-inscription:** `preEnqueueTolByPlayerId` (state local React)
- **Post-inscription:** dans le groupe backend, éditable via draft
- Valeurs: 0.25, 0.5, 1, 2, 10 (Tout)
- Défaut: 0.5

### 12.4 Transformation des résultats
- `transformReportToViewModel()` dans `lib/matchmaking-report-utils.ts`
- Supporte format legacy (simple) et nouveau (avec phases debug)
- Extrait matches créés, groupes non-matchés, groupes expirés
- Backend = source de vérité pour les KPIs (pas de recalcul UI)

### 12.5 Disponibilités
- Stockées dans `MOCK_PLAYER_AVAILABILITY` (module scope)
- Défaut: maintenant+2h → maintenant+10h (arrondi 30min)
- Validation: end > start, minimum 90 minutes d'écart
- Format ISO 8601 pour l'API

---

## 13. Iconographie (Lucide React)

| Icône | Contexte |
|-------|----------|
| `UserPlus` | Créer joueur (PlayerFactory) |
| `Database` | Base joueurs (PlayerBase) |
| `ListTodo` | Gestion queue (QueueControl) |
| `Play` / `PlayCircle` | Lancer / Inscrire |
| `Clock` | Temps / durée |
| `Trash2` | Supprimer joueur |
| `Plus` / `X` | Ajouter/retirer slot |
| `Search` | Recherche modal |
| `MapPin` | Club/lieu |
| `Calendar` | Date |
| `Trophy` | Score |
| `Eye` | Voir debug |
| `UserX` | Groupe non matché |
| `AlertTriangle` | Avertissement |
| `Bug` | Toggle debug |
| `Users` / `CheckCircle` | KPIs |

---

## 14. Limitations actuelles (V1)

- **État UI en mémoire:** Les compositions et disponibilités sont perdues au rechargement
- **Pas de persistance locale:** Prévu pour être remplacé par endpoints backend
- **Logs matchmaking:** Hook `useMatchmakingLogs()` utilise des mocks (API non implémentée)
- **Mode debug:** Toggle non persistent (reset à chaque affichage)
