# FLOW CONTENT FACTORY
## Cahier des charges technique et fonctionnel — V2

**Projet :** Speak English With Flow  
**Application :** Flow Content Factory  
**Version :** 2.0  
**Statut :** Document de référence pour développement avec Google Antigravity

---

# 1. OBJECTIF DU PROJET

Flow Content Factory est une application web destinée à devenir le centre de gestion persistant de la production de la chaîne **Speak English With Flow**.

L'application doit permettre de gérer :

- le planning éditorial ;
- les épisodes ;
- les scripts ;
- les versions des scripts ;
- les titres ;
- les descriptions ;
- les tags ;
- les chapitres ;
- les durées audio ;
- les miniatures ;
- les autres assets ;
- les statuts de production ;
- l'historique des modifications ;
- l'import et l'export CSV ;
- l'accès d'un agent GPT aux données nécessaires à la production.

L'objectif principal est de supprimer la dépendance à l'historique d'une conversation ChatGPT.

Une nouvelle conversation ou un nouveau GPT doit pouvoir récupérer l'état réel de la production directement depuis l'API.

## Principe fondamental

> La conversation n'est pas la mémoire du projet.  
> Flow Content Factory est la mémoire persistante du projet.

---

# 2. SOURCE DE DONNÉES ACTUELLE

Le planning fourni est un CSV issu du planning éditorial de la chaîne.

Le CSV contient actuellement **45 épisodes** et les colonnes suivantes :

```text
ID Global
Code Série
Titre de la Vidéo
Concept / Playlist
Texte Miniature
Visuel Miniature
Hook (0-15s)
Mots-Clés (15 tags)
Description Complète
```

Ces colonnes constituent le format éditorial actuellement utilisé.

Le système doit conserver les informations existantes lors de l'import initial.

Aucune donnée du CSV original ne doit être supprimée silencieusement.

---

# 3. IMPORTANT — CSV VS BASE DE DONNÉES

Le CSV ne doit pas devenir l'unique base de données du système.

Le CSV sert principalement à :

- initialiser le planning ;
- exporter les données ;
- effectuer une modification externe si nécessaire ;
- sauvegarder le planning ;
- migrer les données ;
- permettre à l'utilisateur de conserver une copie portable.

La source de vérité interne doit être :

```text
Neon PostgreSQL
+
Vercel Blob
```

Architecture :

```text
CSV
  ↓
Import / Validation
  ↓
Neon PostgreSQL
  ↓
API
  ↓
┌───────────────┬───────────────┐
│               │               │
Dashboard       GPT             autres outils futurs
```

---

# 4. ARCHITECTURE GÉNÉRALE

```text
                    ┌───────────────────┐
                    │       USER        │
                    └─────────┬─────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌───────────────┐           ┌───────────────┐
        │   DASHBOARD   │           │   GPT / IA    │
        └───────┬───────┘           └───────┬───────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                      ┌───────────────┐
                      │   REST API    │
                      └───────┬───────┘
                              ▼
                      ┌───────────────┐
                      │ BUSINESS      │
                      │ SERVICES      │
                      └───────┬───────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌───────────────┐           ┌───────────────┐
        │ NEON POSTGRES │           │ VERCEL BLOB   │
        │   DATABASE    │           │    ASSETS     │
        └───────────────┘           └───────────────┘
```

---

# 5. STACK TECHNIQUE

## Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React

## Backend

- Next.js Route Handlers
- services métier
- repository/data-access layer
- Zod

## Base de données

- Neon PostgreSQL
- Drizzle ORM

## Stockage de fichiers

- Vercel Blob

## Déploiement

- Vercel

## Contrôle de version

- Git
- GitHub

---

# 6. POURQUOI NEON EST NÉCESSAIRE

Blob seul ne doit pas être utilisé pour ce projet.

Le système doit effectuer des opérations structurées telles que :

