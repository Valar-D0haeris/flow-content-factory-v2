# Guide Spécification OpenAPI 3.1 — Flow Content Factory

## 1. Accès au Schéma
Le schéma OpenAPI complet est accessible aux endpoints :
- **JSON :** `GET /api/openapi.json`
- **YAML :** `GET /openapi.yaml` (ou fichier local `openapi/openapi.yaml`)

## 2. Configuration d'une Action Custom GPT (OpenAI)
1. Ouvrez l'éditeur de GPTs dans ChatGPT.
2. Allez dans l'onglet **Configure** ➔ **Actions** ➔ **Create new action**.
3. Dans la section **Schema**, collez le contenu du fichier [openapi.yaml](openapi/openapi.yaml) ou importez l'URL `https://<VOTRE_DOMAINE>/api/openapi.json`.
4. Dans **Authentication** :
   - Type : **API Key**
   - Auth Type : **Bearer** (ou Custom Header `x-api-key`)
   - Value : Votre clé `GPT_API_KEY` (ex: `fcf_live_gpt_prod_secret_key_8923`).
5. Enregistrez l'Action. Votre GPT peut désormais interagir de façon persistante avec Flow Content Factory !
