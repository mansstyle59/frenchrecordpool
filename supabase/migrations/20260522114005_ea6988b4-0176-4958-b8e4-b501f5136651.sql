
-- DJ proposes a revision on an approved track
CREATE OR REPLACE FUNCTION public.dj_submit_track_revision(_track_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_title text;
  v_rev_id uuid;
  admin_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT submitted_by, status, title INTO v_owner, v_status, v_title FROM public.tracks WHERE id = _track_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE='42501';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'not_approved' USING ERRCODE='42501';
  END IF;

  -- Cancel any previous pending revision for same track from same user
  UPDATE public.track_revisions
    SET status = 'superseded', updated_at = now()
    WHERE track_id = _track_id AND submitted_by = v_user AND status = 'pending';

  INSERT INTO public.track_revisions(track_id, submitted_by, payload, status)
  VALUES (_track_id, v_user, _payload, 'pending')
  RETURNING id INTO v_rev_id;

  INSERT INTO public.notifications(user_id, type, title, body, link, data)
  VALUES (v_user, 'revision_submitted',
    'Modification envoyée',
    'Ta demande de modification pour « '||COALESCE(v_title,'morceau')||' » est en attente.',
    '/dj/tracks',
    jsonb_build_object('track_id', _track_id, 'revision_id', v_rev_id));

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, type, title, body, link, data)
    VALUES (admin_id, 'new_revision_request',
      'Nouvelle demande de modification',
      'Sur « '||COALESCE(v_title,'morceau')||' »',
      '/admin/queue',
      jsonb_build_object('track_id', _track_id, 'revision_id', v_rev_id));
  END LOOP;

  RETURN v_rev_id;
END $$;

-- Admin applies a revision: merges payload into tracks
CREATE OR REPLACE FUNCTION public.admin_apply_track_revision(_revision_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rev record;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_rev FROM public.track_revisions WHERE id = _revision_id;
  IF v_rev.id IS NULL THEN RAISE EXCEPTION 'revision_not_found'; END IF;

  PERFORM public.admin_upsert_track(v_rev.payload, v_rev.track_id);

  UPDATE public.track_revisions
    SET status='applied', reviewed_by=v_user, reviewed_at=now(), updated_at=now()
    WHERE id = _revision_id;

  INSERT INTO public.notifications(user_id, type, title, body, link, data)
  VALUES (v_rev.submitted_by, 'revision_applied',
    'Modification appliquée ✅',
    'Tes changements ont été publiés.',
    '/tracks/'||v_rev.track_id,
    jsonb_build_object('track_id', v_rev.track_id, 'revision_id', _revision_id));
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_track_revision(_revision_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rev record;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_rev FROM public.track_revisions WHERE id = _revision_id;
  IF v_rev.id IS NULL THEN RAISE EXCEPTION 'revision_not_found'; END IF;

  UPDATE public.track_revisions
    SET status='rejected', rejection_reason=_reason, reviewed_by=v_user, reviewed_at=now(), updated_at=now()
    WHERE id = _revision_id;

  INSERT INTO public.notifications(user_id, type, title, body, link, data)
  VALUES (v_rev.submitted_by, 'revision_rejected',
    'Modification refusée',
    COALESCE('Motif : '||_reason, 'Ta demande de modification a été refusée.'),
    '/dj/tracks',
    jsonb_build_object('track_id', v_rev.track_id, 'revision_id', _revision_id));
END $$;