- rechercher un épisode ;
- trouver le prochain épisode ;
- filtrer par statut ;
- rechercher par code série ;
- comparer des versions ;
- enregistrer un historique ;
- gérer des relations ;
- empêcher les doublons ;
- gérer des transactions ;
- détecter les conflits.

PostgreSQL est donc nécessaire.

## Répartition

### Neon

Stocke :

- épisodes ;
- planning ;
- statuts ;
- scripts et leurs métadonnées ;
- versions ;
- titres ;
- descriptions ;
- tags ;
- chapitres ;
- historique ;
- références vers les fichiers.

### Blob

Stocke :

- fichiers de scripts volumineux si nécessaire ;
- audio ;
- miniatures ;
- images ;
- vidéos ;
- sous-titres ;
- exports ;
- autres fichiers.

---

# 7. IDENTITÉ D'UN ÉPISODE

Le système doit conserver plusieurs notions séparées.

```text
ID Global
Code Série
Numéro / ordre global
Titre
Concept / Playlist
```

Ne jamais supposer que `Code Série` correspond simplement à un format numérique universel.

Le planning contient plusieurs familles de codes, par exemple :

```text
B1-B2_01
B1-B2_02
MIND-01
MIND-02
CAR-01
LIFE-01
LIFE-02
```

Le code série est une donnée éditoriale, pas une règle algorithmique permettant à elle seule de déterminer l'ordre global.

---

# 8. TABLE `episodes`

Cette table représente l'identité éditoriale de chaque épisode.

Champs recommandés :

```text
id
global_id
code_serie
episode_number
title
concept_playlist
thumbnail_text
thumbnail_visual
hook
keywords
description
created_at
updated_at
```

## Contraintes

- `id` : primary key ;
- `global_id` : unique si l'audit confirme son unicité ;
- index sur `code_serie` ;
- index sur `episode_number` ;
- index sur `concept_playlist`.

Ne pas ajouter de contrainte d'unicité sur `code_serie` sans vérifier les données réelles.

---

# 9. TABLE `episode_production`

Cette table représente l'état réel de production.

Champs :

```text
id
episode_id
planning_status
script_status
review_status
audio_status
metadata_status
thumbnail_status
publication_status
duration_seconds
started_at
completed_at
created_at
updated_at
```

---

# 10. STATUTS

Les statuts doivent être contrôlés.

Valeurs proposées :

```text
NOT_STARTED
IN_PROGRESS
WAITING_USER
READY
APPROVED
COMPLETED
BLOCKED
```

Les transitions doivent être gérées par le backend.

Exemple :

```text
NOT_STARTED
      ↓
IN_PROGRESS
      ↓
WAITING_USER
      ↓
APPROVED
      ↓
COMPLETED
```

Un agent ne doit pas pouvoir faire n'importe quelle transition sans validation métier.

---

# 11. VERSIONNEMENT DES SCRIPTS

Créer une table :

```text
script_versions
```

Champs :

```text
id
episode_id
version_number
status
storage_url
word_count
character_count
estimated_duration_seconds
created_by
notes
created_at
```

Statuts :

```text
DRAFT
REVIEW
APPROVED
FINAL
ARCHIVED
```

Une nouvelle version ne doit jamais écraser l'ancienne.

Exemple :

```text
EP05

v1
 ↓
v2
 ↓
v3
 ↓
FINAL
```

---

# 12. FORMAT DU SCRIPT

Le script final destiné à l'animation doit respecter le format éditorial validé.

Exemple :

```text
Speaker 1: Hello, and welcome back...
Speaker 2: It's great to be here...
Speaker 1: Today we're going to...
```

Le stockage du script final ne doit pas ajouter automatiquement :

- titre ;
- résumé ;
- commentaires ;
- explications ;
- instructions techniques.

Ces informations doivent rester séparées du contenu du script.

---

# 13. MÉTADONNÉES

Créer une structure permettant de conserver :

```text
title_option_1
title_option_2
title_option_3
selected_title
description
chapters
tags
playlist
```

