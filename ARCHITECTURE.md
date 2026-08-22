# Architecture Technique — Flow Content Factory V2

## 1. Vue d'Ensemble

```text
                    ┌───────────────────┐
                    │  UTILISATEUR / UI │
                    └─────────┬─────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌───────────────┐           ┌───────────────┐
        │   DASHBOARD   │           │   GPT / IA    │
        │ Next.js 15 UI │           │  OpenAI Action│
        └───────┬───────┘           └───────┬───────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                      ┌───────────────┐
                      │   REST API    │
                      │  /api/v1/*    │
                      └───────┬───────┘
                              │  (Zod Validation + Auth)
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
        │ (Drizzle ORM) │           │    ASSETS     │
        └───────────────┘           └───────────────┘
```

## 2. Découplage Neon PostgreSQL vs Vercel Blob

### Neon PostgreSQL (Données Structurées & Relations)
Stocke :
- `episodes` : Identité canonique, identifiants éditoriaux (`globalId`, `codeSerie`), titres, playlists, briefs.
- `episode_production` : Machine à états des 6 étapes (planning, script, review, audio, metadata, thumbnails, publication) et durées canoniques en secondes.
- `script_versions` : Historique immuable des versions de scripts (v1, v2, ... final), métriques de mots et de durée estimée.
- `episode_metadata` : Les 3 propositions de titres, le titre sélectionné, le hook, la description, les chapitres et les tags SEO.
- `assets` : Métadonnées et pointeurs d'assets binaires (variantes de miniatures A/B/C, audio master, sous-titres).
- `production_events` : Journal d'audit immuable de chaque événement survenu sur la chaîne.

### Vercel Blob (Fichiers Binaires Volumineux)
Stocke :
- Les fichiers audio finaux (`.mp3` / `.wav`).
- Les images et miniatures en haute résolution (`1280x720`).
- Les fichiers de scripts volumineux si nécessaire.
- Les exports CSV archivés.

---

## 3. Cycle de Vie et Détermination Déterministe du Prochain Épisode

Le endpoint `/api/v1/production/next` applique un algorithme strict pour éliminer tout risque d'hallucination d'un agent IA :
1. Analyse chronologique selon l'ordre éditorial (`episodeNumber` / `globalId`).
2. Détection prioritaire des épisodes en cours de production (`IN_PROGRESS` ou `WAITING_USER`).
3. Détection des scripts validés en attente de production audio (`APPROVED` / `READY`).
4. Sélection du premier épisode non démarré (`NOT_STARTED`).
5. Renvoi du contexte complet prêt à l'emploi.
