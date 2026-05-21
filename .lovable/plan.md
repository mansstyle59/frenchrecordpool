# CMS visuel inline — édition par crayon (admin)

Objectif : permettre à l'admin de modifier textes, images, couleurs secondaires et l'ordre des sections directement depuis le site public via une icône crayon, **sans toucher au branding actuel** (logo, palette principale, typo, glassmorphism restent intacts).

Livré en **3 vagues** pour shipper utile vite. Validation explicite avant chaque vague.

---

## Vague 1 — Édition inline de contenu (texte + images)

### 1.1 Base de données
Nouvelle table `cms_content` :
- `key` (text, unique) — ex: `home.hero.title`, `footer.copyright`, `page.about.body`
- `type` — `text` | `richtext` | `image` | `url` | `color`
- `value_draft` (jsonb) — version en cours d'édition
- `value_published` (jsonb) — version visible publiquement
- `updated_at`, `updated_by`, `published_at`, `published_by`

Table `cms_content_versions` (historique automatique via trigger) :
- `content_key`, `value`, `created_at`, `created_by`, `action` (`save`|`publish`|`revert`)

RLS :
- Public : lecture de `value_published` uniquement (via vue `cms_content_public`).
- Admin : tout droits via `has_role(admin)`.

RPC : `cms_save_draft(key, value)`, `cms_publish(key)`, `cms_revert(version_id)`.

### 1.2 Couche front
- `CmsProvider` : charge tous les `value_published` au mount (1 requête), expose `useCmsValue(key, fallback)`.
- Mode admin : en plus, charge les `value_draft`, écoute realtime sur `cms_content`.
- Hook `useEditMode()` : toggle global via bouton "Édition" dans le header admin (sticky).

### 1.3 Composants inline
- `<CmsText editKey="home.hero.title" as="h1" className="..." >Fallback</CmsText>`
  - Hors mode édition → rendu normal.
  - Mode édition → wrapper avec hover crayon ; click → `contentEditable` (text) ou modal Tiptap (richtext) ; debounced save (800 ms) → toast "Brouillon enregistré".
- `<CmsImage editKey="home.hero.bg" src={fallback} alt="…" />`
  - Crayon → modal avec upload (réutilise le pipeline covers V1) ou URL ; preview avant save.
- `<CmsLink editKey="home.cta.url" />` pour les CTA.

### 1.4 Migration douce
Remplacer dans **Index.tsx, Layout (footer), pages statiques** les textes hardcodés par `<CmsText>` avec leur valeur actuelle comme `fallback`. Aucun reload : si la clé n'existe pas en base, on rend le fallback → rien ne casse.

### 1.5 Barre d'édition flottante (admins seulement)
En bas à droite quand `editMode=on` :
- Compteur "X brouillons non publiés"
- Bouton **Prévisualiser** (toggle entre `draft` et `published`)
- Bouton **Publier tout** / **Publier sélection**
- Bouton **Annuler** (revert au dernier publié)
- Lien "Historique" → drawer listant `cms_content_versions` avec restore.

---

## Vague 2 — Sections dynamiques (drag & drop, add/remove)

### 2.1 Modèle
Table `cms_sections` :
- `page` (text, ex: `home`, `about`)
- `position` (int)
- `type` (`hero` | `tracks_grid` | `genres_strip` | `featured_djs` | `rich_block` | `cta_band`)
- `props` (jsonb) — config spécifique du composant
- `is_visible` (bool)
- `status` (`draft` | `published`)

### 2.2 Front
- `<DynamicPage page="home" fallbackSections={[...]} />` : charge `cms_sections` triées, rend chaque type via registry.
- Mode édition : chaque section gagne une barre d'outils (↑↓ position, œil masquer, crayon édition props, poubelle).
- Drag & drop via `@dnd-kit/sortable` (déjà compatible RSC-free).
- Bouton "+ Ajouter une section" → menu des types disponibles avec preview miniature.

### 2.3 Homepage migrée en sections
La page d'accueil actuelle devient un assemblage par défaut de sections dont l'admin peut changer l'ordre/visibilité sans toucher au code.

---

## Vague 3 — Branding secondaire + polish

- Édition des **couleurs secondaires uniquement** (accent, muted, border) via color picker dans `AdminBranding` existant. Couleurs primaires + logo restent verrouillées par défaut, avec un cadenas explicite "Modifier le branding principal" pour éviter les accidents.
- Édition du menu de navigation (labels, ordre, visibilité — pas les routes).
- Édition du footer (colonnes, liens).
- Undo/Redo niveau session (Ctrl+Z / Ctrl+Shift+Z) sur la dernière édition.
- Logs d'édition dans `admin_audit_logs` (déjà en place).

---

## Hors-scope explicite
- Pas de page builder libre style Wix : on reste sur un système de **sections typées** maintenables.
- Pas de rate limiting backend (limitation connue de la plateforme — throttle côté client uniquement si nécessaire).
- Pas de multilingue dans cette première itération.
- Branding principal (logo, primary, typo) reste géré dans `AdminBranding` actuel, pas via crayon inline.

---

## Détails techniques

**Performance**
- Une seule requête initiale pour tous les `cms_content` (cache React Query 5 min, invalidation realtime).
- `<CmsText>` ne re-render que sa propre branche grâce à un sélecteur ciblé sur la clé.
- Mode édition désactivé par défaut → zéro coût pour les visiteurs.

**Sécurité**
- RLS strict : seuls les admins lisent les `draft` et écrivent.
- Trigger automatique versionnant chaque save dans `cms_content_versions`.
- Mode édition côté front protégé par `realIsAdmin` (pas par `isAdmin` qui peut être bypass par "view as user").
- Validation côté RPC : longueurs max, type matching `cms_content.type`.

**SEO**
- Rendu HTML inchangé pour le public (toujours `value_published`).
- Pas d'hydratation supplémentaire visible — le wrapper crayon n'existe que si `editMode && realIsAdmin`.

**Compatibilité**
- Aucune classe Tailwind ni token de design touché.
- Composants existants (`TrackCard`, `MiniPlayer`, etc.) inchangés.
- Migration progressive page par page.

---

Tu valides la **Vague 1** telle quelle, ou tu veux ajuster le scope (par exemple commencer uniquement par la homepage, ou inclure tout de suite les sections dynamiques) ?
