-- Add blocked flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- Admins can also update any profile (to block/unblock)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Override: admins always considered subscribed
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND (current_period_end IS NULL OR current_period_end > now())
    )
$$;

-- Admin: block / unblock a user
CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(_user_id uuid, _blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_block_self' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET is_blocked = _blocked, updated_at = now()
   WHERE user_id = _user_id;
  -- Désactive aussi tout abonnement actif en cas de blocage
  IF _blocked THEN
    UPDATE public.subscriptions SET status = 'blocked'
     WHERE user_id = _user_id AND status = 'active';
  END IF;
END $$;

-- Admin: delete a user completely
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_delete_self' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.favorites        WHERE user_id = _user_id;
  DELETE FROM public.downloads        WHERE user_id = _user_id;
  DELETE FROM public.promo_redemptions WHERE user_id = _user_id;
  DELETE FROM public.subscriptions    WHERE user_id = _user_id;
  DELETE FROM public.user_roles       WHERE user_id = _user_id;
  DELETE FROM public.profiles         WHERE user_id = _user_id;
  DELETE FROM auth.users              WHERE id = _user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;