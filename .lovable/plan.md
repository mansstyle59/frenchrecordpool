# Pack widget home 100% personnalisable

Objectif : transformer chaque widget en bloc entièrement éditable depuis l'admin (style WordPress/Elementor), avec un sous-éditeur à 4 onglets — **Contenu / Style / Layout / Avancé** — et un schéma de config partagé qui s'applique à tous les widgets de façon uniforme.

## 1. Schéma de config étendu (`src/lib/widgetCommon.ts`)

Ajout de deux nouveaux blocs partagés en plus de `WidgetCommon` (envelope) et `WidgetTypo` (header) déjà en place :

- **`WidgetItemStyle`** — apparence des items (cartes, lignes, vignettes) à l'intérieur du widget
  - `bg_kind` (none / color / glass / gradient), `bg_color`, `bg_color_2`, `bg_opacity`
  - `border_color`, `border_width`, `radius` (px)
  - `text_color`, `muted_color`, `meta_color`
  - `hover_bg`, `hover_lift` (none / sm / md / lg), `hover_glow` (bool)
  - `shadow` (none / sm / md / lg / xl), `padding` (sm / md / lg)
- **`WidgetLayout`** — disposition interne
  - `mode` (auto / list / grid / carousel) — quand le widget le supporte
  - `columns_mobile`, `columns_tablet`, `columns_desktop` (1..6)
  - `gap` (none / sm / md / lg / xl)
  - `item_width_px` (pour carrousels), `aspect` (auto / square / 4:3 / 16:9 / portrait)
  - `density` (compact / cozy / comfortable)
  - `show_index`, `show_meta`, `show_actions` (bools de visibilité)

Helpers exportés : `itemStyle(s)`, `itemClasses(s)`, `gridClasses(l)`, `gapClass(l)` — appliqués via inline-style + classes Tailwind whitelistées.

## 2. Application uniforme aux widgets

Tous les widgets de listing acceptent et propagent `config.items` + `config.layout` :

- **Listes de tracks** : `TopDownloadsPeriod`, `MostFavorited`, `RecentlyPlayed`, `TrackGridWidget` (HomeWidgets)
- **Cartes** : `PlaylistsCarousel`, `FeaturedGenres`, `TrendingArtists`, `DjShortsWidget`, `TopGenreWidget`
- **Bandeaux** : `WelcomeBanner`, `DjCharts`, `CustomPlaylistPlayer` reçoivent surtout `typo` + `items` (couleurs CTA/texte)

Chaque carte/ligne enfant reçoit une prop `style`/`className` dérivée des helpers, sans toucher à sa logique métier.

## 3. Éditeur admin à onglets (`AdminHomeWidgets.tsx`)

Refonte du panneau de config d'un widget en un composant `WidgetConfigTabs` avec 4 onglets :

- **Contenu** — champs spécifiques au widget (titre, sous-titre, eyebrow, limit, period, ids, see_all_url…)
- **Style** — `WidgetTypo` (titre / sous-titre / eyebrow / accent bar) + `WidgetItemStyle` (cartes)
- **Layout** — `WidgetCommon` (container, max-width, min-height, paddings responsives, alignement) + `WidgetLayout` (mode, colonnes, gap, densité, aspect)
- **Avancé** — fond (color / gradient / image / overlay / blur), animations (type + délai), audience / devices / planification, ID/CSS class custom

Les onglets sont rendus par un sous-composant générique recevant `(type, config, onChange)` ; les widgets qui n'ont pas besoin d'un onglet (ex. pas de layout grille) le voient grisé mais conservent la grille uniforme.

## 4. Compatibilité

- Tous les nouveaux champs sont **optionnels** ; les widgets existants continuent de fonctionner avec leur config actuelle.
- Les helpers retournent des valeurs par défaut neutres → aucun visuel ne change tant que l'admin ne touche à rien.
- Pas de migration SQL : `home_widgets.config` est `jsonb`, on étend simplement la forme.

## Détails techniques

```text
src/lib/
  widgetCommon.ts        + WidgetItemStyle, WidgetLayout, helpers
  widgetTypography.ts    (inchangé)
src/components/widgets/
  WidgetItem.tsx         NEW — wrapper appliquant itemStyle aux cartes
  *.tsx                  consomment config.items / config.layout
src/components/HomeWidgets.tsx
  TrackGridWidget / TopGenreWidget câblés sur le nouveau schéma
src/pages/AdminHomeWidgets.tsx
  WidgetConfigTabs        NEW — onglets Contenu/Style/Layout/Avancé
  WidgetItemStyleEditor   NEW
  WidgetLayoutEditor      NEW
  (les éditeurs Typo et Common existants sont repositionnés dans les onglets)
```

## Livraison en 2 lots

Vu la taille (~4000 lignes touchées), je propose :

1. **Lot 1 — Fondations + éditeur** : schéma `WidgetItemStyle` + `WidgetLayout`, helpers, refonte de l'éditeur admin en onglets, branchement sur 3 widgets pilotes (TopDownloads, PlaylistsCarousel, TrackGridWidget) pour valider visuellement.
2. **Lot 2 — Généralisation** : application aux widgets restants (FeaturedGenres, TrendingArtists, MostFavorited, RecentlyPlayed, DjShorts, DjCharts, WelcomeBanner, TopGenre, CustomPlaylistPlayer).

Réponds "go" pour démarrer le Lot 1, ou indique des ajustements (ex. retirer le mode carrousel, garder uniquement la typo + le style des items, etc.).