Les propositions doivent pouvoir être conservées avant sélection.

Le système doit conserver la version finale choisie.

---

# 14. DURÉE AUDIO

L'utilisateur peut fournir une durée sous forme humaine :

```text
23 minutes 18 secondes
```

Le système doit pouvoir la convertir en :

```text
1398 secondes
```

La valeur canonique stockée en base doit être en secondes.

Le dashboard peut ensuite afficher :

```text
23:18
```

---

# 15. ASSETS

Créer une table :

```text
assets
```

Champs :

```text
id
episode_id
asset_type
filename
blob_url
mime_type
file_size
variant
version
is_primary
created_at
```

Types :

```text
SCRIPT
AUDIO
THUMBNAIL
IMAGE
VIDEO
SUBTITLE
OTHER
```

---

# 16. MINIATURES

Le workflow doit permettre trois propositions par épisode.

Exemple :

```text
EP05

Thumbnail A
Thumbnail B
Thumbnail C
```

La base doit conserver les trois variantes.

Une miniature peut être sélectionnée comme principale :

```text
is_primary = true
```

Les autres restent disponibles pour le A/B testing ou une future utilisation.

---

# 17. HISTORIQUE

Créer :

```text
production_events
```

Champs :

```text
id
episode_id
event_type
actor_type
description
metadata_json
created_at
```

Acteurs :

```text
USER
GPT
SYSTEM
DASHBOARD
```

Événements minimum :

```text
SCRIPT_CREATED
SCRIPT_UPDATED
SCRIPT_APPROVED
AUDIO_DURATION_UPDATED
METADATA_CREATED
THUMBNAIL_CREATED
STATUS_CHANGED
CSV_IMPORTED
CSV_EXPORTED
PLANNING_EXTENDED
```

---

# 18. MÉMOIRE ÉDITORIALE

Créer un endpoint spécialisé :

```http
GET /api/v1/episodes/{code}/context
```

Il doit retourner les informations utiles à un agent IA pour travailler sur un épisode.

Selon disponibilité :

```text
identité
code série
titre
playlist
brief miniature
hook
mots-clés
description
script final
metadata
durée
statuts
historique pertinent
```

Cette route est fondamentale.

Elle permet à un nouveau GPT de reprendre le travail sans avoir besoin de récupérer l'ancienne conversation.

---

# 19. INSPIRATION À PARTIR D'UN ANCIEN ÉPISODE

Le GPT doit pouvoir demander :

```text
Donne-moi le contexte complet de l'EP02.
```

puis utiliser cet épisode comme référence pour préparer un autre épisode.

Le système doit permettre de récupérer :

- structure du script ;
- style ;
- longueur ;
- description ;
- tags ;
- format ;
- metadata ;
- informations de miniature.

L'agent doit rester libre d'interpréter ces données selon les instructions éditoriales qui lui sont données.

---

# 20. RECHERCHE

Créer :

```http
GET /api/v1/episodes/search
```

Filtres :

```text
code
titre
concept
playlist
statut
numéro
```

La recherche sémantique avec embeddings n'est pas obligatoire en V1.

Elle pourra être ajoutée plus tard.

---

# 21. PROCHAIN ÉPISODE

Créer :

```http
GET /api/v1/production/next
```

Le système doit identifier le prochain épisode à produire à partir :

- de l'ordre éditorial ;
- de l'ordre global ;
- des statuts ;
- des épisodes déjà réalisés.

Ne pas simplement calculer :

```text
dernier numéro + 1
```

car les codes série sont hétérogènes.

Si le système détecte une ambiguïté, il doit la signaler.

Il ne doit jamais inventer le prochain épisode.

---

# 22. WORKFLOW DE PRODUCTION

Workflow cible :

