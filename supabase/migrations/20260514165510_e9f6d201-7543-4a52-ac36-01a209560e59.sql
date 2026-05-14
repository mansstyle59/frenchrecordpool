
CREATE TABLE public.site_branding (
  id text PRIMARY KEY DEFAULT 'global',
  site_name text NOT NULL DEFAULT 'French Record Pool',
  tagline text DEFAULT 'La référence des DJs francophones',
  logo_url text,
  favicon_url text,
  font_display text NOT NULL DEFAULT 'Space Grotesk',
  font_body text NOT NULL DEFAULT 'DM Sans',
  radius text NOT NULL DEFAULT '0.5rem',
  hero_title text DEFAULT 'Le pool de musique des DJs',
  hero_subtitle text DEFAULT 'Téléchargez les dernières exclusivités, edits et remixes.',
  footer_text text DEFAULT '© French Record Pool',
  -- Light mode HSL (format "H S% L%")
  light_background text NOT NULL DEFAULT '0 0% 98%',
  light_foreground text NOT NULL DEFAULT '222 47% 11%',
  light_primary text NOT NULL DEFAULT '220 75% 45%',
  light_accent text NOT NULL DEFAULT '0 72% 51%',
  light_card text NOT NULL DEFAULT '0 0% 100%',
  light_muted text NOT NULL DEFAULT '220 15% 91%',
  light_border text NOT NULL DEFAULT '220 15% 87%',
  -- Dark mode HSL
  dark_background text NOT NULL DEFAULT '222 30% 8%',
  dark_foreground text NOT NULL DEFAULT '210 20% 95%',
  dark_primary text NOT NULL DEFAULT '220 80% 58%',
  dark_accent text NOT NULL DEFAULT '0 72% 55%',
  dark_card text NOT NULL DEFAULT '222 28% 12%',
  dark_muted text NOT NULL DEFAULT '222 20% 20%',
  dark_border text NOT NULL DEFAULT '222 20% 20%',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_branding_singleton CHECK (id = 'global')
);

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view branding"
  ON public.site_branding FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert branding"
  ON public.site_branding FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update branding"
  ON public.site_branding FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_branding_updated_at
  BEFORE UPDATE ON public.site_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_branding (id) VALUES ('global');
