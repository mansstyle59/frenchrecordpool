-- 1) Add DJ role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dj';

-- 2) Extend tracks
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_track_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'invalid_status: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tracks_validate_status ON public.tracks;
CREATE TRIGGER trg_tracks_validate_status
  BEFORE INSERT OR UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.validate_track_status();

CREATE INDEX IF NOT EXISTS idx_tracks_status ON public.tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_submitted_by ON public.tracks(submitted_by);

-- 3) Update tracks RLS to filter by approval
DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;
DROP POLICY IF EXISTS "Admins can insert tracks" ON public.tracks;
DROP POLICY IF EXISTS "Admins can update tracks" ON public.tracks;
DROP POLICY IF EXISTS "Admins can delete tracks" ON public.tracks;

CREATE POLICY "Public sees approved tracks"
  ON public.tracks FOR SELECT TO public
  USING (status = 'approved');

CREATE POLICY "Owners see their own tracks"
  ON public.tracks FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by);

CREATE POLICY "Admins see all tracks"
  ON public.tracks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tracks insert"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tracks update"
  ON public.tracks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tracks delete"
  ON public.tracks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "DJs can submit tracks"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by AND status = 'pending');

CREATE POLICY "DJs can update own pending or rejected"
  ON public.tracks FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by AND status IN ('pending','rejected'));

CREATE POLICY "DJs can delete own pending or rejected"
  ON public.tracks FOR DELETE TO authenticated
  USING (auth.uid() = submitted_by AND status IN ('pending','rejected'));

-- 4) track_revisions
CREATE TABLE IF NOT EXISTS public.track_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL,
  submitted_by uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_track_revisions_updated_at
  BEFORE UPDATE ON public.track_revisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.track_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DJs view own revisions"
  ON public.track_revisions FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "DJs insert own revisions"
  ON public.track_revisions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "DJs update own pending revisions"
  ON public.track_revisions FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by AND status = 'pending');

CREATE POLICY "Admins manage all revisions"
  ON public.track_revisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT policy: only SECURITY DEFINER triggers/functions insert.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 6) Helper to notify
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _type text, _title text, _body text, _link text, _data jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link, data)
  VALUES (_user_id, _type, _title, _body, _link, COALESCE(_data,'{}'::jsonb));
END $$;

-- 7) Triggers on tracks for notifications
CREATE OR REPLACE FUNCTION public.tracks_notify_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  dj_label text := COALESCE(NEW.artist, NEW.title, 'Nouveau morceau');
BEGIN
  IF NEW.status = 'pending' AND NEW.submitted_by IS NOT NULL THEN
    -- Notify DJ
    INSERT INTO public.notifications(user_id, type, title, body, link, data)
    VALUES (
      NEW.submitted_by, 'submission_received',
      'Soumission reçue',
      'Ton morceau « '||COALESCE(NEW.title,'sans titre')||' » est en attente de validation.',
      '/dj/tracks',
      jsonb_build_object('track_id', NEW.id)
    );
    -- Notify all admins
    FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications(user_id, type, title, body, link, data)
      VALUES (
        admin_id, 'new_pending_submission',
        'Nouvelle soumission',
        dj_label||' — '||COALESCE(NEW.title,'sans titre'),
        '/admin/queue',
        jsonb_build_object('track_id', NEW.id, 'submitted_by', NEW.submitted_by)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tracks_notify_on_insert ON public.tracks;
CREATE TRIGGER trg_tracks_notify_on_insert
  AFTER INSERT ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.tracks_notify_on_insert();

CREATE OR REPLACE FUNCTION public.tracks_notify_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.submitted_by IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, data)
      VALUES (
        NEW.submitted_by, 'submission_approved',
        'Morceau approuvé ✅',
        '« '||COALESCE(NEW.title,'sans titre')||' » est publié sur le site.',
        '/tracks/'||NEW.id,
        jsonb_build_object('track_id', NEW.id)
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, data)
      VALUES (
        NEW.submitted_by, 'submission_rejected',
        'Morceau refusé',
        COALESCE('Motif : '||NEW.rejection_reason, 'Ton morceau a été refusé.'),
        '/dj/tracks',
        jsonb_build_object('track_id', NEW.id, 'reason', NEW.rejection_reason)
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tracks_notify_on_status ON public.tracks;
CREATE TRIGGER trg_tracks_notify_on_status
  AFTER UPDATE OF status ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.tracks_notify_on_status_change();

-- 8) RPC: dj_submit_track
CREATE OR REPLACE FUNCTION public.dj_submit_track(_track jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  -- Auto-grant DJ role
  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_user, 'dj')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tracks (
    id, title, artist, genre, bpm, musical_key, version, label,
    duration, tags, cover_url, audio_url, preview_url,
    download_url, acapella_url, instrumental_url,
    created_by, submitted_by, status
  ) VALUES (
    v_id,
    _track->>'title',
    _track->>'artist',
    COALESCE(_track->>'genre',''),
    NULLIF(_track->>'bpm','')::int,
    _track->>'musical_key',
    COALESCE(_track->>'version','Original'),
    _track->>'label',
    _track->>'duration',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), '{}'::text[]),
    _track->>'cover_url',
    _track->>'audio_url',
    _track->>'preview_url',
    _track->>'download_url',
    _track->>'acapella_url',
    _track->>'instrumental_url',
    v_user, v_user, 'pending'
  );
  RETURN v_id;
