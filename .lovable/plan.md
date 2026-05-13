## Vue d'ensemble

Deux gros chantiers en parallèle. Pour rester gérable, je propose de découper en **2 lots successifs** plutôt qu'un mega-commit. Tu valides le lot 1, on enchaîne le lot 2.

---

## LOT 1 — Améliorer l'ajout des tracks (admin)

### 1.1 Drag & drop fichiers
- Remplacer les `<input type="file">` actuels du `TrackForm` par une zone de drop (audio, preview, cover) avec aperçu et état (idle / dragging / uploading / done).
- Composant réutilisable `FileDropzone` basé sur HTML5 drag events (zéro dépendance).

### 1.2 Auto-remplissage des métadonnées audio
- À l'upload du fichier audio, lire en client :
  - **durée** via `HTMLAudioElement` (toujours dispo).
  - **BPM, key, titre, artiste, label** via tags ID3 avec `jsmediatags` (lib légère).
- Pré-remplir les champs vides du formulaire (l'admin garde la main pour modifier).

### 1.3 Upload multiple / par lot
- Nouveau bouton **"Upload par lot"** dans `AdminTracks` ouvrant un dialog spécifique :
  - Drop de N fichiers audio.
  - Pour chaque fichier : extraction auto des métadonnées + ligne éditable (titre, artiste, genre, BPM, key, version).
  - Cover & preview optionnels (uploadables ensuite via édition).
  - Bouton "Tout publier" → boucle d'upload séquentielle avec progression globale et par fichier.

### 1.4 Validation & feedback
- Schéma **Zod** pour `TrackFormData` (titre, artiste, genre obligatoires ; BPM 40-220 ; URL valides ; taille fichier max 100 MB pour audio, 10 MB pour cover).
- Indicateur de progression upload (Supabase storage `onUploadProgress` simulé via XHR) sur chaque dropzone.
- Toasts succès/erreur explicites + résumé de fin de lot ("3/5 publiés, 2 erreurs").

---

## LOT 2 — Améliorer le site

### 2.1 Recherche & filtres
- **Recherche** : connecter la barre de recherche du header (actuellement décorative) à un état global → redirige sur `/tracks?q=...` avec filtre titre/artiste/label.
- **Filtres avancés sur `/tracks`** :
  - Slider BPM (range), select Key (gamme musicale), multi-select Genre, multi-select Version.
  - Tri (récent, top téléchargements, BPM).
  - URL synchronisée (params) pour partage.

### 2.2 Pages "Mes Favoris" & "Mes Téléchargements"
- `/favorites` (auth requis) : liste des tracks favorites de l'utilisateur (réutilise `useFavorites` + jointure tracks).
- `/downloads` (auth requis) : historique des téléchargements (table `downloads` déjà présente).
- Liens dans la nav user (dropdown "Mon compte") + dashboard.

### 2.3 Performance
- **Lazy-loading** des routes via `React.lazy` + `Suspense` dans `App.tsx` (réduit le bundle initial).
- `loading="lazy"` sur toutes les `<img>` covers.
- Préfetch des covers visibles uniquement (Intersection Observer simple).

### 2.4 SEO
- Composant `<SEO>` injectant `<title>`, `<meta description>`, `<link rel=canonical>`, OpenGraph + JSON-LD via `react-helmet-async` (déjà compatible).
- Une H1 unique par page, alt text sur covers (`{title} - {artist}`).
- `sitemap.xml` statique + `robots.txt` mis à jour.
- JSON-LD `MusicRecording` sur `/tracks/:id`.

### 2.5 Refonte visuelle (light)
- Hero `Index` retravaillé : meilleure hiérarchie typographique, animation framer-motion plus marquée, gradient bleu→blanc→rouge plus subtil.
- Cards tracks : hover plus expressif (élévation, glow primaire), badges BPM/Key plus lisibles.
- Footer enrichi (liens, mentions, réseaux).

> Pour la refonte visuelle, comme c'est qualitatif, je proposerai 2-3 directions de design (mockups HTML) sur le hero après le lot 1 pour que tu choisisses, plutôt que de l'imposer.

---

## Ordre d'exécution proposé

1. **Lot 1** maintenant (ajout tracks complet) → tu testes.
2. **Lot 2.1 + 2.2** (recherche/filtres + pages perso) → fonctionnel.
3. **Lot 2.3 + 2.4** (perf + SEO) → invisible mais critique.
4. **Lot 2.5** avec choix de direction de design.

## Détails techniques

- **Nouvelles deps** : `jsmediatags` (~30 kB), `react-helmet-async` (~5 kB), `zod` (déjà présent probablement). Pas de lib drag&drop externe.
- **Pas de migration DB nécessaire** — toutes les tables (tracks, favorites, downloads) existent déjà.
- **Pas de nouvelle edge function** — uploads via SDK Supabase Storage côté client (admin déjà authentifié).
- **Compatibilité RLS** : OK, l'admin a déjà policy INSERT sur `tracks` et accès aux 3 buckets.

Confirme et je commence par le **Lot 1**.