```text
Conversation GPT ouverte
        ↓
GET production/next
        ↓
Identifier épisode
        ↓
GET episode context
        ↓
Préparer le script
        ↓
Discussion / révision avec utilisateur
        ↓
Validation du script
        ↓
Enregistrer version
        ↓
Utilisateur produit l'audio
        ↓
Utilisateur indique la durée
        ↓
Enregistrer durée
        ↓
Générer titres
        ↓
Générer description
        ↓
Générer tags
        ↓
Générer chapters
        ↓
Générer 3 miniatures
        ↓
Enregistrer assets
        ↓
Mettre à jour statut
        ↓
Historique
```

---

# 23. API DE LECTURE

Minimum :

```http
GET /api/v1/production
GET /api/v1/production/next

GET /api/v1/episodes
GET /api/v1/episodes/{code}
GET /api/v1/episodes/{code}/context
GET /api/v1/episodes/{code}/history
GET /api/v1/episodes/{code}/assets

GET /api/v1/episodes/search
```

---

# 24. API D'ÉCRITURE

Minimum :

```http
PATCH /api/v1/episodes/{code}

PATCH /api/v1/episodes/{code}/production

POST /api/v1/episodes/{code}/scripts

POST /api/v1/episodes/{code}/metadata

POST /api/v1/episodes/{code}/assets

PATCH /api/v1/episodes/{code}/status

POST /api/v1/planning/extend
```

---

# 25. IMPORT CSV

Endpoint :

```http
POST /api/v1/csv/import
```

Workflow obligatoire :

```text
Upload
 ↓
Parse
 ↓
Validate
 ↓
Detect duplicates
 ↓
Compare database
 ↓
Generate diff
 ↓
Preview
 ↓
User confirmation
 ↓
Transaction
 ↓
Audit
```

Le système doit détecter :

- nouveaux épisodes ;
- épisodes modifiés ;
- épisodes absents ;
- doublons ;
- colonnes inconnues ;
- colonnes manquantes ;
- valeurs invalides.

Aucune suppression automatique.

---

# 26. EXPORT CSV

Endpoint :

```http
GET /api/v1/csv/export
```

L'export doit rester compatible avec le format de planning utilisé actuellement.

Il doit être déterministe.

---

# 27. MAPPING CSV → DATABASE

Mapping initial :

```text
ID Global
→ episodes.global_id

Code Série
→ episodes.code_serie

Titre de la Vidéo
→ episodes.title

Concept / Playlist
→ episodes.concept_playlist

Texte Miniature
→ episodes.thumbnail_text

Visuel Miniature
→ episodes.thumbnail_visual

Hook (0-15s)
→ episodes.hook

Mots-Clés (15 tags)
→ episodes.keywords

Description Complète
→ episodes.description
```

Avant de choisir le type PostgreSQL final de `Mots-Clés (15 tags)`, analyser les valeurs réelles du CSV.

---

# 28. EXTENSION DU PLANNING

Endpoint :

```http
POST /api/v1/planning/extend
```

Workflow :

```text
Lire planning
 ↓
Déterminer la fin actuelle
 ↓
GPT propose nouveaux épisodes
 ↓
Utilisateur vérifie
 ↓
Confirmation
 ↓
API valide
 ↓
Transaction PostgreSQL
 ↓
Ajout
 ↓
Historique
```

L'API ne doit pas inventer elle-même les sujets.

Elle enregistre les propositions confirmées par l'utilisateur ou par l'agent autorisé.

---

# 29. DASHBOARD — PAGE PRINCIPALE

Afficher :

```text
Total épisodes
Planifiés
En production
En attente
Terminés
Bloqués
```

Également :

```text
Prochain épisode
Dernières modifications
Activité récente
```

---

# 30. DASHBOARD — PLANNING

Table :

```text
ID Global
Code Série
Titre
Concept / Playlist
Statut
Durée
Progression
```

Actions :

```text
Ouvrir
Modifier
Filtrer
Rechercher
Importer CSV
Exporter CSV
Étendre planning
```

---

# 31. DASHBOARD — ÉPISODE

Structure :

