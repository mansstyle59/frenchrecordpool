# French Record Pool

Application web React/Vite pour gérer un pool de morceaux (tracks), artistes, genres et sorties, avec authentification et backend Supabase.

## URL de production (GitHub Pages)

Pour un lien plus propre et plus fiable, utilisez **une seule URL canonique** selon votre mode d’hébergement :

- **GitHub Pages (projet)** : `https://<github-username>.github.io/frenchrecordpool/`
- **Domaine personnalisé** : `https://music.votredomaine.com/` (recommandé pour une URL plus professionnelle)

### Exemples

- Compte GitHub `octocat` : `https://octocat.github.io/frenchrecordpool/` **(exemple uniquement)**
- Domaine custom : `https://records.example.com/`


> ⚠️ `https://octocat.github.io/frenchrecordpool/` est une URL d’exemple.
> Votre URL réelle est: `https://<votre-username>.github.io/frenchrecordpool/`.

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

- Pour GitHub Pages projet : `VITE_BASE_PATH=/frenchrecordpool/`
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

### 3) (Optionnel) Domaine personnalisé

- Ajoutez votre domaine dans **Settings → Pages → Custom domain**.
- Créez/ajustez les entrées DNS (CNAME / A / AAAA) chez votre registrar.
- Si domaine custom activé, pensez à mettre `VITE_BASE_PATH=/`.

### 4) Vérifier l’URL finale (éviter le 404)

Si `https://<username>.github.io/frenchrecordpool/` ne fonctionne pas:

- Vérifiez que le repository est **public**.
- Vérifiez que **Settings → Pages** pointe bien vers la branche `gh-pages`.
- Vérifiez que le nom du repository est exactement `frenchrecordpool` (respect du chemin URL).
- Attendez 1 à 5 minutes après publication (propagation GitHub Pages).
- Contrôlez que le build a été fait avec `VITE_BASE_PATH=/frenchrecordpool/`.

## Stack technique

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- Supabase
- Vitest + Testing Library
