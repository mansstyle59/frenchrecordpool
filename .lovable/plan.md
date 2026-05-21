# Full Edit Mode Admin — Plan en 3 vagues

Objectif : transformer l'édition inline existante (CmsText / CmsImage / icône crayon) en un véritable mode builder visuel, **sans toucher au branding** ni casser la perf.

L'infra CMS actuelle (table `cms_content`, RPC `cms_save_draft`/`cms_publish`/`cms_revert_draft`/`cms_restore_version`, table `cms_content_versions`, contexte `CmsContext`, composants `<CmsText>` et `<CmsImage>`) est conservée et étendue, pas remplacée.

---

## Vague 1 — Édition étendue (contenu + style local)

### Nouveaux composants d'édition inline (côté front)

- `<CmsRichText>` : éditeur WYSIWYG léger (gras, italique, lien, liste). Stocké en JSON via type `richtext` déjà supporté par `cms_save_draft`.
- `<CmsButton>` : édite label + URL + variante (primary/secondary/ghost/outline).
- `<CmsLink>` : édite label + URL d'un lien isolé (menu, footer).
- `<CmsColor>` : color picker pour overrides de couleur ponctuels (type `color` déjà supporté).
- `<CmsStyle>` : composant wrapper avec icône crayon → panneau latéral pour ajuster **uniquement** ce qui ne touche pas au branding global : padding (0-128px slider), margin, radius (token-based : sm/md/lg/full), shadow (none/sm/md/lg), opacité (0-100%), alignement texte (left/center/right), tailles responsive (sm/md/lg).
- Toutes les valeurs sortent en classes Tailwind compatibles avec les tokens existants (`p-4`, `rounded-lg`, `shadow-md`…) — jamais en CSS arbitraire.

### Panneau d'édition latéral (sidebar droite)

- Quand `editMode` actif + clic sur un élément éditable → panneau slide-in 320px à droite (Sheet shadcn).
- Onglets : `Contenu` | `Style` | `Visibilité` | `Historique`.
- `Visibilité` : 3 toggles (mobile/tablet/desktop) → ajoute classes `hidden md:block` etc.
- `Historique` : liste des versions depuis `cms_content_versions`, bouton Restaurer (utilise `cms_restore_version` existant).
- Double-clic = édition rapide texte inline (déjà presque OK).
- Single-clic en mode édition = ouvre panneau.

### Barre d'édition flottante (bas écran)

- Toggle Édition (déjà existant).
- Compteur brouillons en attente.
- Boutons Annuler (revert key) / Tout publier / Prévisualisation (toggle valeur `value_draft` vs `value_published` en preview locale).
- Indicateur "Sauvegarde auto" (debounce 800ms après chaque save_draft).
- Undo/Redo **session-only** (stack en mémoire, pas en DB).

### Schéma DB

Pas de migration nécessaire pour la vague 1 — on étend `cms_content` via deux nouveaux types tolérés par `cms_save_draft` : ajout dans la fonction du CHECK pour accepter `button`, `link`, `style`, `visibility`.

```text
ALTER FONCTION cms_save_draft :
  IF _type NOT IN ('text','richtext','image','url','color',
                   'button','link','style','visibility')
```

### Pages couvertes Vague 1

