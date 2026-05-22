-- 1) Chat support: threads + messages
CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_admin boolean NOT NULL DEFAULT false,
  unread_for_user boolean NOT NULL DEFAULT false,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX support_threads_user_unique ON public.support_threads(user_id);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own thread" ON public.support_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own thread" ON public.support_threads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own thread" ON public.support_threads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete threads" ON public.support_threads
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_thread_idx ON public.support_messages(thread_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read messages of own thread" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Insert messages in own thread" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
    )
  );

-- Trigger: bump last_message_at + unread flags
CREATE OR REPLACE FUNCTION public.support_after_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_threads
    SET last_message_at = NEW.created_at,
        unread_for_admin = CASE WHEN NEW.is_admin THEN unread_for_admin ELSE true END,
        unread_for_user  = CASE WHEN NEW.is_admin THEN true ELSE unread_for_user END,
        closed = false
    WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_support_after_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_after_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;

-- 2) Admin assigns a plan to a user
CREATE OR REPLACE FUNCTION public.admin_assign_plan(_user_id uuid, _plan_id uuid, _months integer DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan record;
  v_until timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = _plan_id LIMIT 1;
  IF v_plan.id IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  IF v_plan.interval = 'lifetime' OR _months IS NULL OR _months <= 0 THEN
    v_until := now() + interval '100 years';
  ELSIF v_plan.interval = 'year' THEN
    v_until := now() + (_months || ' years')::interval;
  ELSE
    v_until := now() + (_months || ' months')::interval;
  END IF;

  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id) THEN
    UPDATE public.subscriptions
      SET plan = v_plan.slug, plan_id = v_plan.id, status = 'active',
          current_period_end = v_until
      WHERE user_id = _user_id;
  ELSE
    INSERT INTO public.subscriptions(user_id, plan, plan_id, status, current_period_end)
    VALUES (_user_id, v_plan.slug, v_plan.id, 'active', v_until);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancel_subscription(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE='42501';
  END IF;
  UPDATE public.subscriptions
    SET status = 'canceled', current_period_end = now()
    WHERE user_id = _user_id;
END $$;

-- User self-cancel (will lose access immediately)
CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  UPDATE public.subscriptions
    SET status = 'canceled'
    WHERE user_id = auth.uid() AND status = 'active';
END $$;