# French Record Pool

Application web React + Vite pour gérer un catalogue de morceaux (tracks), artistes, genres et sorties, avec authentification et backend Supabase.

## URL GitHub Pages (important)

L’URL de production dépend de **votre username GitHub** :

- Format réel : `https://<votre-username>.github.io/frenchrecordpool/`
- Exemple : `https://octocat.github.io/frenchrecordpool/` *(exemple seulement)*

> Si l’URL `octocat` ne marche pas chez vous, c’est normal : remplacez `octocat` par votre propre username.

## Démarrage local

Prérequis :
- Node.js 20+
- npm

```bash
npm install
npm run dev
```

Application locale : `http://localhost:8080`

## Build production

```bash
npm run build
npm run preview
```

## Déploiement GitHub Pages

### 1) Configurer le base path Vite

Le projet lit `VITE_BASE_PATH` dans `vite.config.ts`.

- GitHub Pages (repo projet) : `VITE_BASE_PATH=/frenchrecordpool/`
- Domaine personnalisé (racine) : `VITE_BASE_PATH=/`

Créez `.env.production` :

```bash
VITE_BASE_PATH=/frenchrecordpool/
```

### 2) Publier `dist/`

```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d dist
```

Ensuite, dans **Settings → Pages**, sélectionnez la branche `gh-pages`.

### 3) Vérification rapide en cas de 404

- Le repo doit être **public**.
- Le nom du repo doit être exactement `frenchrecordpool`.
- Pages doit cibler la branche `gh-pages`.
- Attendre 1 à 5 minutes après le publish.
- Le build doit avoir été fait avec `VITE_BASE_PATH=/frenchrecordpool/`.

## Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- Supabase
- Vitest + Testing Library