- Homepage : tous les `<CmsText>` existants + ajout sur "À la une", titres de section, sous-titres, CTA boutons.
- Footer : lien par lien éditable, copyright, ordre des liens.
- Header : libellés des items de menu (mais pas l'ordre encore — vague 2).
- Page Pricing : titres, descriptions des plans (les prix restent en DB `subscription_plans`).
- Page About / Genres intro / NewReleases intro : zones de texte ajoutées si manquantes.

---

## Vague 2 — Sections dynamiques (drag & drop, add/remove)

### Nouvelles tables

```text
cms_pages
  - slug (text PK)            ex: 'home', 'about'
  - title (text)
  - status (draft|published)
  - meta (jsonb)              SEO title/desc/og_image

cms_sections
  - id (uuid PK)
  - page_slug (fk cms_pages)
  - position (int)
  - type (text)               'hero' | 'tracks_grid' | 'genres_strip'
                              | 'featured_djs' | 'rich_block' | 'cta_band'
                              | 'image_band' | 'video_embed'
  - props (jsonb)             config typée selon le type
  - visibility (jsonb)        { mobile: true, tablet: true, desktop: true }
  - status (draft|published)
```

RLS : public lit `published` uniquement, admin tout. RPC : `cms_section_upsert`, `cms_section_delete`, `cms_section_reorder(page, ids[])`, `cms_section_publish_page(slug)`.

### Front

- `<DynamicPage slug="home">` : charge `cms_sections` triées par `position`, rend chaque section via un registry `{ hero: HeroSection, tracks_grid: TracksGridSection, ... }`.
- En mode édition :
  - bordure pointillée autour de chaque section au hover
  - barre d'outils flottante par section : ↑ ↓ déplacer, ⧉ dupliquer, 👁 toggle visibilité, ✏️ éditer props, 🗑 supprimer
  - drag & drop via `@dnd-kit/sortable`
  - bouton "+ Ajouter une section" entre chaque bloc → picker des types disponibles avec preview thumbnail
- Migration douce : la Homepage actuelle reste codée en dur ; on crée la version "dynamique" en parallèle sur la même route avec fallback. Quand l'admin clique "Convertir en page éditable", on snapshot la version actuelle en `cms_sections` (1 ligne par bloc du JSX actuel).

### Section types V1

| Type | Props éditables |
|---|---|
| `hero` | titre, sous-titre, badge, bg_image, cta_label, cta_url, search_visible |
| `tracks_grid` | titre, source (latest/top/by_genre), limit, layout (grid/list) |
| `genres_strip` | titre, mode (marquee/grid), limit |
| `featured_djs` | titre, dj_ids[], layout |
| `rich_block` | richtext, alignment, max_width |
| `cta_band` | titre, sous-titre, cta_label, cta_url, bg_variant |
| `image_band` | image_url, alt, ratio, overlay_opacity |
| `video_embed` | url (youtube/vimeo), aspect |

---

## Vague 3 — Builder avancé + théming

### Theme editor étendu

La page `AdminBranding` existante reçoit :
- Section "Couleurs primaires" → verrouillée par défaut (toggle "Modifier le branding principal" avec warning rouge).
- Section "Couleurs secondaires" → accent-2, muted-2, surface, surface-elevated. Color picker HSL avec preview live.
- Section "Tokens d'espacement" → échelle (compact/normal/spacious) qui remap les variables `--spacing-*`.
- Section "Rayons" : presets (sharp/soft/rounded/pill) qui mettent à jour `--radius`.
- Section "Ombres" : 4 sliders pour shadow-sm/md/lg/xl.
- Toutes les valeurs persistées dans `site_branding` (table existante, ajouter colonnes).

### Responsive overrides par section

`cms_sections.props` reçoit un sous-champ `responsive`:
```json
{ "props": {...}, "responsive": {
    "mobile":  { "padding": "sm", "hidden": false },
    "tablet":  { "padding": "md" },
    "desktop": { "padding": "lg" }
}}
```
Bouton bascule mobile/tablet/desktop dans la topbar d'édition → preview change le breakpoint actif.

### Templates & duplication

- Table `cms_templates(id, name, kind, data jsonb)` — snapshot d'une section ou page complète.
- Bouton "Enregistrer comme template" sur une section / page.
- Picker "+ Ajouter" gagne un onglet "Mes templates".
- Duplication de page : `cms_duplicate_page(slug, new_slug)` RPC.

### Historique & versions

- `cms_page_versions` (snapshot complet des sections par page, à chaque publish).
- Page `/admin/cms/history` : timeline avec aperçu et bouton Restaurer.
- Diff visuel : avant / après côte à côte (champs texte uniquement, V3 simple).

### Logs & sécurité

- Toute action (save_draft, publish, revert, section_upsert, template_save, page_duplicate) est tracée dans `admin_audit_logs` existant via les RPC.
- Confirmation modale obligatoire pour suppression de section / page / template.
- RLS : seuls les admins accèdent à toute la surface builder. Les DJs gardent leur scope `dj_*` actuel (aucune extension de leurs droits).

---

## Performance

- **Pas d'impact runtime user** : la page publique charge `cms_sections.status='published'` en une seule requête (déjà dans `CmsContext`), zéro JS builder côté visiteur.
- Le bundle builder (`@dnd-kit`, panneaux d'édition, color pickers) est **lazy-loadé** via `React.lazy` uniquement si `editMode === true` et `isAdmin`.
- Sauvegarde auto debouncée 800 ms.
- Cache React Query 30 s sur `cms_content` et `cms_sections`, invalidation ciblée par `key` ou `section_id` à chaque save.
- Pas de reload : tous les saves sont des `mutation.onSuccess` → update local + revalidate.

---

## Hors-scope explicite (volontairement non couvert)

- Pas de page builder libre type Webflow (pas de positionnement absolu pixel-perfect). On reste sur des sections typées avec des props bornées — c'est ce qui garantit que le branding ne casse pas.
- Pas de multilingue.
- Pas de A/B testing.
- Pas d'édition côté DJ (le scope DJ reste : ses morceaux + son profil + son avatar via `Dashboard` existant).
- Pas de Vidéo upload : seulement embed YouTube/Vimeo.
- Pas de redirections custom (resterait à faire en routing React).
- Snapping pixel et guides : non — incompatible avec une grille Tailwind responsive saine. Remplacé par presets d'espacement et alignements bornés.

---

## Ce que je propose de livrer en premier

**Vague 1 uniquement**, avec :
1. Migration `cms_save_draft` (ajout types `button`/`link`/`style`/`visibility`).
2. Composants `<CmsRichText>`, `<CmsButton>`, `<CmsLink>`, `<CmsColor>`, `<CmsStyle>`.
3. Panneau latéral d'édition (Sheet shadcn) avec onglets Contenu/Style/Visibilité/Historique.
4. Barre flottante enrichie (compteur, undo/redo session, autosave indicator).
5. Couverture Homepage + Footer + Header (libellés) + Pricing.

Tu valides la Vague 1 telle quelle, ou tu veux ajuster le scope (par exemple, ne couvrir que la Homepage pour commencer, ou intégrer tout de suite les sections drag & drop de la Vague 2) ?
