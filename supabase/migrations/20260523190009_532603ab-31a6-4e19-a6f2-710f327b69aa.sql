REVOKE ALL ON FUNCTION public.resolve_or_create_artist(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_or_create_artist(text, text) TO authenticated;