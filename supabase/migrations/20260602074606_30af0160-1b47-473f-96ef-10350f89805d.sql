ALTER TABLE public.home_widgets
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.home_widgets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS home_widgets_parent_id_idx ON public.home_widgets(parent_id);
CREATE INDEX IF NOT EXISTS home_widgets_parent_position_idx ON public.home_widgets(parent_id, position);