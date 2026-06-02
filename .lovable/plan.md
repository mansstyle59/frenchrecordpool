## Objectif phase 1

Passer du flat list actuel (`home_widgets` triés par `position`, regroupés par `col_span`) à une vraie hiérarchie **Section → Colonne → Widget**, façon Elementor/Webflow, sans casser l'existant.

C'est la fondation technique pour toutes les phases suivantes (responsive par device, templates, undo/redo, nouveaux widgets premium…). Si on ne fait pas ça d'abord, le reste sera bâti sur du sable.

## Modèle de données

On garde **une seule table** `home_widgets` (pas de migration douloureuse) en y ajoutant 2 colonnes :

```text
home_widgets
├─ id, type, position, config, is_active, ...   (existant)
├─ parent_id   uuid NULL  → self FK (section / colonne parente)
└─ depth       int default 0  (0 = racine, 1 = colonne, 2 = widget enfant)
```

Deux nouveaux `type` :
- `section`   → conteneur racine, config = `{ layout: "1" | "1-1" | "1-1-1" | "2-1" | "1-2", gap, bg, padding }`
- `column`    → enfant direct d'une section, config = `{ span?: number }`

Les widgets existants restent inchangés ; un widget orphelin (`parent_id NULL`, type ≠ section) est traité comme une section implicite à 1 colonne pour rétro-compat.

## Rendu public (`HomeWidgets.tsx`)

- Charger tous les widgets actifs, construire un arbre via `parent_id`.
- Renderer récursif :
  - `section` → `<section>` avec grid CSS selon `layout`.
  - `column`  → `<div>` cellule du grid, rend ses enfants empilés verticalement.
  - autre    → `WidgetRenderer` existant.
- Fallback : si un widget racine n'est pas une section, on l'enveloppe dans une mini-section implicite (compatibilité 100 % avec les pages déjà publiées).
- Le `col_span` legacy reste supporté pour les widgets non encore migrés.

## Éditeur admin (`AdminHomeWidgets.tsx`)

1. **Arborescence visuelle** (panneau gauche) : tree view Section / Colonnes / Widgets avec icônes, rename, duplicate, hide, delete, drag-to-reorder.
2. **DnD imbriqué** avec `@dnd-kit` (déjà installé) : 
   - drag d'un widget entre colonnes,
   - drag d'une colonne dans une autre section,
   - drag d'une section pour réordonner.
3. **Bouton "+ Ajouter une section"** avec presets de layout (1, 1/1, 1/1/1, 2/1, 1/2). Chaque preset crée la section + les colonnes enfants en une transaction.
4. **Édition contextuelle** : clic sur un widget → panneau de réglages à droite (déjà existant, on l'accroche au nœud sélectionné dans l'arbre).
5. **Aperçu live** : la prévisualisation utilise le même renderer récursif que la home publique.

## Migration douce des données existantes

- Aucune donnée n'est déplacée automatiquement.
- Bouton admin **"Convertir en sections"** : prend la home actuelle (flat list + `col_span`) et génère des sections/colonnes équivalentes en un clic. Réversible via undo de la migration (snapshot avant/après dans `cms_content_versions`).

## Ce qui n'est PAS dans cette phase

Pour rester livrable rapidement, on **exclut** explicitement :
- Réglages responsive indépendants Desktop/Tablette/Mobile (phase 2).
- Nouveaux widgets premium — Hero vidéo/slider, Masonry, Timeline, Compteur, Social feeds, Formulaire avancé (phase 3).
- Bibliothèque de templates 1 clic (phase 4).
- Undo/redo global multi-étapes + autosave avec historique (phase 5).
- Barre flottante de modification au survol du widget public (phase 6).
- Lazy loading / optimisation Lighthouse (phase 7, transversale).

À chaque fin de phase je te propose la suivante, tu valides l'ordre.

## Détails techniques

- Migration SQL : `ALTER TABLE home_widgets ADD COLUMN parent_id uuid REFERENCES home_widgets(id) ON DELETE CASCADE, ADD COLUMN depth int NOT NULL DEFAULT 0;` + index sur `parent_id`.
- RLS inchangée (les nouvelles lignes héritent des mêmes policies admin/public).
- Nouveaux composants :
  - `src/components/widgets/SectionRenderer.tsx`
  - `src/components/widgets/ColumnRenderer.tsx`
  - `src/components/admin/widgets/WidgetTree.tsx`
  - `src/components/admin/widgets/SectionLayoutPicker.tsx`
- `HomeWidgets.tsx` : on extrait la logique de groupement actuelle et on branche le renderer récursif.
- `AdminHomeWidgets.tsx` : refacto progressive — on garde l'éditeur existant et on lui ajoute le tree + DnD imbriqué à côté.

## Livrables de cette phase

1. Migration SQL `parent_id` + `depth`.
2. Renderer récursif côté public, 100 % rétrocompatible.
3. Création de sections multi-colonnes côté admin avec DnD imbriqué.
4. Arborescence latérale (rename / duplicate / hide / delete / move).
5. Bouton "Convertir l'existant en sections".

Une fois validé et mergé, on enchaîne sur la phase 2 (responsive par breakpoint).