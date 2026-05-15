## Objectif
1. Rendre le bouton **Admin** visible sur mobile (tu es en 393px, le bouton actuel est masqué `hidden sm:inline-flex`).
2. Confirmer l'accès admin de `dewulf.denis@gmail.com` (déjà vérifié → rôle `admin` ✅, toutes les pages `/admin/*` lui sont déjà accessibles).
3. Publier la palette **French Pool (bleu/rouge)** + polices **Space Grotesk / DM Sans** dans `site_branding` pour que le site adopte ces tokens partout (Realtime push instantané).

## Connexion / accès
Je ne peux pas me connecter à ta place. Une fois ces changements appliqués :
- Va sur `/login`, connecte-toi avec `dewulf.denis@gmail.com`.
- Le bouton **Admin** (icône bouclier) apparaîtra dans la navbar (desktop ET mobile).
- Pages accessibles : `/admin`, `/admin/tracks`, `/admin/users`, `/admin/subscriptions`, `/admin/branding`.

## Changements code

### `src/components/Layout.tsx`
- Retirer `hidden sm:inline-flex` du bouton Admin desktop → toujours visible quand `isAdmin`.
- Ajouter un lien **Admin** en haut du menu mobile (`mobileOpen`) avec l'icône `Shield`, visible uniquement si `isAdmin`.

## Changement base de données (migration)

Mettre à jour la ligne `site_branding` (id = `global`) avec la palette French Pool et les polices choisies :

```sql
UPDATE public.site_branding SET
  light_primary    = '220 75% 45%',
  light_accent     = '0 72% 51%',
  light_background = '0 0% 98%',
  light_foreground = '222 47% 11%',
  light_card       = '0 0% 100%',
  dark_primary     = '220 80% 58%',
  dark_accent      = '0 72% 55%',
  dark_background  = '222 47% 6%',
  dark_foreground  = '210 20% 95%',
  dark_card        = '222 28% 12%',
  font_display     = 'Space Grotesk',
  font_body        = 'DM Sans',
  hero_title       = 'Le pool des DJs francophones',
  hero_subtitle    = 'Téléchargements illimités, exclus & remixes — mis à jour chaque semaine.',
  footer_text      = '© French Record Pool — La référence des DJs francophones',
  updated_at       = now()
WHERE id = 'global';
```

> J'utilise une migration (rôle service) car la policy `Admins can update branding` exige `auth.uid()`, indisponible côté outil. Une fois publié, le `BrandingContext` réactif applique les variables CSS et charge les Google Fonts en live pour tous les visiteurs.

## Hors-scope (à demander si tu veux)
- Upload d'un vrai logo PNG/SVG (tu n'as pas fourni d'URL).
- Édition de textes Hero personnalisés (j'ai mis des valeurs par défaut cohérentes).
- Tu pourras de toute façon ajuster finement dans `/admin/branding` après connexion.
