
CREATE TABLE public.popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  bg_color text NOT NULL DEFAULT '222 30% 10%',
  text_color text NOT NULL DEFAULT '210 20% 95%',
  accent_color text NOT NULL DEFAULT '220 80% 58%',
  layout text NOT NULL DEFAULT 'center',
  trigger_type text NOT NULL DEFAULT 'delay',
  trigger_value integer NOT NULL DEFAULT 3,
  frequency text NOT NULL DEFAULT 'session',
  audience text NOT NULL DEFAULT 'all',
  devices text NOT NULL DEFAULT 'all',
  pages text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active popups"
ON public.popups FOR SELECT TO public
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now())
);

CREATE POLICY "Admins view all popups"
ON public.popups FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert popups"
ON public.popups FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update popups"
ON public.popups FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete popups"
ON public.popups FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER popups_updated_at
BEFORE UPDATE ON public.popups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_popups_active ON public.popups(is_active, priority DESC);
