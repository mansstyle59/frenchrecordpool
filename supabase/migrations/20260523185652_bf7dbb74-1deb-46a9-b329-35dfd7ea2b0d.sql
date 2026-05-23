-- Restrict linked artist self-update to safe columns via trigger
CREATE OR REPLACE FUNCTION public.artists_guard_linked_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Only enforce when caller is the linked user (not admin)
  IF OLD.user_id IS NOT NULL AND auth.uid() = OLD.user_id THEN
    -- Forbid changing sensitive / identity / ownership / moderation columns
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.name IS DISTINCT FROM OLD.name
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.roles IS DISTINCT FROM OLD.roles
       OR NEW.featured IS DISTINCT FROM OLD.featured
       OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
    THEN
      RAISE EXCEPTION 'forbidden_column_update' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_artists_guard_linked_user_update ON public.artists;
CREATE TRIGGER trg_artists_guard_linked_user_update
BEFORE UPDATE ON public.artists
FOR EACH ROW
EXECUTE FUNCTION public.artists_guard_linked_user_update();