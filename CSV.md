# Format & Moteur CSV — Flow Content Factory

## 1. Colonnes Officielles du Planning (9 Colonnes)
Le fichier CSV éditorial utilise exactement ces 9 en-têtes :
1. `ID Global` (Obligatoire) : Identifiant global ou numéro séquentiel
2. `Code Série` (Obligatoire) : Code de la série (`B1-B2_01`, `MIND-01`, `CAR-01`, `LIFE-01`)
3. `Titre de la Vidéo` (Obligatoire) : Titre éditorial principal
4. `Concept / Playlist` (Obligatoire) : Série / Catégorie thématique
5. `Texte Miniature` : Texte accrocheur incrusté
6. `Visuel Miniature` : Brief descriptif du visuel
7. `Hook (0-15s)` : Script d'accroche pour l'introduction
8. `Mots-Clés (15 tags)` : Liste de tags SEO séparés par des virgules
9. `Description Complète` : Description complète pour YouTube ou Podcast

## 2. Workflow d'Importation Sécurisé
```text
Upload CSV
  ↓
Parse & Validate Headers
  ↓
Détection des Doublons
  ↓
Génération du Diff (Nouveaux, Modifiés, Absents, Inchangés)
  ↓
Prévisualisation Utilisateur
  ↓
Confirmation Transactionnelle
  ↓
Journalisation dans production_events
```

## 3. Règle Fondamentale
Aucune donnée existante en base n'est supprimée silencieusement lors d'un import. Les épisodes absents du CSV sont conservés et signalés.
