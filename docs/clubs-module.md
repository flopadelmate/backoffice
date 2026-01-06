# Module Clubs - Documentation Technique

## Vue d'ensemble

Le module clubs permet la gestion des clubs de padel avec deux pages principales : liste avec filtrage/tri/pagination et détail avec édition.

**Stack :**
- Next.js 15 App Router (client components)
- TanStack Query v5 (data fetching & cache)
- TypeScript strict mode
- shadcn/ui + Tailwind CSS

**Architecture :**
```
Backend API (Spring)
  ↓
ApiClient (lib/api-client.ts)
  ↓
Custom Hooks (hooks/use-clubs.ts)
  ↓
Page Components
  ↓
Section Components (détail seulement)
```

---

## Page Liste (`/admin/clubs`)

### Features

**Filtering (4 critères) :**
- Nom du club (texte libre)
- Département (texte libre)
- Système de réservation (enum : GESTION_SPORTS, DOIN_SPORT, TENUP)
- Vérifié (boolean tristate : tous/oui/non)

**Sorting (5 colonnes) :**
- Nom, Nombre de favoris, Nombre de matchs, Dernière mise à jour admin, Dernier scraping

**Pagination :**
- 0-indexed (Spring compatible)
- Tailles : 20, 50, 100 résultats/page

**UX :**
- Filtres appliqués via bouton "Appliquer" (pas de live search)
- Bouton "Réinitialiser" si filtres actifs
- Enter key submit sur les inputs
- Clic sur ligne → navigation vers détail

### URL-Driven State Pattern

L'URL est la single source of truth. Tout l'état (filtres, tri, pagination) est stocké dans les query params.

**Flow :**
```
URL Query Params (searchParams)
  ↓
parseUrlParams() → useState
  ↓
useEffect() sync bidirectionnelle
  ↓
replaceUrl() / pushUrl() → Next.js router
```

**États distincts :**
- **Input states** : valeurs des champs (avant validation)
- **Applied states** : filtres envoyés à l'API
- **Pagination/Sort states** : page, size, sortBy, sortDir

**Exemple :**
```typescript
// URL → State
useEffect(() => {
  const parsed = parseUrlParams(searchParams);
  setCurrentPage(parsed.page);
  setPageSize(parsed.size);
  // ...
}, [searchParams.toString()]);

// State → URL
const handleApplyFilters = () => {
  const url = buildUrlString({
    page: 0, // reset page
    size: pageSize,
    name: inputName,
    // ...
  });
  router.replace(url); // pas d'entrée historique
};
```

**Fonctions utilitaires :**
- `parseUrlParams()` : parsing + validation robuste (whitelist, clamp, enum check)
- `buildUrlString()` : construction sans params par défaut (URL propre)

**Navigation :**
- `replaceUrl()` pour actions sans historique (tri, changement taille page)
- `pushUrl()` pour pagination (permet back/forward browser)

### Data Flow

```
User Action (filter/sort/paginate)
  ↓
Handler function
  ↓
Update URL (router.replace/push)
  ↓
useEffect() détecte changement searchParams
  ↓
Update states → useClubs() réagit (queryKey change)
  ↓
apiClient.getClubs(params) → Backend
  ↓
TanStack Query cache → Re-render
```

---

## Page Détail (`/admin/clubs/[id]`)

### Draft/Original Diffing Pattern

Deux copies de l'état : `originalDraft` (backend) + `draft` (édité), avec diffing en temps réel.

**États globaux :**
```typescript
const [originalDraft, setOriginalDraft] = useState<ClubBackofficeDetailDto | null>(null);
const [draft, setDraft] = useState<ClubBackofficeDetailDto | null>(null);
const [isSaving, setIsSaving] = useState(false);
const [geoIsInvalid, setGeoIsInvalid] = useState(false);

// Compute diff
const changes = useMemo(() =>
  computeChanges(originalDraft, draft),
  [originalDraft, draft]
);
const isDirty = Object.keys(changes).length > 0;
```

**Cycle de vie :**
1. **Hydratation** : `useClub()` → `setOriginalDraft()` + `setDraft()`
2. **Édition** : sections appellent `updateDraft()` → modifie `draft` uniquement
3. **Diffing** : `useMemo` calcule `changes` (deep comparison)
4. **Save** : `updateClub.mutateAsync({ id, data: changes })` → sync backend
5. **Cancel** : `setDraft(originalDraft)` (rollback sans refetch)

**Avantages :**
- ✅ Granular updates : seuls les champs modifiés sont envoyés
- ✅ Dirty state detection : indicateur visuel temps réel
- ✅ Validation before save : `isDirty && !geoIsInvalid && !isSaving`
- ✅ Cancel instantané sans refetch

