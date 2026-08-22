# Modèle de Données & Base PostgreSQL — Flow Content Factory V2

## 1. Schéma des Tables Drizzle ORM

### Table `episodes`
| Colonne | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Identifiant unique interne |
| `global_id` | VARCHAR(64) (UNIQUE) | Numéro / identifiant global d'ordre |
| `code_serie` | VARCHAR(64) (INDEX) | Code de la série (ex: `B1-B2_01`, `MIND-01`) |
| `episode_number` | INTEGER (INDEX) | Ordre chronologique dans le catalogue |
| `title` | TEXT | Titre de travail ou titre principal |
| `concept_playlist` | VARCHAR(255) (INDEX) | Série ou Playlist thématique |
| `thumbnail_text` | TEXT | Texte d'accroche pour la miniature |
| `thumbnail_visual` | TEXT | Brief descriptif du visuel |
| `hook` | TEXT | Hook d'accroche (0-15s) |
| `keywords` | TEXT | Liste des mots-clés / tags SEO |
| `description` | TEXT | Description complète YouTube / podcast |
| `created_at` | TIMESTAMPTZ | Date de création |
| `updated_at` | TIMESTAMPTZ | Date de dernière mise à jour |

### Table `episode_production`
| Colonne | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Identifiant |
| `episode_id` | UUID (FK) | Référence vers `episodes.id` (CASCADE) |
| `planning_status` | VARCHAR(32) | Statut de planification |
| `script_status` | VARCHAR(32) | Statut du script (`DRAFT`, `REVIEW`, `APPROVED`, etc.) |
| `review_status` | VARCHAR(32) | Statut de relecture |
| `audio_status` | VARCHAR(32) | Statut de la production audio |
| `metadata_status` | VARCHAR(32) | Statut des métadonnées |
| `thumbnail_status` | VARCHAR(32) | Statut des miniatures |
| `publication_status` | VARCHAR(32) | Statut global / publication |
| `duration_seconds` | INTEGER | Durée canonique en secondes |
| `started_at` | TIMESTAMPTZ | Date de début de production |
| `completed_at` | TIMESTAMPTZ | Date d'achèvement |
| `updated_at` | TIMESTAMPTZ | Date de modification |

### Table `script_versions`
| Colonne | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Identifiant |
| `episode_id` | UUID (FK) | Référence `episodes.id` |
| `version_number` | INTEGER | Numéro incrémental (1, 2, 3...) |
| `status` | VARCHAR(32) | Statut de la version (`DRAFT`, `REVIEW`, `APPROVED`, `FINAL`) |
| `content` | TEXT | Contenu du script formaté |
| `storage_url` | TEXT | URL Blob si stocké en externe |
| `word_count` | INTEGER | Nombre de mots calculé |
| `character_count`| INTEGER | Nombre de caractères |
| `estimated_duration_seconds` | INTEGER | Durée estimée en secondes |
| `created_by` | VARCHAR(64) | Auteur (`USER` ou `GPT`) |
| `notes` | TEXT | Notes de révision |
| `created_at` | TIMESTAMPTZ | Date d'enregistrement |

### Table `episode_metadata`
| Colonne | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Identifiant |
| `episode_id` | UUID (FK) | Référence `episodes.id` |
| `title_option_1` | TEXT | 1ère proposition de titre |
| `title_option_2` | TEXT | 2ème proposition de titre |
| `title_option_3` | TEXT | 3ème proposition de titre |
| `selected_title` | TEXT | Titre final retenu |
| `description` | TEXT | Description détaillée |
| `chapters` | JSON | Tableau de chapitrage (`timestamp`, `seconds`, `title`) |
| `tags` | JSON | Tableau des tags SEO |
| `playlist` | VARCHAR(255) | Playlist de publication |

### Table `assets`
| Colonne | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Identifiant |
| `episode_id` | UUID (FK) | Référence `episodes.id` |
| `asset_type` | VARCHAR(32) | `SCRIPT`, `AUDIO`, `THUMBNAIL`, `IMAGE`, `VIDEO`, etc. |
| `filename` | VARCHAR(255) | Nom du fichier |
| `blob_url` | TEXT | URL publique ou signée Vercel Blob |
| `variant` | VARCHAR(32) | Variante (ex: `"A"`, `"B"`, `"C"`, `"MASTER"`) |
| `is_primary` | BOOLEAN | `true` si asset principal sélectionné |

### Table `production_events`
| Colonne | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Identifiant de l'événement |
| `episode_id` | UUID (FK) | Épisode concerné (nullable pour actions globales) |
| `event_type` | VARCHAR(64) | Type d'événement (ex: `SCRIPT_CREATED`, `STATUS_CHANGED`) |
| `actor_type` | VARCHAR(32) | `USER`, `GPT`, `SYSTEM`, `DASHBOARD` |
| `description` | TEXT | Description textuelle de l'action |
| `metadata_json` | JSON | Données contextuelles de l'événement |
| `created_at` | TIMESTAMPTZ | Horodatage précis |
