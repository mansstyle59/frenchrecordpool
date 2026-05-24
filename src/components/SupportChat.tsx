import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/contexts/PresenceContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** Admin mode: chat for a specific thread/user */
  threadOverride?: { id: string; user_id: string } | null;
  className?: string;
}

interface Msg {
  id: string;
  thread_id: string;
  sender_id: string;
  is_admin: boolean;
  body: string;
  created_at: string;
}

export default function SupportChat({ threadOverride = null, className }: Props) {
  const { user, realIsAdmin } = useAuth();
  const isAdminMode = !!threadOverride;
  const [threadId, setThreadId] = useState<string | null>(threadOverride?.id ?? null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ensure thread exists (user mode) + load messages
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!user) return;
      setLoading(true);
      let tid = threadOverride?.id ?? null;
      if (!tid) {
        // user mode: get or create
        const { data: existing } = await supabase
          .from("support_threads")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          tid = existing.id;
        } else {
          const { data: inserted, error } = await supabase
            .from("support_threads")
            .insert({ user_id: user.id })
            .select("id")
            .single();
          if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            setLoading(false);
            return;
          }
          tid = inserted.id;
        }
      }
      if (cancelled || !tid) return;
      setThreadId(tid);

      const { data: msgs } = await supabase
        .from("support_messages")
        .select("*")
        .eq("thread_id", tid)
        .order("created_at");
      if (!cancelled) {
        setMessages((msgs ?? []) as Msg[]);
        setLoading(false);
      }

      // Mark as read for current side
      await supabase
        .from("support_threads")
        .update(isAdminMode ? { unread_for_admin: false } : { unread_for_user: false })
        .eq("id", tid);
    }
    init();
    return () => { cancelled = true; };
  }, [user, threadOverride?.id, isAdminMode]);

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`support_messages:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as Msg];
          });
          // mark read
          supabase
            .from("support_threads")
            .update(isAdminMode ? { unread_for_admin: false } : { unread_for_user: false })
            .eq("id", threadId);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, isAdminMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || !threadId || !user) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      is_admin: isAdminMode && realIsAdmin,
      body: text,
    });
    setSending(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
  };

  return (
    <div className={`flex flex-col bg-card border border-border rounded-xl overflow-hidden ${className ?? "h-[480px]"}`}>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-secondary/40">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">
          {isAdminMode ? "Conversation" : "Support — discuter avec un admin"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center pt-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {isAdminMode
              ? "Aucun message dans cette conversation pour l'instant."
              : "Posez votre question, un admin vous répondra rapidement."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = isAdminMode ? m.is_admin : m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 opacity-70`}>
                    {m.is_admin ? "Admin · " : ""}
                    {new Date(m.created_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-2 flex gap-2 items-end">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Écrire un message... (Entrée pour envoyer)"
          rows={1}
          className="resize-none min-h-[40px] max-h-[120px] bg-secondary border-border"
          disabled={sending}
        />
        <Button onClick={send} disabled={!body.trim() || sending} size="icon" className="shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
