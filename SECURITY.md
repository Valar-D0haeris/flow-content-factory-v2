# Sécurité & Gestion des Droits — Flow Content Factory

## 1. Principes de Sécurité
- **Secrets Serveur Uniquement :** Les clés `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, et `GPT_API_KEY` ne sont jamais exposées côté client ni incluses dans les bundles frontend.
- **Validation Stricte des Payloads :** Toutes les routes d'API utilisent des schémas de validation Zod stricts pour filtrer et nettoyer les données entrantes.
- **Contrôle d'Accès par Rôles :**
  - `GPT_PRODUCTION` : Droit de lecture et d'écriture sur les épisodes, scripts, métadonnées et statuts.
  - `GPT_READONLY` : Droit de consultation uniquement (lecture du planning, des contextes et de l'historique).
  - `ADMIN` : Accès complet incluant les opérations d'administration et d'import CSV.
- **Contrôle de Concurrence Optimiste :** Envoi du champ `expectedUpdatedAt` pour empêcher toute écrasement involontaire si une ressource a été modifiée entre-temps (code `409 Conflict`).
- **Pas d'Accès SQL Brut aux Agents :** Les agents IA n'ont aucun accès aux requêtes SQL brutes (`raw SQL`), au système de fichiers arbitraire ou aux commandes shell.
