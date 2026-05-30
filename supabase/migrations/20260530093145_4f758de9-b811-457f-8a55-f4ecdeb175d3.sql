-- Restrict the realtime publication for cms_content to only broadcast non-draft columns.
-- This prevents authenticated subscribers from receiving unpublished draft content via Realtime.
ALTER PUBLICATION supabase_realtime DROP TABLE public.cms_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cms_content (key, type, value_published, published_at, updated_at);