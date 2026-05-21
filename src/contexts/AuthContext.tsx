import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  profile: { dj_name: string | null; email: string | null; avatar_url: string | null } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, isAdmin: false,
  hasActiveSubscription: false, profile: null, signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer fetching to avoid deadlock
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setIsAdmin(false);
        setHasActiveSubscription(false);
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      const [rolesRes, profileRes, subRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("dj_name, email, avatar_url, is_blocked").eq("user_id", userId).single(),
        supabase.from("subscriptions").select("status, current_period_end").eq("user_id", userId).eq("status", "active"),
      ]);

      const admin = rolesRes.data?.some((r: any) => r.role === "admin") ?? false;

      // Compte bloqué : on déconnecte immédiatement (sauf admin)
      if ((profileRes.data as any)?.is_blocked && !admin) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          alert("Votre compte a été bloqué. Contactez un administrateur.");
        }
        setIsAdmin(false);
        setHasActiveSubscription(false);
        setProfile(null);
        return;
      }

      setIsAdmin(admin);
      setProfile(profileRes.data ?? null);
      const activeSub = subRes.data?.some((s: any) =>
        s.status === "active" && (!s.current_period_end || new Date(s.current_period_end) > new Date())
      );
      // Les admins ont accès à tout
      setHasActiveSubscription(admin || (activeSub ?? false));
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, hasActiveSubscription, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
