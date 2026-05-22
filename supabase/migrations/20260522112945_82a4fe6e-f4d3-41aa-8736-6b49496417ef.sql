
CREATE OR REPLACE FUNCTION public.admin_clear_support_thread(_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.support_messages WHERE thread_id = _thread_id;
  UPDATE public.support_threads
    SET unread_for_admin = false,
        unread_for_user = false,
        last_message_at = now()
    WHERE id = _thread_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_support_thread(_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.support_messages WHERE thread_id = _thread_id;
  DELETE FROM public.support_threads WHERE id = _thread_id;
END $$;
