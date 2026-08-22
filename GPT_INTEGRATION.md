# Guide d'Intégration Custom GPT — Speak English With Flow

## 1. Principe Directeur
> **La conversation n'est pas la mémoire du projet. Flow Content Factory est la mémoire persistante.**

Un nouvel agent GPT ou une nouvelle conversation doit pouvoir reprendre immédiatement la production en interrogeant l'API sans nécessiter l'historique conversationnel antérieur.

---

## 2. Cycle Typique de Production pour l'Agent

1. **Identification de l'Épisode Cible :**
   - L'agent appelle `GET /api/v1/production/next`.
   - L'API renvoie le prochain épisode non produit avec tout son contexte.

2. **Chargement de la Mémoire Éditoriale :**
   - Si besoin de détails supplémentaires ou d'inspiration sur un épisode précédent (ex: EP02), l'agent appelle `GET /api/v1/episodes/{code}/context`.

3. **Rédaction & Discussion du Script :**
   - L'agent propose le script au format conversationnel standardisé (Speaker 1 / Speaker 2).
   - Après validation avec l'utilisateur, l'agent sauvegarde la version via `POST /api/v1/episodes/{code}/scripts` (`status="APPROVED"` ou `"FINAL"`).

4. **Durée Audio & Métadonnées :**
   - L'utilisateur indique la durée de l'enregistrement (ex: `"23:18"`).
   - L'agent met à jour la durée via `PATCH /api/v1/episodes/{code}/production`.
   - L'agent génère 3 options de titres accrocheurs, le hook, les tags et la description, puis les sauvegarde via `POST /api/v1/episodes/{code}/metadata`.

5. **Statut & Clôture :**
   - L'agent passe le statut à `COMPLETED` via `PATCH /api/v1/episodes/{code}/status`.
   - L'épisode suivant devient automatiquement le prochain épisode à produire.
