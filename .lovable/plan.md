## Objectif

Aujourd'hui un `artist` a un champ unique `kind` ∈ {artist, remixer, both} → modèle rigide, code dupliqué (`/artists` vs `/remixers`), liaisons tracks ↔ artists incohérentes (texte vs `artist_id`/`remixer_ids`), et aucun espace self-service pour un DJ lié.

On unifie tout autour d'un seul concept **Artist multi-rôles**.

---

## 1. Modèle de données unifié

**Migration SQL :**
- Ajouter `artists.roles text[] NOT NULL DEFAULT '{}'` (valeurs libres : `dj`, `remixer`, `producer`, `vocalist`, `band`).
- Backfill depuis `kind` :
  - `artist` / `both` → ajoute `dj`
  - `remixer` / `both` → ajoute `remixer`
- Garder `kind` pour compat descendante (lecture seule, déprécié en commentaire SQL).
- Index GIN sur `roles` pour filtres rapides.
- `resolve_or_create_artist(_name, _role)` : étendue pour accepter n'importe quel rôle, fusion sur slug, et merge le rôle dans `roles` (au lieu de créer un doublon par `kind`).

**Helper SQL :**
- `artist_stats(_artist_id uuid)` returns `(originals int, remixes int, featured int, total_downloads bigint, top_genre text, avg_bpm numeric)` — utilisé par la page profil.

## 2. Liaison Tracks ↔ Artists

- `admin_upsert_track` / `dj_submit_track` : passent désormais aussi `featured_artist_ids uuid[]` (résolus depuis `featured_artists` texte) → conservés en parallèle pour rétro-compat affichage.
- Composant `<ArtistCredit name artistId fallback />` : si `artistId` → `<Link to=/artists/:slug>`, sinon texte plain. Utilisé partout : `TrackRow`, `TrackGroupRow`, `ArtistDetail`, `MiniPlayer`, `HomeWidgets`, `DjTracks`.
- `TrackForm` : artist + remixers auto-suggèrent depuis `artists` (combobox), tagué par rôle.

## 3. Page profil enrichie `/artists/:slug`

Suppression de la duplication `/remixers/:slug` → 1 seule route `/artists/:slug`, le rôle est déduit des données. (`/remixers` reste comme **filtre** de la liste `/artists?role=remixer`.)

Onglets :
- **Tracks originales** : `artist_id = X AND remixer_ids = {}`
- **Remixes** : `X = ANY(remixer_ids)`
- **Featured** : `X = ANY(featured_artist_ids)`
- **Stats** : compteurs (total téléchargements, top genre, BPM moyen, dernier release), graphique mini sparkline (downloads/jour).

Bandeau "Rôles" remplace le badge unique : chips colorés `DJ`, `Remixer`, `Producer`...

## 4. Espace "Mon profil artiste"

Route : `/dj/profile`. Accessible uniquement si l'utilisateur a un `artists.user_id = auth.uid()`.

Si pas de profil lié :
- Bannière dans `DjDashboard` : "Demander la liaison à un artiste existant" (envoie un message support) ou "Créer mon profil" (popup admin uniquement).

Si lié :
- Édition bio, tagline, photo, banner, liens sociaux (insta, spotify, youtube, beatport, tiktok, sc, web).
- Choix multi-rôles (chips toggle).
- Aperçu en temps réel du rendu de la page publique (mini iframe ou rendu inline).
- Permissions : RLS existante `Linked user can update own artist` suffit (déjà en place).

Mise à jour menu DJ (`/dj`) : ajout entrée "Mon profil artiste" (visible seulement si lié).

---

## Détails techniques

**Migrations :**
```sql
ALTER TABLE public.artists ADD COLUMN roles text[] NOT NULL DEFAULT '{}';
UPDATE public.artists SET roles = CASE
  WHEN kind = 'both' THEN ARRAY['dj','remixer']
  WHEN kind = 'remixer' THEN ARRAY['remixer']
  ELSE ARRAY['dj'] END;
CREATE INDEX artists_roles_gin ON public.artists USING GIN (roles);

-- Reécriture resolve_or_create_artist(_name, _role text)
-- (merge role dans roles[] au lieu de filter par kind)

CREATE OR REPLACE FUNCTION public.artist_stats(_artist_id uuid)
RETURNS TABLE(originals int, remixes int, featured int, downloads bigint, top_genre text, avg_bpm numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t_orig AS (SELECT * FROM tracks WHERE artist_id = _artist_id AND status='approved'),
       t_rem  AS (SELECT * FROM tracks WHERE _artist_id = ANY(remixer_ids) AND status='approved'),
       t_all  AS (SELECT * FROM t_orig UNION SELECT * FROM t_rem)
  SELECT
    (SELECT count(*)::int FROM t_orig),
    (SELECT count(*)::int FROM t_rem),
    0::int,
    (SELECT count(*)::bigint FROM downloads d JOIN t_all t ON d.track_id = t.id),
    (SELECT genre FROM t_all GROUP BY genre ORDER BY count(*) DESC LIMIT 1),
    (SELECT round(avg(bpm)::numeric, 0) FROM t_all WHERE bpm IS NOT NULL);
$$;
```

**Front (nouveaux / modifiés) :**
- `src/components/ArtistCredit.tsx` — nouveau, lien cliquable réutilisable
- `src/lib/artistRoles.ts` — labels, couleurs, mapping
- `src/pages/ArtistDetail.tsx` — refonte tabs (Tracks/Remixes/Featured/Stats), supprime prop `kind`
- `src/pages/Remixers.tsx` — devient un appel à `/artists?role=remixer` (ou conservé comme liste filtrée)
- `src/pages/AdminArtists.tsx` — remplace `<select kind>` par multi-toggle roles
- `src/pages/DjProfile.tsx` — nouveau, formulaire édition self-service
- `src/pages/DjDashboard.tsx` — ajoute bannière "lier mon profil" + entrée nav
- `src/components/TrackRow.tsx`, `TrackGroupRow.tsx`, `MiniPlayer.tsx`, `HomeWidgets.tsx`, `TrendingArtists.tsx` — passent par `<ArtistCredit>`
- `src/App.tsx` — ajoute route `/dj/profile`, supprime `/remixers/:slug` (redirige vers `/artists/:slug`)

**Pas touché :** schéma `tracks`, RLS, autres pages publiques.

---

## Ce qui sera livré

1. Migration SQL ajout `roles` + index + backfill + nouvelle `artist_stats` + reécriture `resolve_or_create_artist`.
2. Composant `ArtistCredit` propagé dans toutes les listes de tracks.
3. Page `/artists/:slug` refondue avec 4 onglets et stats.
4. Page `/dj/profile` self-service pour utilisateurs liés.
5. Bannière + entrée nav dans `DjDashboard`.
6. AdminArtists multi-rôles.