END $$;

-- 9) RPC: dj_update_own_track (only own, only pending/rejected; sets back to pending)
CREATE OR REPLACE FUNCTION public.dj_update_own_track(_id uuid, _track jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT submitted_by, status INTO v_owner, v_status FROM public.tracks WHERE id = _id;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;
  IF v_status NOT IN ('pending','rejected') THEN
    RAISE EXCEPTION 'not_editable' USING ERRCODE = '42501';
  END IF;
  UPDATE public.tracks SET
    title = COALESCE(_track->>'title', title),
    artist = COALESCE(_track->>'artist', artist),
    genre = COALESCE(_track->>'genre', genre),
    bpm = NULLIF(_track->>'bpm','')::int,
    musical_key = _track->>'musical_key',
    version = COALESCE(_track->>'version', version),
    label = _track->>'label',
    duration = _track->>'duration',
    tags = COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), tags),
    cover_url = COALESCE(_track->>'cover_url', cover_url),
    audio_url = COALESCE(_track->>'audio_url', audio_url),
    preview_url = COALESCE(_track->>'preview_url', preview_url),
    download_url = _track->>'download_url',
    acapella_url = _track->>'acapella_url',
    instrumental_url = _track->>'instrumental_url',
    status = 'pending',
    rejection_reason = NULL,
    updated_at = now()
  WHERE id = _id;
END $$;

-- 10) RPC: admin_review_track (apply patch + decision)
CREATE OR REPLACE FUNCTION public.admin_review_track(
  _id uuid, _decision text, _reason text DEFAULT NULL, _patch jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'invalid_decision' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tracks SET
    title = COALESCE(_patch->>'title', title),
    artist = COALESCE(_patch->>'artist', artist),
    genre = COALESCE(_patch->>'genre', genre),
    bpm = COALESCE(NULLIF(_patch->>'bpm','')::int, bpm),
    musical_key = COALESCE(_patch->>'musical_key', musical_key),
    version = COALESCE(_patch->>'version', version),
    label = COALESCE(_patch->>'label', label),
    tags = COALESCE(
      CASE WHEN _patch ? 'tags'
        THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'tags'))
        ELSE tags END, tags),
    cover_url = COALESCE(_patch->>'cover_url', cover_url),
    release_date = COALESCE(NULLIF(_patch->>'release_date','')::date, release_date),
    status = _decision,
    rejection_reason = CASE WHEN _decision = 'rejected' THEN _reason ELSE NULL END,
    reviewed_by = v_user,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = _id;
END $$;

-- 11) Update admin_upsert_track to set submitted_by = admin and status='approved' on insert
CREATE OR REPLACE FUNCTION public.admin_upsert_track(_track jsonb, _id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  IF _id IS NULL THEN
    v_id := COALESCE((_track->>'id')::uuid, gen_random_uuid());
    INSERT INTO public.tracks (
      id, title, artist, genre, bpm, musical_key, version, label,
      duration, tags, cover_url, audio_url, preview_url,
      download_url, acapella_url, instrumental_url, created_by,
      submitted_by, status, reviewed_by, reviewed_at
    ) VALUES (
      v_id,
      _track->>'title',
      _track->>'artist',
      COALESCE(_track->>'genre',''),
      NULLIF(_track->>'bpm','')::int,
      _track->>'musical_key',
      COALESCE(_track->>'version','Original'),
      _track->>'label',
      _track->>'duration',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), '{}'::text[]),
      _track->>'cover_url',
      _track->>'audio_url',
      _track->>'preview_url',
      _track->>'download_url',
      _track->>'acapella_url',
      _track->>'instrumental_url',
      v_user, v_user, 'approved', v_user, now()
    );
  ELSE
    v_id := _id;
    UPDATE public.tracks SET
      title = COALESCE(_track->>'title', title),
      artist = COALESCE(_track->>'artist', artist),
      genre = COALESCE(_track->>'genre', genre),
      bpm = NULLIF(_track->>'bpm','')::int,
      musical_key = _track->>'musical_key',
      version = COALESCE(_track->>'version', version),
      label = _track->>'label',
      duration = _track->>'duration',
      tags = COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), tags),
      cover_url = COALESCE(_track->>'cover_url', cover_url),
      audio_url = COALESCE(_track->>'audio_url', audio_url),
      preview_url = COALESCE(_track->>'preview_url', preview_url),
      download_url = _track->>'download_url',
      acapella_url = _track->>'acapella_url',
      instrumental_url = _track->>'instrumental_url',
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END $function$;