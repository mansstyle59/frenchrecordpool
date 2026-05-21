
-- Enum pour types de promo
DO $$ BEGIN
  CREATE TYPE public.promo_discount_type AS ENUM ('percent','fixed','free_period','full_access');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  interval text NOT NULL DEFAULT 'month', -- month | year | lifetime
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage plans" ON public.subscription_plans;
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plan reference dans subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- Codes promo
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type public.promo_discount_type NOT NULL,
  discount_value numeric, -- percent (0-100), cents, months pour free_period, null pour full_access
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  expires_at timestamptz,
  allowed_plan_ids uuid[] DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_promo_codes_updated
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger (au lieu de CHECK)
CREATE OR REPLACE FUNCTION public.validate_promo_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  IF NEW.discount_type IN ('percent','fixed','free_period') AND NEW.discount_value IS NULL THEN
    RAISE EXCEPTION 'discount_value requis pour ce type de code';
  END IF;
  IF NEW.discount_type = 'percent' AND (NEW.discount_value < 0 OR NEW.discount_value > 100) THEN
    RAISE EXCEPTION 'percent doit être entre 0 et 100';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_promo_code ON public.promo_codes;
CREATE TRIGGER trg_validate_promo_code BEFORE INSERT OR UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.validate_promo_code();

-- Redemptions
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  granted_until timestamptz,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON public.promo_redemptions(promo_code_id);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users view own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins manage redemptions" ON public.promo_redemptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

-- RPC redeem_promo_code: valide et applique. SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text, _plan_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code record;
  v_user_count integer;
  v_granted_until timestamptz;
  v_existing record;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_code FROM public.promo_codes WHERE code = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive');
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
  END IF;
  IF v_code.allowed_plan_ids IS NOT NULL AND array_length(v_code.allowed_plan_ids,1) > 0 THEN
    IF _plan_id IS NULL OR NOT (_plan_id = ANY(v_code.allowed_plan_ids)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'plan_not_allowed');
    END IF;
  END IF;

  SELECT count(*) INTO v_user_count FROM public.promo_redemptions
    WHERE promo_code_id = v_code.id AND user_id = v_user;
  IF v_user_count >= COALESCE(v_code.per_user_limit, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  -- Application
  IF v_code.discount_type = 'full_access' THEN
    v_granted_until := now() + interval '100 years';
    INSERT INTO public.subscriptions (user_id, plan, status, current_period_end, plan_id)
    VALUES (v_user, 'promo', 'active', v_granted_until, _plan_id)
    ON CONFLICT DO NOTHING;
    UPDATE public.subscriptions
      SET status='active', current_period_end = v_granted_until, plan_id = COALESCE(_plan_id, plan_id)
      WHERE user_id = v_user;
  ELSIF v_code.discount_type = 'free_period' THEN
    SELECT * INTO v_existing FROM public.subscriptions WHERE user_id = v_user LIMIT 1;
    v_granted_until := COALESCE(GREATEST(v_existing.current_period_end, now()), now())
                       + (v_code.discount_value || ' months')::interval;
    IF v_existing.user_id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, plan, status, current_period_end, plan_id)
      VALUES (v_user, 'promo', 'active', v_granted_until, _plan_id);
    ELSE
      UPDATE public.subscriptions
        SET status='active', current_period_end = v_granted_until,
            plan_id = COALESCE(_plan_id, plan_id)
        WHERE user_id = v_user;
    END IF;
  ELSE
    -- percent / fixed : enregistré seulement (paiement à venir)
    v_granted_until := NULL;
  END IF;

  INSERT INTO public.promo_redemptions (promo_code_id, user_id, plan_id, granted_until)
  VALUES (v_code.id, v_user, _plan_id, v_granted_until);

  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE id = v_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'discount_type', v_code.discount_type,
    'discount_value', v_code.discount_value,
    'granted_until', v_granted_until
  );
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid) TO authenticated;