### Features

**Champs éditables (12) :**
- Nom, Vérifié, URL réservation, Système réservation, Téléphone, Site web
- Adresse (rue, code postal, ville)
- GPS (latitude, longitude avec validation)
- Photo principale (clic galerie)
- Notes admin

**Champs read-only :**
- KPIs (Note Google, Favoris, Matchs, Public ID)
- Horaires d'ouverture (table)
- Terrains (liste avec badges)
- Métadonnées (ID interne, lastAdminUpdateAt, lastScrapedAt)

**UX :**
- **Sticky buttons** : affichés uniquement si `isDirty`, position fixe top-right
- **Validation GPS** : bordure rouge + message + disable save si invalide
- **Back button** : `router.back()` pour préserver filtres liste
- **Toast notifications** : succès/erreur après save

### Architecture Modulaire

5 sections indépendantes :

| Section | Fichier | Éditable | Responsabilité |
|---------|---------|----------|----------------|
| Header | `club-header.tsx` | Partiel | Nom, vérifié, réservation, KPIs |
| Contact | `club-info-contact.tsx` | Full | Contact, adresse, GPS + validation |
| Exploitation | `club-exploitation.tsx` | Non | Horaires ouverture |
| Terrains | `club-courts.tsx` | Non | Liste terrains |
| Photos/Admin | `club-photos-admin.tsx` | Partiel | Photos, notes, métadonnées |

**Pattern de communication :**
```typescript
// Page (orchestrateur)
<ClubHeader
  draft={draft}
  onUpdate={updateDraft}
  inputClassName={EDITABLE_INPUT_CLASS}
/>

// Section
type Props = {
  draft: ClubBackofficeDetailDto;
  onUpdate: (updates: Partial<ClubBackofficeDetailDto>) => void;
  inputClassName: string;
};

const handleChange = (e) => {
  onUpdate({ name: e.target.value });
};
```

