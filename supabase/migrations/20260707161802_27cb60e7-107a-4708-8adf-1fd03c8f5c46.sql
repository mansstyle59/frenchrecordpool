
-- Fix 1: hide value_draft from public/authenticated at column level
REVOKE SELECT (value_draft) ON public.cms_content FROM anon;
REVOKE SELECT (value_draft) ON public.cms_content FROM authenticated;

-- Admin-only RPC to read full CMS content (including drafts)
CREATE OR REPLACE FUNCTION public.admin_get_cms_all()
RETURNS SETOF public.cms_content
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.cms_content;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_cms_all() TO authenticated;

-- Fix 2: hide sensitive audio URL columns from all direct table reads
-- (Access continues via the existing get_track_urls RPC + download-track edge fn)
REVOKE SELECT (download_url, acapella_url, instrumental_url) ON public.tracks FROM anon;
REVOKE SELECT (download_url, acapella_url, instrumental_url) ON public.tracks FROM authenticated;
