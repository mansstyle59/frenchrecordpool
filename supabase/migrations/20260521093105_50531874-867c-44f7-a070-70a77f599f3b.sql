
CREATE OR REPLACE FUNCTION public.admin_set_user_access(_user_id uuid, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_until timestamptz := now() + interval '100 years';
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_existing FROM public.subscriptions WHERE user_id = _user_id LIMIT 1;

  IF _grant THEN
    IF v_existing.user_id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
      VALUES (_user_id, 'manual', 'active', v_until);
    ELSE
      UPDATE public.subscriptions
        SET status = 'active',
            current_period_end = v_until,
            plan = COALESCE(plan, 'manual')
        WHERE user_id = _user_id;
    END IF;
  ELSE
    IF v_existing.user_id IS NOT NULL THEN
      UPDATE public.subscriptions
        SET status = 'revoked',
            current_period_end = now()
        WHERE user_id = _user_id;
    END IF;
  END IF;
END $$;
