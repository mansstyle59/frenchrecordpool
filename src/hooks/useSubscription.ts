import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionInfo {
  id: string;
  status: string;
  plan: string | null;
  plan_id: string | null;
  current_period_end: string | null;
  created_at: string;
  planName: string | null;
  planPriceCents: number | null;
  planCurrency: string | null;
  planInterval: string | null;
  isActive: boolean;
  isLifetime: boolean;
  daysLeft: number | null;
  expiresAt: Date | null;
}

export function useSubscription() {
  const { user, realIsAdmin } = useAuth();

  const query = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SubscriptionInfo | null> => {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) return null;
      let planRow: any = null;
      if (sub.plan_id) {
        const { data } = await supabase
          .from("subscription_plans")
          .select("name, price_cents, currency, interval")
          .eq("id", sub.plan_id)
          .maybeSingle();
        planRow = data;
      }
      const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
      const now = Date.now();
      const isActive =
        sub.status === "active" && (!end || end.getTime() > now);
      const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now) / 86_400_000)) : null;
      const isLifetime = !!end && end.getTime() - now > 50 * 365 * 86_400_000;
      return {
        id: sub.id,
        status: sub.status,
        plan: sub.plan,
        plan_id: sub.plan_id,
        current_period_end: sub.current_period_end,
        created_at: sub.created_at,
        planName: planRow?.name ?? sub.plan ?? null,
        planPriceCents: planRow?.price_cents ?? null,
        planCurrency: planRow?.currency ?? null,
        planInterval: planRow?.interval ?? null,
        isActive,
        isLifetime,
        daysLeft,
        expiresAt: end,
      };
    },
  });

  return {
    ...query,
    subscription: query.data ?? null,
    hasActive: realIsAdmin || (query.data?.isActive ?? false),
  };
}
