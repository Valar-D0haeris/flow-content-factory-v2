# Référence de l'API REST v1 — Flow Content Factory

## Authentification
Toutes les requêtes de modification requièrent un token d'autorisation :
```http
Authorization: Bearer <GPT_API_KEY>
```
ou
```http
x-api-key: <GPT_API_KEY>
```

---

## 1. Endpoints de Production

### `GET /api/v1/production`
Retourne les KPIs consolidés de production et les derniers événements d'audit.

### `GET /api/v1/production/next`
Détermine de manière déterministe le prochain épisode à produire selon l'ordre éditorial et les statuts réels, sans risque d'hallucination.

---

## 2. Endpoints Épisodes

### `GET /api/v1/episodes`
Liste tous les épisodes avec support des filtres `?playlist=...`, `?status=...`, `?search=...`.

### `GET /api/v1/episodes/search`
Recherche textuelle multi-critères sur les titres, codes séries, mots-clés, descriptions et playlists.

### `GET /api/v1/episodes/{code}`
Détails complets d'un épisode par son code série (ex: `B1-B2_01`) ou son identifiant global.

### `PATCH /api/v1/episodes/{code}`
Mise à jour des champs éditoriaux avec contrôle de concurrence optimiste (`expectedUpdatedAt`).

### `GET /api/v1/episodes/{code}/context`
**Mémoire éditoriale centrale pour GPT** : renvoie l'ensemble du contexte structuré (identité, brief miniature, hook, tags, dernier script validé, durées, métadonnées et historique).

### `POST /api/v1/episodes/{code}/scripts`
Enregistre une nouvelle version immuable du script (`v1`, `v2`, etc.) avec calcul automatique des mots et de la durée.

### `POST /api/v1/episodes/{code}/metadata`
Enregistre les 3 propositions de titres, le titre sélectionné, le hook, la description et les chapitres.

### `PATCH /api/v1/episodes/{code}/production`
Met à jour l'avancement des étapes de production et la durée (supporte les entrées naturelles type `"23:18"` ou `"23 minutes 18 secondes"`).

### `PATCH /api/v1/episodes/{code}/status`
Transition contrôlée de statut via la machine à états métier.

### `GET /api/v1/episodes/{code}/assets` & `POST /api/v1/episodes/{code}/assets`
Gestion des fichiers d'assets (miniatures A/B/C avec sélecteur `is_primary`, audio master).

---

## 3. Endpoints Planning & CSV

### `POST /api/v1/planning/extend`
Permet à un agent GPT ou à l'utilisateur d'ajouter un nouveau lot d'épisodes au planning.

### `POST /api/v1/csv/import`
Workflow en deux étapes :
- `action="preview"` : Calcule le diff (nouveaux, modifiés, absents, doublons) sans rien modifier.
- `action="confirm"` : Applique les modifications transactionnellement dans la base de données.

### `GET /api/v1/csv/export`
Exporte le planning complet au format CSV déterministe à 9 colonnes.
