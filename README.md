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

## Upload du site (GitHub Pages)

### Commande rapide (recommandée)

```bash
npm run upload:site
```

Cette commande enchaîne automatiquement :
1. `npm run build:pages` (build avec `VITE_BASE_PATH=/frenchrecordpool/`)
2. `npm run deploy:pages` (publication de `dist/` sur la branche `gh-pages`)

### Configuration initiale (1 seule fois)

```bash
npm install --save-dev gh-pages
```

Puis, dans **Settings → Pages** :
- Source : **Deploy from a branch**
- Branch : **gh-pages** (root)

### Vérification rapide en cas de 404

- Le repo doit être **public**.
- Le nom du repo doit être exactement `frenchrecordpool`.
- Pages doit cibler la branche `gh-pages`.
- Attendre 1 à 5 minutes après publication.
- Le build doit avoir été fait avec le base path `/frenchrecordpool/`.

## Stack technique

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- Supabase
- Vitest + Testing Library
