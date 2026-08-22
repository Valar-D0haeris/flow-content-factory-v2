# FLOW CONTENT FACTORY — Speak English With Flow

> **Version :** 2.0.0  
> **Source de Vérité :** Neon PostgreSQL + Vercel Blob  
> **Interface :** Next.js 15 App Router + Tailwind CSS + shadcn/ui  
> **API Agentique :** REST API v1 + OpenAPI 3.1 pour Custom GPT Actions  

---

## 1. Présentation Générale

**Flow Content Factory** est l'application web centrale et la mémoire persistante de production pour la chaîne **Speak English With Flow**.

L'application supprime définitivement la dépendance à l'historique d'une conversation ChatGPT :
- **La conversation n'est pas la mémoire du projet.**
- **Flow Content Factory est la mémoire persistante du projet.**

---

## 2. Fonctionnalités Clés

1. **Planning Éditorial Déterministe** :
   - Gestion des 45 épisodes initiaux répartis en 4 séries thématiques :
     - *Intermediate Mastery (B1-B2)* (15 épisodes)
     - *Mindset & Psychology* (10 épisodes)
     - *Career & Business English* (10 épisodes)
     - *Life & Social English* (10 épisodes)
   - Support des codes séries hétérogènes (`B1-B2_01`, `MIND-01`, `CAR-01`, `LIFE-01`).
   - Moteur d'extension sécurisé (`POST /api/v1/planning/extend`).

2. **Moteur d'Import / Export CSV avec Diff Prévisualisé** :
   - Importation basée sur le format éditorial à 9 colonnes.
   - Calcul des différences (nouveaux, modifiés, absents, doublons) avant confirmation transactionnelle.
   - Aucune suppression silencieuse de données.
   - Exportation CSV déterministe (`GET /api/v1/csv/export`).

3. **Studio de Production d'Épisode** :
   - **Scripting & Versionnement Immuable** : Création de versions successives (v1, v2, ... final) sans jamais écraser l'historique. Calcul automatique du nombre de mots et de la durée de lecture estimée.
   - **Convertisseur de Durée Canonique** : Conversion instantanée des durées humaines (`23:18`, `23 minutes 18 secondes`) en secondes pour le stockage PostgreSQL.
   - **Packaging & 3 Propositions de Titres** : Sauvegarde de 3 options de titres avec sélection en 1 clic du titre final, hook d'accroche (0-15s), mots-clés SEO (15 tags) et chapitrage.
   - **Miniatures A/B/C** : Gestion des 3 variantes de miniatures avec sélection de la miniature principale (`is_primary`).
   - **Timeline d'Audit Immuable** : Traçabilité de chaque action réalisée par l'utilisateur ou par l'agent GPT.

4. **Intégration Custom GPT Action (OpenAPI 3.1)** :
   - Endpoints `/api/v1/production/next` (détermination déterministe du prochain épisode à produire sans hallucination).
   - `/api/v1/episodes/{code}/context` (mémoire éditoriale complète pour les agents).
   - Spécification OpenAPI complète servie sur `/api/openapi.json` et `/openapi.yaml`.

---

## 3. Démarrage Rapide

### Prérequis
- Node.js >= 18.17.0
- npm >= 9.0.0

### Installation
```bash
# Cloner le dépôt et installer les dépendances
npm install

# Lancer en développement
npm run dev
```
L'application est accessible sur [http://localhost:3000](http://localhost:3000).

### Exécuter les tests
```bash
npm run test
```

### Build de production
```bash
npm run build
```

---

## 4. Documentation Complète

- [ARCHITECTURE.md](ARCHITECTURE.md) : Architecture découplée Neon Postgres & Vercel Blob.
- [DATABASE.md](DATABASE.md) : Schéma relationnel Drizzle ORM, tables, relations et index.
- [API.md](API.md) : Référence exhaustive des routes REST v1.
- [OPENAPI.md](OPENAPI.md) : Spécification OpenAPI 3.1 et configuration OpenAI Action.
- [CSV.md](CSV.md) : Mapping CSV, validation Zod et moteur de diff.
- [GPT_INTEGRATION.md](GPT_INTEGRATION.md) : Guide d'intégration agent GPT et prompts d'instructions.
- [DEPLOYMENT.md](DEPLOYMENT.md) : Déploiement sur Vercel et Neon.
- [SECURITY.md](SECURITY.md) : Gestion des secrets, authentification et permissions.