```text
HEADER
├── EP
├── Code Série
├── Titre
└── Statut

PRODUCTION
├── Script
├── Review
├── Audio
├── Metadata
├── Thumbnail
└── Publication

CONTENU
├── Script final
├── Versions
├── Titres
├── Description
├── Chapters
└── Tags

ASSETS
├── Audio
├── Thumbnail A
├── Thumbnail B
└── Thumbnail C

HISTORIQUE
└── Timeline
```

---

# 32. API POUR GPT

L'API doit être une API métier.

Le GPT ne doit pas recevoir un accès SQL général.

Il doit pouvoir :

```text
READ_PRODUCTION
READ_EPISODES
READ_CONTEXT
READ_HISTORY
READ_ASSETS

WRITE_EPISODES
WRITE_SCRIPTS
WRITE_METADATA
WRITE_PRODUCTION
EXTEND_PLANNING
```

Pas d'accès :

```text
RAW_SQL
DATABASE_ADMIN
SHELL
ARBITRARY_FILESYSTEM
```

---

# 33. AUTHENTIFICATION GPT

Créer une clé API dédiée à l'agent.

La clé doit :

- être stockée côté serveur ;
- ne jamais apparaître dans le frontend ;
- être révocable ;
- pouvoir être renouvelée ;
- être associée à des permissions.

Prévoir éventuellement plusieurs clés :

```text
GPT_PRODUCTION
GPT_READONLY
ADMIN
```

---

# 34. OPENAPI

Créer :

```text
/openapi.yaml
```

Le document doit décrire :

- endpoints ;
- méthodes ;
- paramètres ;
- body ;
- réponses ;
- erreurs ;
- authentification ;
- schemas ;
- enums.

Il doit pouvoir être utilisé pour configurer une Action GPT.

---

# 35. FORMAT API

Réponse réussie :

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Réponse d'erreur :

```json
{
  "success": false,
  "error": {
    "code": "EPISODE_NOT_FOUND",
    "message": "Episode not found."
  }
}
```

Codes HTTP appropriés :

```text
200
201
204
400
401
403
404
409
422
429
500
```

---

# 36. IDEMPOTENCE

Les opérations critiques doivent être idempotentes.

Exemple :

si une requête d'ajout d'épisode est répétée, elle ne doit pas créer un doublon.

Utiliser :

- contraintes UNIQUE ;
- identifiants métier ;
- idempotency keys si nécessaire ;
- transactions.

---

# 37. GESTION DES CONFLITS

Prévoir :

```text
updated_at
version_number
optimistic locking
```

Si GPT tente de modifier une donnée devenue obsolète :

```text
409 CONFLICT
```

Le système ne doit pas écraser silencieusement une modification plus récente.

---

# 38. BLOB — ORGANISATION

Structure recommandée :

```text
episodes/
  EP05/
    scripts/
      v1.txt
      v2.txt
      final.txt

    audio/
      final.mp3

    thumbnails/
      A.png
      B.png
      C.png

    images/
```

Les URLs Blob sont stockées dans PostgreSQL.

---

# 39. SÉCURITÉ

Obligatoire :

- HTTPS ;
- validation Zod ;
- authentification ;
- autorisation ;
- headers de sécurité ;
- limitation du débit lorsque nécessaire ;
- protection des routes privées ;
- séparation client/serveur ;
- secrets uniquement côté serveur.

Ne jamais logger :

```text
DATABASE_URL
BLOB_READ_WRITE_TOKEN
API keys
AUTH secrets
```

---

# 40. VARIABLES D'ENVIRONNEMENT

Créer :

```text
.env.example
```

Variables :

```env
DATABASE_URL=
BLOB_READ_WRITE_TOKEN=
AUTH_SECRET=
GPT_API_KEY=
```

Ne jamais commit les vraies valeurs.

---

# 41. STRUCTURE DU PROJET

Structure recommandée :

