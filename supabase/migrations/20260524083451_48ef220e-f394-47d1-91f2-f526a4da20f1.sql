CREATE TABLE public.play_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_play_history_user_time ON public.play_history (user_id, played_at DESC);
CREATE INDEX idx_play_history_user_track ON public.play_history (user_id, track_id);

ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own play history"
ON public.play_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own play history"
ON public.play_history FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own play history"
ON public.play_history FOR DELETE TO authenticated
USING (auth.uid() = user_id);
