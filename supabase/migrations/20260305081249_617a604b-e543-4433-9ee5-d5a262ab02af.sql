
-- Fix profiles: restrict SELECT to own profile only
DROP POLICY "Anyone authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix user_roles: restrict SELECT to own roles only
DROP POLICY "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
