import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface PresenceCtx {
  onlineIds: Set<string>;
  isOnline: (userId?: string | null) => boolean;
}

const Ctx = createContext<PresenceCtx>({ onlineIds: new Set(), isOnline: () => false });

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnlineIds(new Set());
      return;
    }
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <Ctx.Provider value={{ onlineIds, isOnline: (id) => !!id && onlineIds.has(id) }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePresence = () => useContext(Ctx);
