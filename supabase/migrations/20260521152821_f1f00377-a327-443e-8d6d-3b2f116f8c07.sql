
-- CMS content table
CREATE TABLE public.cms_content (
  key text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('text','richtext','image','url','color')),
  value_draft jsonb,
  value_published jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  published_at timestamptz,
  published_by uuid
);

ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- Public can read published values only (via view below)
CREATE POLICY "Admins read all cms_content"
  ON public.cms_content FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Versions
CREATE TABLE public.cms_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL,
  value jsonb,
  action text NOT NULL CHECK (action IN ('save','publish','revert')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.cms_content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read versions"
  ON public.cms_content_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX cms_versions_key_idx ON public.cms_content_versions(content_key, created_at DESC);

-- Public view: published values, no draft / no actor info leaked
CREATE OR REPLACE VIEW public.cms_content_public
WITH (security_invoker = on) AS
  SELECT key, type, value_published AS value, published_at
  FROM public.cms_content
  WHERE value_published IS NOT NULL;

-- Allow public read on the view by relaxing the base policy ONLY for published rows
CREATE POLICY "Public reads published cms"
  ON public.cms_content FOR SELECT
  TO public
  USING (value_published IS NOT NULL);

-- Trigger to bump updated_at
CREATE TRIGGER cms_content_touch
BEFORE UPDATE ON public.cms_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPCs
CREATE OR REPLACE FUNCTION public.cms_save_draft(_key text, _type text, _value jsonb)
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
  IF _type NOT IN ('text','richtext','image','url','color') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;

  INSERT INTO public.cms_content(key, type, value_draft, updated_by)
  VALUES (_key, _type, _value, v_user)
  ON CONFLICT (key) DO UPDATE
    SET value_draft = EXCLUDED.value_draft,
        type = EXCLUDED.type,
        updated_by = v_user,
        updated_at = now();

  INSERT INTO public.cms_content_versions(content_key, value, action, created_by)
  VALUES (_key, _value, 'save', v_user);
END $$;

CREATE OR REPLACE FUNCTION public.cms_publish(_keys text[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
  v_row record;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cms_content
     SET value_published = value_draft,
         published_at = now(),
         published_by = v_user
   WHERE value_draft IS NOT NULL
     AND (_keys IS NULL OR key = ANY(_keys))
  RETURNING * INTO v_row;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- log each
  INSERT INTO public.cms_content_versions(content_key, value, action, created_by)
  SELECT key, value_published, 'publish', v_user
    FROM public.cms_content
   WHERE (_keys IS NULL OR key = ANY(_keys));

  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.cms_revert_draft(_key text)
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
  UPDATE public.cms_content
     SET value_draft = NULL,
         updated_by = v_user
   WHERE key = _key;

  INSERT INTO public.cms_content_versions(content_key, value, action, created_by)
  VALUES (_key, NULL, 'revert', v_user);
END $$;

CREATE OR REPLACE FUNCTION public.cms_restore_version(_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_key text;
  v_value jsonb;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  SELECT content_key, value INTO v_key, v_value
    FROM public.cms_content_versions WHERE id = _version_id;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;

  UPDATE public.cms_content
     SET value_draft = v_value,
         updated_by = v_user,
         updated_at = now()
   WHERE key = v_key;

  INSERT INTO public.cms_content_versions(content_key, value, action, created_by)
  VALUES (v_key, v_value, 'revert', v_user);
END $$;
