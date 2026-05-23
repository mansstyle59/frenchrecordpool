
## Widget Playlists — Spotify / Deezer / SoundCloud / Interne

### 1. Base de données

Nouvelle table `public.playlists` :
- `id`, `created_at`, `updated_at`, `created_by`
- `title` (text), `description` (text)
- `source` (text: `spotify` | `deezer` | `soundcloud` | `custom`)
- `source_url` (text, null si custom)
- `embed_id` (text, extrait via parsing côté admin: id Spotify, playlist Deezer, URL SoundCloud)
- `cover_url` (text), `accent_color` (hsl text)
- `tags` (text[]), `track_ids` (uuid[] — pour playlists `custom` du catalogue)
- `position` (int), `is_active` (bool)

RLS :
- Public : SELECT si `is_active = true`
- Admin : ALL via `has_role(auth.uid(),'admin')`

Nouveau type de widget `home_widgets.type = 'playlists_carousel'` avec config :
```json
{ "title": "Nos playlists", "playlist_ids": [...], "auto": false, "limit": 8 }
```
Réutilise le ciblage existant (`audience`, `devices`, `starts_at`, `ends_at`).

### 2. Frontend — composants

- `src/lib/playlistEmbed.ts` — parsing URL → `{source, embed_id}` + helpers `getEmbedSrc(playlist)` :
  - Spotify : `https://open.spotify.com/embed/playlist/{id}` (aussi album/track)
  - Deezer : `https://widget.deezer.com/widget/dark/playlist/{id}`
  - SoundCloud : `https://w.soundcloud.com/player/?url={encoded}&color=...`
- `src/components/widgets/PlaylistCard.tsx` — carte avec cover, badge source (logo), titre, tags, bouton "Écouter" qui ouvre le sheet d'embed
- `src/components/widgets/PlaylistEmbedSheet.tsx` — Sheet/Dialog plein écran (mobile) ou modal latéral (desktop) avec l'iframe responsive
- `src/components/widgets/CustomPlaylistPlayer.tsx` — pour `source='custom'` : liste des tracks → utilise `usePlayer()` + queue interne
- `src/components/widgets/PlaylistsCarousel.tsx` — utilise `HCarousel` existant, branché sur `home_widgets` config
- Intégration dans `src/components/HomeWidgets.tsx` (nouveau case `playlists_carousel`)

### 3. Page dédiée

- `src/pages/Playlists.tsx` (route `/playlists`) :
  - Grille responsive de toutes les playlists actives
  - Filtres : source (chips Spotify/Deezer/SoundCloud/Interne) + recherche texte + tags
  - SEO : title, meta, JSON-LD `ItemList`
- `src/pages/PlaylistDetail.tsx` (route `/playlists/:id`) :
  - Hero (cover + titre + tags) + embed plein large ou lecteur custom
- Lien dans le menu (Layout) si pertinent

### 4. Admin

- `src/pages/AdminPlaylists.tsx` (route `/admin/playlists`) :
  - Table : titre, source (icône), statut, position
  - Form modal : titre, description, URL source (parsing auto → preview embed live), cover, tags, accent_color, sélecteur de tracks (pour `custom`), is_active, position
  - Drag & drop reorder
- Entrée dans le menu admin (`src/pages/Admin.tsx`)
- Dans `AdminHomeWidgets.tsx` : config du widget `playlists_carousel` (titre, mode auto vs manuel, sélection multi de playlists, limite) + `TargetingEditor`

### 5. Sécurité & perf

- iframes : `sandbox="allow-scripts allow-same-origin allow-popups"`, `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"`
- Validation URL côté admin (regex stricte par source) avant insert
- Index sur `is_active`, `position`

### Détails techniques

```text
home_widgets (type=playlists_carousel)
  └─ config.playlist_ids[] ─→ playlists ─→ PlaylistCard ─→ EmbedSheet
                                                       └─→ CustomPlaylistPlayer (usePlayer)
```

Aucun secret ni provider OAuth requis : tous les embeds sont publics.
