# Améliorer tout le site — direction DJcity

Objectif : rendu proche de djcity.com (dense, éditorial, top-nav horizontale, sous-nav genres, cartes compactes) + qualité mobile/a11y sur tout le site.

## Contraintes respectées
- Tokens sémantiques uniquement (bg-background, text-foreground, primary, accent) — pas de couleur en dur.
- Bebas Neue / Barlow conservés.
- Aucune régression fonctionnelle (auth, player, CMS, admin).
- Backend touché uniquement pour corriger 2 findings sécurité en cours.

## Lot 1 — Fondations (ce lot, tout de suite)
1. **Header type DJcity** (`Layout.tsx`)
   - Barre du haut plus dense : logo compact + barre de recherche centrale expressive + actions à droite.
   - Sous-nav horizontale sticky : Home / Nouveautés / Playlists / DJs / Artistes / Stems / Shorts / Abonnements (masquée derrière burger ≤ md).
   - Sidebar Radix conservée en drawer mobile (SheetContent), plus de sidebar permanente desktop.
2. **A11y mobile**
   - `min-h-screen` → `min-h-dvh` (Layout, pages hero).
   - Tap targets 44×44 sur actions clés (auth, player, CTA nav).
   - `aria-label` sur les icon-only restants.
3. **Sécurité (obligatoire)**
   - `cms_content` : nouvelle policy publique qui expose colonnes safe uniquement (via vue security-barrier ou policy + REVOKE sur value_draft).
   - `tracks` : split policy — non-abonnés voient les colonnes non-sensibles, abonnés voient download_url / acapella_url / instrumental_url.

## Lot 2 — Cartes & listes (proposé ensuite)
- `TrackRow` / `TrackCard` compactés (hauteur, hover, cover 40–48px, badges genre/BPM/key alignés).
- Grille genres/artists/playlists : espacement DJcity (gap 12–16px, ratio 1:1).
- Empty states unifiés (icône + message + CTA).

## Lot 3 — Pages publiques (proposé ensuite)
- `NewReleases`, `Playlists`, `Remixers`, `Stems`, `Shorts`, `Pricing`, `ArtistDetail`, `TrackDetail` : `PageHero` uniformisé + filtres pill row + pagination visible.

## Lot 4 — Espaces user & admin (proposé ensuite)
- Dashboard / Downloads / Login / Signup : cartes compactes + états vides.
- AdminLayout : topbar dense + breadcrumbs + tables sticky header.

## Détails techniques Lot 1
- Header : nouveau composant `TopNav.tsx` + `SubNav.tsx` extraits de `Layout.tsx`.
- Container principal `min-h-dvh` + `pb-[env(safe-area-inset-bottom)]` sur main quand player actif.
- Migration SQL sécurité :
  ```
  -- CMS : vue publique sans value_draft
  DROP POLICY "Public reads published cms" ON public.cms_content;
  CREATE POLICY "Public reads published cms (safe cols)" ON public.cms_content
    FOR SELECT TO anon, authenticated
    USING (value_published IS NOT NULL);
  REVOKE SELECT ON public.cms_content FROM anon, authenticated;
  GRANT SELECT (id, key, type, value_published, published_at, updated_at) ON public.cms_content TO anon, authenticated;

  -- Tracks : audio URLs réservées aux abonnés
  DROP POLICY "Authenticated sees approved tracks" ON public.tracks;
  CREATE POLICY "Authenticated sees approved tracks" ON public.tracks
    FOR SELECT TO authenticated USING (status = 'approved');
  REVOKE SELECT ON public.tracks FROM authenticated;
  GRANT SELECT (<toutes colonnes sauf download_url, acapella_url, instrumental_url>) ON public.tracks TO authenticated;
  CREATE POLICY "Subscribers see full audio URLs" ON public.tracks
    FOR SELECT TO authenticated USING (status='approved' AND public.has_active_subscription(auth.uid()));
  GRANT SELECT (download_url, acapella_url, instrumental_url) ON public.tracks TO authenticated;
  ```
  (adaptation exacte au moment de l'exécution après inspection du schéma).

## Livraison
Lot 1 dans la foulée si tu valides. Chaque lot suivant sera lancé sur ton "go" pour garder la vue claire.
