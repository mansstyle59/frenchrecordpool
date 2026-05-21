
CREATE OR REPLACE FUNCTION public.cms_save_draft(_key text, _type text, _value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  IF _type NOT IN ('text','richtext','image','url','color','button','link','style','visibility') THEN
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
END $function$;
