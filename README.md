# French Record Pool

Application web React/Vite pour gérer un pool de morceaux (tracks), artistes, genres et sorties, avec authentification et backend Supabase.

## URL GitHub Pages

Une fois déployé avec GitHub Pages, l’URL de l’application suit ce format :

- `https://<github-username>.github.io/<repo-name>/`

Exemple pour ce repo si votre compte est `octocat` :

- `https://octocat.github.io/frenchrecordpool/`

## Démarrage local

Prérequis :
- Node.js 20+
- npm

```bash
npm install
npm run dev
```

L’application sera disponible sur `http://localhost:8080`.

## Build de production

```bash
npm run build
npm run preview
```

## Déploiement sur GitHub Pages

### 1) Configurer le chemin de base

Le projet lit `VITE_BASE_PATH` dans `vite.config.ts`.

- Pour GitHub Pages projet : `VITE_BASE_PATH=/<repo-name>/`
- Pour domaine racine/custom domain : `VITE_BASE_PATH=/`

Créez un fichier `.env.production` :

```bash
VITE_BASE_PATH=/frenchrecordpool/
```

### 2) Publier le dossier `dist/`

Option simple avec `gh-pages` :

```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d dist
```

Puis activez **Settings → Pages** sur la branche `gh-pages`.

## Stack technique

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- Supabase
- Vitest + Testing Library