```text
app/
  api/
  dashboard/
  planning/
  episodes/
  settings/

components/

db/
  schema/
  migrations/

lib/
  auth/
  csv/
  episodes/
  production/
  metadata/
  blob/
  history/
  planning/
  validation/

types/

openapi/

tests/
```

Architecture logique :

```text
Route Handler
      ↓
Validation
      ↓
Service métier
      ↓
Repository
      ↓
Database / Blob
```

---

# 42. TESTS

## Unit tests

Tester :

- parsing CSV ;
- validation CSV ;
- détermination du prochain épisode ;
- transitions de statut ;
- conversion de durée ;
- validation metadata.

## Integration tests

Tester :

- Neon ;
- Blob ;
- import ;
- export ;
- versionnement.

## API tests

Tester :

- auth ;
- permissions ;
- CRUD ;
- erreurs ;
- conflits ;
- idempotence.

## E2E

Workflow complet :

```text
Import CSV
→ sélectionner EP05
→ récupérer contexte
→ créer script
→ enregistrer version
→ enregistrer durée
→ metadata
→ thumbnails
→ statut
→ historique
```

---

# 43. DOCUMENTATION

Créer :

```text
README.md
ARCHITECTURE.md
DATABASE.md
API.md
OPENAPI.md
CSV.md
GPT_INTEGRATION.md
DEPLOYMENT.md
SECURITY.md
```

---

# 44. DÉVELOPPEMENT PAR PHASES

## PHASE 0 — AUDIT

Avant de coder :

1. inspecter le repository ;
2. inspecter le CSV ;
3. analyser toutes les colonnes ;
4. analyser les valeurs ;
5. rechercher les doublons ;
6. rechercher les valeurs nulles ;
7. vérifier les identifiants ;
8. vérifier les codes série ;
9. produire un rapport ;
10. proposer le schema.

Ne pas inventer de données.

## PHASE 1 — INFRASTRUCTURE

- Next.js ;
- Neon ;
- Drizzle ;
- Blob ;
- variables d'environnement ;
- configuration Vercel.

## PHASE 2 — DATABASE

- schema ;
- migrations ;
- repositories ;
- contraintes ;
- indexes.

## PHASE 3 — CSV

- import ;
- validation ;
- diff ;
- preview ;
- confirmation ;
- export.

## PHASE 4 — SERVICES

- episodes ;
- production ;
- scripts ;
- metadata ;
- assets ;
- history ;
- planning.

## PHASE 5 — API

- REST ;
- auth ;
- permissions ;
- OpenAPI.

## PHASE 6 — DASHBOARD

- dashboard ;
- planning ;
- épisode ;
- scripts ;
- metadata ;
- assets ;
- historique.

## PHASE 7 — GPT

- Action GPT ;
- endpoints ;
- contexte ;
- lecture ;
- écriture ;
- extension planning.

## PHASE 8 — TESTS

- unit ;
- integration ;
- API ;
- E2E.

## PHASE 9 — DÉPLOIEMENT

- Vercel ;
- Neon ;
- Blob ;
- secrets ;
- domaine ;
- monitoring.

---

# 45. CRITÈRES D'ACCEPTATION

## Planning

- [ ] les 45 épisodes sont importables ;
- [ ] aucune donnée n'est perdue ;
- [ ] les codes série sont conservés ;
- [ ] le prochain épisode est identifiable ;
- [ ] le planning est modifiable ;
- [ ] le planning est extensible ;
- [ ] le CSV est exportable.

## Production

- [ ] chaque épisode possède un statut ;
- [ ] les scripts sont versionnés ;
- [ ] la durée est persistante ;
- [ ] les metadata sont persistantes ;
- [ ] trois miniatures peuvent être associées ;
- [ ] l'historique est consultable.

## GPT

