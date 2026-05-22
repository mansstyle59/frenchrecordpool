
CREATE TABLE public.home_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.home_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active widgets"
ON public.home_widgets FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Admins view all widgets"
ON public.home_widgets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert widgets"
ON public.home_widgets FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update widgets"
ON public.home_widgets FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete widgets"
ON public.home_widgets FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER home_widgets_updated_at
BEFORE UPDATE ON public.home_widgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_home_widgets_pos ON public.home_widgets(position);
