# French Record Pool

Application web React/Vite pour gérer un pool de morceaux (tracks), artistes, genres et sorties, avec authentification et backend Supabase.

## URL GitHub Pages (important)

L’URL de production dépend de **votre username GitHub** :

- URL finale : `https://<votre-username>.github.io/frenchrecordpool/`
- Exemple : `https://octocat.github.io/frenchrecordpool/` *(exemple uniquement)*

> Si l’URL avec `octocat` ne fonctionne pas pour vous, c’est normal : remplacez `octocat` par votre username GitHub.

## Démarrage local

Prérequis :
- Node.js 20+
- npm

```bash
npm install
npm run dev
```

Application locale : `http://localhost:8080`

## Build de production

```bash
npm run build
npm run preview
```

## Déploiement GitHub Pages

### 1) Configurer le chemin de base

Le projet lit `VITE_BASE_PATH` dans `vite.config.ts`.

- GitHub Pages (repo projet `frenchrecordpool`) : `VITE_BASE_PATH=/frenchrecordpool/`
- Domaine personnalisé (racine) : `VITE_BASE_PATH=/`

Créez un fichier `.env.production` :

```bash
VITE_BASE_PATH=/frenchrecordpool/
```

### 2) Publier le dossier `dist/`

```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d dist
```

Ensuite, dans **Settings → Pages** :
- Source : **Deploy from a branch**
- Branch : **gh-pages** (root)

### 3) Vérification rapide en cas de 404

- Le repo doit être **public**.
- Le nom du repo doit être exactement `frenchrecordpool`.
- Pages doit cibler la branche `gh-pages`.
- Attendre 1 à 5 minutes après publication.
- Le build doit avoir été fait avec `VITE_BASE_PATH=/frenchrecordpool/`.

## Stack technique

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- Supabase
- Vitest + Testing Library


## Note de fusion

Ce README est la version consolidée après résolution de conflits de branche.