- [ ] GPT peut lire le planning ;
- [ ] GPT peut identifier le prochain épisode ;
- [ ] GPT peut récupérer le contexte ;
- [ ] GPT peut consulter un épisode de référence ;
- [ ] GPT peut enregistrer un script ;
- [ ] GPT peut créer une version ;
- [ ] GPT peut enregistrer les metadata ;
- [ ] GPT peut enregistrer la durée ;
- [ ] GPT peut modifier le statut ;
- [ ] GPT peut étendre le planning ;
- [ ] GPT peut lire l'historique.

---

# 46. HORS PÉRIMÈTRE V1

Ne pas ajouter inutilement :

```text
Google Sheets
Redis
microservices
Kubernetes
embeddings
vector database
queue distribuée
YouTube API
TikTok API
génération audio automatique
génération image automatique
```

Ces éléments peuvent être ajoutés dans des versions futures si un besoin réel apparaît.

---

# 47. PROMPT MAÎTRE POUR GOOGLE ANTIGRAVITY

Le bloc suivant doit être donné à l'agent de développement.

```text
TU ES L'AGENT PRINCIPAL DE DÉVELOPPEMENT DE FLOW CONTENT FACTORY.

OBJECTIF

Construire une application Next.js complète appelée Flow Content Factory.

L'application doit devenir la mémoire persistante et l'interface de production de Speak English With Flow.

STACK

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- shadcn/ui
- Lucide React
- Neon PostgreSQL
- Drizzle ORM
- Vercel Blob
- Zod
- REST API
- OpenAPI 3.x
- Vercel

RÈGLE ABSOLUE

NE COMMENCE PAS PAR CODER.

PHASE 0 — AUDIT

1. Inspecte le repository.
2. Inspecte le CSV.
3. Vérifie toutes les colonnes.
4. Vérifie toutes les valeurs.
5. Vérifie les doublons.
6. Vérifie les valeurs nulles.
7. Vérifie les identifiants.
8. Vérifie les codes série.
9. Vérifie les relations possibles.
10. Produis un rapport d'audit.

Le CSV actuel contient :

- ID Global
- Code Série
- Titre de la Vidéo
- Concept / Playlist
- Texte Miniature
- Visuel Miniature
- Hook (0-15s)
- Mots-Clés (15 tags)
- Description Complète

NE MODIFIE PAS LE CSV ORIGINAL PENDANT L'AUDIT.

Après l'audit :

1. propose le schema PostgreSQL ;
2. propose le mapping CSV → DB ;
3. signale les ambiguïtés ;
4. seulement après validation, commence l'implémentation.

SOURCE DE VÉRITÉ

Neon PostgreSQL + Vercel Blob.

Le CSV est un format d'import/export.

DATABASE

Créer au minimum :

episodes
episode_production
script_versions
episode_metadata
assets
production_events

Ne pas créer de contraintes arbitraires avant d'avoir analysé les données.

API

Créer /api/v1.

Minimum :

GET /api/v1/production
GET /api/v1/production/next
GET /api/v1/episodes
GET /api/v1/episodes/{code}
GET /api/v1/episodes/{code}/context
GET /api/v1/episodes/{code}/history
GET /api/v1/episodes/{code}/assets
GET /api/v1/episodes/search

PATCH /api/v1/episodes/{code}
PATCH /api/v1/episodes/{code}/production
POST /api/v1/episodes/{code}/scripts
POST /api/v1/episodes/{code}/metadata
POST /api/v1/episodes/{code}/assets
PATCH /api/v1/episodes/{code}/status
POST /api/v1/planning/extend

POST /api/v1/csv/import
GET /api/v1/csv/export

GPT

Créer une API métier sécurisée.

GPT peut :

- lire le planning ;
- trouver le prochain épisode ;
- récupérer le contexte ;
- récupérer un épisode de référence ;
- enregistrer des scripts ;
- créer des versions ;
- enregistrer metadata ;
- enregistrer durée ;
- modifier statuts ;
- enregistrer assets ;
- étendre le planning ;
- lire l'historique.

GPT ne doit jamais avoir accès à SQL arbitraire.

CSV IMPORT

Toujours :

upload
→ parse
→ validate
→ diff
→ preview
→ confirmation
→ transaction
→ audit

Ne jamais supprimer silencieusement des données.

VERSIONNEMENT

Les scripts doivent être versionnés.

Une nouvelle version ne doit jamais écraser l'ancienne.

DURÉE

Convertir les durées utilisateur en secondes.

Exemple :

23:18 = 1398 secondes.

CONFLITS

Utiliser versionnement et optimistic locking.

Retourner 409 si la donnée a changé depuis la lecture.

SÉCURITÉ

- Zod
- auth
- authorization
- secure headers
- rate limiting si nécessaire
- secrets uniquement côté serveur

Ne jamais logger les secrets.

OPENAPI

Créer /openapi.yaml compatible avec une Action GPT.

DASHBOARD

Créer :

- Dashboard
- Planning
- Episode detail
- Scripts
- Metadata
- Assets
- History
- Settings

TESTS

Créer :

- unit tests ;
- integration tests ;
- API tests ;
- E2E tests.

DOCUMENTATION

Créer :

README.md
ARCHITECTURE.md
DATABASE.md
API.md
OPENAPI.md
CSV.md
GPT_INTEGRATION.md
DEPLOYMENT.md
SECURITY.md

RÈGLE DE QUALITÉ

À chaque phase :

- explique ce qui a été fait ;
- liste les fichiers modifiés ;
- exécute les tests pertinents ;
- rapporte les erreurs ;
- ne prétends jamais qu'une fonctionnalité fonctionne si elle n'a pas été testée.

NE PAS INVENTER DE DONNÉES.

NE PAS SUPPRIMER DE DONNÉES SANS CONFIRMATION.

NE PAS SUR-INGÉNIER.

ORDRE STRICT :

1. Audit
2. Rapport
3. Schema
4. Migrations
5. Repository
6. Services
7. CSV
8. API
9. OpenAPI
10. Auth
11. Dashboard
12. GPT
13. Tests
14. Documentation
15. Déploiement

Commence par PHASE 0 et ne code rien avant d'avoir produit l'audit.
```

