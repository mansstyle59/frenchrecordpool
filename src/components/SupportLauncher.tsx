import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import SupportChat from "./SupportChat";
import { motion, AnimatePresence } from "framer-motion";

export default function SupportLauncher() {
  const { user, realIsAdmin } = useAuth();
  const { currentTrack } = usePlayer();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user || realIsAdmin) return;
    let threadId: string | null = null;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    const refresh = async () => {
      const { data: thread } = await supabase
        .from("support_threads")
        .select("id, unread_for_user")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!thread) { setUnread(0); return; }
      const wasNull = threadId === null;
      threadId = thread.id;
      // Once we know the thread id, attach a thread-scoped messages listener.
      // This avoids subscribing to the whole support_messages table.
      if (wasNull && threadId) {
        ch?.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${threadId}` },
          (payload) => {
            const m = payload.new as any;
            if (m.is_admin && !open) refresh();
          },
        );
      }
      if (!thread.unread_for_user) { setUnread(0); return; }
      const { count } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .eq("is_admin", true);
      setUnread(count ?? 0);
    };

    ch = supabase
      .channel(`support-launcher:${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "support_threads", filter: `user_id=eq.${user.id}` },
        refresh);
    ch.subscribe();
    refresh();

    return () => { if (ch) supabase.removeChannel(ch); };
  }, [user, realIsAdmin, open]);


  useEffect(() => { if (open) setUnread(0); }, [open]);

  if (!user || realIsAdmin) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(380px,calc(100vw-2rem))] shadow-2xl rounded-2xl overflow-hidden"
          >
            <SupportChat className="h-[520px]" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-4 sm:right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elegant flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat support"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </motion.button>
    </>
  );
}
