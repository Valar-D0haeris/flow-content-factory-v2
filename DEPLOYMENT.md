# Guide de Déploiement — Vercel, Neon & Blob

## 1. Déploiement sur Vercel
1. Importez le dépôt Git dans votre dashboard **Vercel**.
2. Dans **Settings** ➔ **Environment Variables**, définissez :
   - `DATABASE_URL` : URL de connexion de votre instance Neon PostgreSQL avec SSL (`sslmode=require`).
   - `BLOB_READ_WRITE_TOKEN` : Token de stockage Vercel Blob généré dans l'onglet Storage.
   - `GPT_API_KEY` : Clé secrète pour vos agents GPT de production.
   - `GPT_READONLY_KEY` : Clé secrète pour les accès en lecture seule.
   - `ADMIN_API_KEY` : Clé administrateur.
   - `NEXT_PUBLIC_APP_URL` : URL publique du projet sur Vercel.
3. Cliquez sur **Deploy**. Le build Next.js s'exécute automatiquement.

## 2. Initialisation de la Base de Données Neon
```bash
# Générer les migrations Drizzle si nécessaire
npx drizzle-kit generate

# Appliquer les tables sur Neon
npx drizzle-kit push
```
