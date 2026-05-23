## Plan — Étendre & améliorer les widgets de la home

### 1. Nouveaux widgets

**a. `top_downloads_period`** — Top téléchargements 7 j / 30 j / all-time
- Config : `period` (`7d` | `30d` | `all`), `limit`, `title`, `see_all_url`
- Requête : agrégation `downloads` filtrée par `downloaded_at >= now() - interval` côté client (RLS publique sur tracks ; pour la période on appellera une RPC `top_downloads_period(_days int, _limit int)` SECURITY DEFINER lisant `downloads`).
- UI : même style que TrackGrid, badge période (7J/30J/ALL), tabs cliquables pour switcher.

**b. `trending_artists`** — Artistes en hausse
- Config : `period`, `limit`, `title`
- Requête : RPC `trending_artists(_days int, _limit int)` qui ordonne `artists` par downloads de leurs tracks sur la période.
- UI : cartes circulaires + delta `+12%` animé.

**c. `featured_genres`** — Genres en vedette (mosaïque)
- Config : `title`, `genres` (manuel : nom + cover/url + accent) **ou** `auto: true` (auto-pick top genres).
- UI : grille de cartes mosaïque (cover blur + nom centré), lien `/genre/[slug]`.

**d. `welcome_banner`** — Bannière personnalisée selon abonnement
- Config : `title_anon`, `body_anon`, `cta_anon`, `title_subscribed`, `body_subscribed`, `cta_subscribed`, `bg_url`.
- Logique : lit `useAuth()` + `useActiveSubscription()` pour switcher le contenu.

### 2. Améliorations widgets existants

**Skeletons + animations cohérents** — extraire `<WidgetSkeleton variant="list" | "grid" | "carousel" />` réutilisable, animations stagger Framer Motion (déjà partiellement présent — uniformiser sur `top_downloads`, `new_releases`, `artist_carousel`, `top_artists`, `genres_cloud`).

**Carousels horizontaux scroll-snap** — convertir `artist_carousel`, `top_artists`, nouveau `trending_artists`, `dj_shorts` en `snap-x snap-mandatory` avec flèches desktop (boutons prev/next visibles ≥ md) + fade edges. Composant partagé `<HCarousel>`.

**Hover preview audio** — sur les covers de `TrackRow` et cartes du `FeaturedTrack` / grids : au hover desktop (≥ md), bouton Play overlay → déclenche `usePlayer().play(track)` sur le preview_url. Auto-stop on mouseleave. Pas de changement mobile.

**Drag & drop admin** — déjà présent dans `AdminHomeWidgets`. Renforcer : indicateur visuel de drop (ligne d'insertion), `aria-grabbed`, raccourcis clavier (↑/↓ pour repositionner), persistance immédiate optionnelle.

### 3. Ciblage des widgets (comme popups)

Migration `home_widgets` :
- `audience text not null default 'all'` (`all` | `anon` | `subscribed` | `dj`)
- `devices text not null default 'all'` (`all` | `mobile` | `desktop`)
- `starts_at timestamptz`
- `ends_at timestamptz`

Côté front (`HomeWidgets.tsx`) :
- Filtrer en plus de `is_active` : window de dates, device (via `useMediaQuery`), audience (via `useAuth`+subscription).
- Côté admin : UI commune `<TargetingPanel>` réutilisée du composant popups, intégrée dans l'éditeur de widget.

### 4. Détails techniques

```text
src/components/widgets/
  HCarousel.tsx               (nouveau, scroll-snap + flèches)
  WidgetSkeleton.tsx          (nouveau, variants)
  TopDownloadsPeriod.tsx      (nouveau)
  TrendingArtists.tsx         (nouveau)
  FeaturedGenres.tsx          (nouveau)
  WelcomeBanner.tsx           (nouveau)
src/components/admin/
  TargetingPanel.tsx          (extrait/partagé)
src/lib/
  useDeviceMatch.ts           (mobile/desktop helper)
supabase/migrations/
  *_home_widgets_targeting.sql
  *_top_downloads_rpc.sql
```

RPC SQL :
```sql
create or replace function public.top_downloads_period(_days int, _limit int)
returns setof public.tracks language sql stable security definer set search_path=public as $$
  select t.* from public.tracks t
  join public.downloads d on d.track_id = t.id
  where t.status = 'approved'
    and (_days is null or d.downloaded_at >= now() - (_days || ' days')::interval)
  group by t.id order by count(d.id) desc limit _limit;
$$;

create or replace function public.trending_artists(_days int, _limit int)
returns table(artist_id uuid, name text, slug text, photo_url text, downloads_count bigint)
language sql stable security definer set search_path=public as $$
  select a.id, a.name, a.slug, a.photo_url, count(d.id)
  from public.artists a
  join public.tracks t on t.artist_id = a.id and t.status='approved'
  join public.downloads d on d.track_id = t.id
  where d.downloaded_at >= now() - (_days || ' days')::interval
  group by a.id order by count(d.id) desc limit _limit;
$$;
```

Inscription dans `TYPE_META` (admin) + `WidgetRenderer switch` + presets mis à jour (ex. preset "DJ home" inclut `welcome_banner` + `top_downloads_period` + `trending_artists` + `featured_genres`).

### 5. Hors-périmètre (à demander si besoin)

- Pas de touche au système de design tokens.
- Pas de nouvelle table.
- Pas de modification du MiniPlayer (réutilisation via `usePlayer`).
