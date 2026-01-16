# API Backoffice - Modifications (branche `backoffice-improvements`)

## Résumé des changements

### 1. Séparation du système de réservation
Les informations du système de réservation ont été **retirées** de l'endpoint club principal et déplacées vers un endpoint dédié.

### 2. Gestion des clés externes
Nouveaux endpoints pour gérer les clés externes (DoInSport, TenUp, Google) d'un club.

---

## Endpoints modifiés

### `GET /backoffice/clubs/{id}`

**Champs supprimés de la réponse :**
```diff
- "reservationSystem": "TENUP",
- "backendUrl": "https://...",
- "frontendUrl": "https://..."
```

### `PUT /backoffice/clubs/{id}`

**Champs supprimés du body :**
```diff
- "reservationSystem": "TENUP",
- "backendUrl": "https://...",
- "frontendUrl": "https://..."
```

---

## Nouveaux endpoints

### Système de réservation

#### `GET /backoffice/clubs/{id}/reservation-system`

Récupère les informations du système de réservation.

**Response :**
```json
{
  "systemType": "GESTION_SPORTS",
  "backendUrl": "https://monclub.gestion-sports.com",
  "frontendUrl": "https://monclub.gestion-sports.com",
  "email": "admin@example.com",
  "password": "secret123"
}
```

#### `PUT /backoffice/clubs/{id}/reservation-system`

Met à jour le système de réservation. Invalide la session si les credentials changent.

**Request :**
```json
{
  "systemType": "GESTION_SPORTS",
  "backendUrl": "https://monclub.gestion-sports.com",
  "frontendUrl": "https://monclub.gestion-sports.com",
  "email": "admin@example.com",
  "password": "secret123"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `systemType` | enum | `UNKNOWN`, `TENUP`, `GESTION_SPORTS`, `DOIN_SPORT`, `OPEN_RESA` |
| `backendUrl` | string | URL backend (nullable) |
| `frontendUrl` | string | URL frontend (nullable) |
| `email` | string | Email de connexion (nullable) |
| `password` | string | Mot de passe (nullable) |

> **Note :** Si `systemType` = `UNKNOWN`, les URLs et credentials sont effacés automatiquement.

---

### Clés externes

#### `GET /backoffice/clubs/{id}/external-ids`

Liste toutes les clés externes d'un club.

**Response :**
```json
[
  {
    "id": 1,
    "source": "GOOGLE",
    "externalId": "ChIJW6Dwinxh5kcRtTkMsgve6UE",
    "isPrimary": true
  },
  {
    "id": 2,
    "source": "TENUP",
    "externalId": "12345",
    "isPrimary": true
  },
  {
    "id": 3,
    "source": "DOIN_SPORT",
    "externalId": "abc123",
    "isPrimary": false
  }
]
```

#### `POST /backoffice/clubs/{id}/external-ids`

Ajoute une nouvelle clé externe.

**Request :**
```json
{
  "source": "DOIN_SPORT",
  "externalId": "abc123"
}
```

**Response :**
```json
{
  "id": 3,
  "source": "DOIN_SPORT",
  "externalId": "abc123",
  "isPrimary": false
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `source` | enum | `GOOGLE`, `TENUP`, `DOIN_SPORT` |
| `externalId` | string | Identifiant externe |

> **Erreur 400 :** Si la combinaison `source` + `externalId` existe déjà.

#### `PUT /backoffice/clubs/{id}/external-ids/{externalIdId}`

Modifie une clé externe existante.

**Request :**
```json
{
  "externalId": "newValue123"
}
```

**Response :**
```json
{
  "id": 3,
  "source": "DOIN_SPORT",
  "externalId": "newValue123",
  "isPrimary": false
}
```

---

## Migration base de données

**V100_58** : Migration des `doin_sport_club_id` de `reservation_system_metadata` vers `club_external_id`.