**Validation GPS (cas d'école) :**
```typescript
// Section club-info-contact.tsx
const [latInput, setLatInput] = useState(String(draft.latitude));
const handleLatChange = (e) => {
  setLatInput(value);
  const num = parseFloat(value);
  if (!isNaN(num)) {
    onUpdate({ latitude: num });
    onGeoValidationChange(isNaN(parseFloat(lngInput)));
  } else {
    onGeoValidationChange(true); // Invalid → remonte au parent
  }
};
```

### Data Flow

```
useClub() → Hydratation originalDraft + draft
  ↓
User édite → Section appelle updateDraft()
  ↓
setDraft(prev => ({ ...prev, ...updates }))
  ↓
useMemo() → changes = computeChanges()
  ↓
isDirty = true → sticky buttons visible
  ↓
User clique "Enregistrer"
  ↓
updateClub.mutateAsync({ id, changes })
  ↓
Backend PUT → Response sync
  ↓
setOriginalDraft + setDraft (sync)
  ↓
invalidateQueries → Refetch liste
  ↓
Toast success → isDirty = false
```

---

## Hooks & API (`hooks/use-clubs.ts`)

### Hooks Exposés

| Hook | Type | Query Key | Retour |
|------|------|-----------|--------|
| `useClubs(params)` | `useQuery` | `["clubs", params]` | `SpringPage<ClubBackofficeListDto>` |
| `useClub(id)` | `useQuery` | `["club", id]` | `ClubBackofficeDetailDto` |
| `useUpdateClub()` | `useMutation` | - | `Promise<ClubBackofficeDetailDto>` |

### API Client

**Méthodes :**
```typescript
// GET /backoffice/clubs?page=0&size=20&sortBy=name&...
apiClient.getClubs(params?: GetClubsParams): Promise<SpringPage<...>>

// GET /backoffice/clubs/:id
apiClient.getClub(id: number): Promise<ClubBackofficeDetailDto>

// PUT /backoffice/clubs/:id
apiClient.updateClub(id: number, data: ClubBackofficeUpdateDto): Promise<...>
```

### Cache Invalidation

```typescript
useMutation({
  mutationFn: ({ id, data }) => apiClient.updateClub(id, data),
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ["clubs"] }); // Liste
    queryClient.invalidateQueries({ queryKey: ["club", variables.id] }); // Détail
  },
});
```

**Implications :**
- ✅ Liste se rafraîchit automatiquement après édition
- ✅ Cohérence cache garantie
- ⚠️ Pas d'optimistic update (choix simplicité V1)

---

## Types Backend (`types/api.ts`)

### DTOs

| Type | Usage | Particularités |
|------|-------|----------------|
| `ClubBackofficeListDto` | Liste paginée | `id`, `name`, `verified`, `favoriteCount`, `matchCount`, timestamps |
| `ClubBackofficeDetailDto` | Détail complet | Tous champs + `address`, `geo`, `openingHours`, `courts`, `photoUrls` |
| `ClubBackofficeUpdateDto` | Payload PUT | **Partial** de tous les champs éditables |

### Types Auxiliaires

```typescript
type ReservationSystem = "GESTION_SPORTS" | "DOIN_SPORT" | "TENUP";

interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 0-indexed
  size: number;
}

interface GetClubsParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  name?: string;
  department?: string;
  verified?: boolean;
  reservationSystem?: ReservationSystem;
  minFavoriteCount?: number;
  minMatchCount?: number;
}
```

### Mapping Backend ↔ Frontend

**Particularités :**
- **Geo** : `latitude`/`longitude` (frontend) → `geo: { latitude, longitude }` (backend)
- **ReservationSystem undefined** : frontend mappe "NONE" ↔ undefined
- **Photo URLs** : normalisation `https://` si manquant (`club-photos-admin.tsx`)
- **Dates** : ISO strings parsées via `new Date()`

**Fonction de diffing :**
```typescript
export function computeChanges(
  original: ClubBackofficeDetailDto,
  current: ClubBackofficeDetailDto
): ClubBackofficeUpdateDto {
  const changes: Partial<ClubBackofficeUpdateDto> = {};

  // Compare field by field
  if (original.name !== current.name) changes.name = current.name;
  // ...

  // Geo mapping
  if (original.latitude !== current.latitude ||
      original.longitude !== current.longitude) {
    changes.geo = {
      latitude: current.latitude,
      longitude: current.longitude
    };
  }

  return changes as ClubBackofficeUpdateDto;
}
```

---

## Patterns Techniques

### 1. URL-Driven State (Liste)

**Principe :** URL = single source of truth

**Avantages :**
- ✅ Deep linking (partage URL avec filtres)
- ✅ Browser back/forward
- ✅ Refresh preserve l'état

**Implémentation :**
- `parseUrlParams()` : validation + defaults
- `buildUrlString()` : omit defaults (URL propre)
- `useEffect()` sync unidirectionnelle

### 2. Draft/Original Diffing (Détail)

**Principe :** Deux états (original + draft), diffing en temps réel

**Avantages :**
- ✅ Granular updates
- ✅ Dirty state detection
- ✅ Cancel sans refetch

**Implémentation :**
- `useState` × 2
- `useMemo` pour changes
- `computeChanges()` deep comparison

### 3. Component Composition (Détail)

**Principe :** Page orchestrateur + sections spécialisées

**Avantages :**
- ✅ Séparation responsabilités
- ✅ Testabilité
- ✅ Maintenabilité

**Implémentation :**
- Props drilling : `draft`, `onUpdate`, `inputClassName`
- Callbacks validation : `onGeoValidationChange`

### 4. TanStack Query Cache

**Principe :** Cache centralisé avec invalidation auto

**Configuration :**
- `queryKey` avec params : `["clubs", { page, size, ... }]`
- `enabled` conditionnel : `enabled: !!id`
- `invalidateQueries` après mutation

---

## Composants UI Utilisés

**shadcn/ui :**
- Layout : `Card`, `CardHeader`, `CardTitle`, `CardContent`
- Data display : `Table`, `Badge`
- Forms : `Input`, `Textarea`, `Label`, `Select`, `Switch`, `Button`
- Icons (lucide-react) : `ArrowUpDown`, `ArrowUp`, `ArrowDown`, `Filter`, `X`, `Star`, `Heart`, `Trophy`, `ExternalLink`, `MapPin`

**Next.js :**
- `Image` (optimisation avec `fill`, `sizes`, `object-cover`)
- `useRouter`, `useSearchParams`, `useParams`

**Utilities :**
- `cn()` (classnames conditional)
- Design tokens Tailwind cohérents

---

## Limites & Évolutions

**Limites V1 :**
- ⚠️ Pas d'optimistic updates (spinner pendant mutation)
- ⚠️ Champs read-only (openingHours, courts) faute d'endpoints
- ⚠️ Validation côté client uniquement (GPS)

**Évolutions V2 :**
- Optimistic updates avec rollback
- Formulaires complexes avec react-hook-form + zod
- Infinite scroll vs pagination
- Editable tables si endpoints disponibles