---

# 48. DÉCISION D'ARCHITECTURE

```text
NEON
=
mémoire structurée
+
relations
+
statuts
+
historique
+
versions

BLOB
=
fichiers
+
audio
+
images
+
miniatures
+
assets

CSV
=
import
+
export
+
backup
+
portabilité

API
=
pont entre la plateforme et les agents

DASHBOARD
=
interface humaine

GPT
=
intelligence éditoriale

CONVERSATION
=
interface temporaire
```

---

# 49. RÉSULTAT FINAL ATTENDU

À terme, le workflow doit devenir :

```text
Utilisateur
    ↓
"On commence la prochaine production."
    ↓
GPT
    ↓
API
    ↓
Flow Content Factory
    ↓
"Le prochain épisode est EP05."
    ↓
GPT récupère le contexte
    ↓
création / discussion du script
    ↓
validation
    ↓
enregistrement de la version finale
    ↓
production audio par l'utilisateur
    ↓
"L'audio fait 23:18."
    ↓
API
    ↓
durée enregistrée
    ↓
GPT génère titres + description + tags + chapters
    ↓
API
    ↓
metadata enregistrées
    ↓
3 propositions de miniature
    ↓
assets enregistrés
    ↓
EP05 = COMPLETED
    ↓
historique conservé
    ↓
EP06 devient automatiquement le prochain épisode
```

Le système doit donc être capable de fonctionner même si :

- la conversation ChatGPT est supprimée ;
- le GPT change ;
- le contexte est perdu ;
- l'utilisateur reprend la production plusieurs jours plus tard ;
- l'utilisateur veut consulter un épisode ancien ;
- l'utilisateur veut s'inspirer d'un épisode existant ;
- le planning passe de 45 à 90 épisodes.

**La persistance doit venir de Flow Content Factory, pas de la mémoire conversationnelle.**
