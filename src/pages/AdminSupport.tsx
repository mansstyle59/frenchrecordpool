import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/contexts/PresenceContext";
import AdminLayout from "@/components/admin/AdminLayout";
import SupportChat from "@/components/SupportChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Inbox, Trash2, Eraser } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface Thread {
  id: string;
  user_id: string;
  subject: string | null;
  last_message_at: string;
  unread_for_admin: boolean;
  closed: boolean;
  profile?: { dj_name: string | null; email: string | null; avatar_url: string | null } | null;
}

export default function AdminSupport() {
  const { isAdmin } = useAuth();
  const { isOnline } = usePresence();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Thread | null>(null);

  const { data: list = [] } = useQuery({
    queryKey: ["admin-support-threads"],
    enabled: isAdmin,
    queryFn: async (): Promise<Thread[]> => {
      const { data: threads } = await supabase
        .from("support_threads")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (!threads || threads.length === 0) return [];
      const ids = Array.from(new Set(threads.map((t: any) => t.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,dj_name,email,avatar_url")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return threads.map((t: any) => ({ ...t, profile: map.get(t.user_id) ?? null })) as Thread[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-support-threads-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-support-threads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <AdminLayout wide title="Support" subtitle="Messagerie entre les utilisateurs et l'équipe.">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 min-h-[600px]">
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-secondary/40">
            <Inbox className="h-4 w-4" />
            <span className="font-medium text-sm">Conversations ({list.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border max-h-[700px]">
            {list.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Aucune conversation.</p>
            ) : list.map((t) => {
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-secondary/40 transition-colors ${active ? "bg-secondary/60" : ""}`}
                >
                  <div className="h-9 w-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
                    {t.profile?.avatar_url ? (
                      <img src={t.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (t.profile?.dj_name || t.profile?.email || "?").slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {t.profile?.dj_name || t.profile?.email || "Utilisateur"}
                      </span>
                      {t.unread_for_admin && (
                        <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {t.profile?.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(t.last_message_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {selected ? (
            <>
              <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2">
                <div className="text-sm">
                  <span className="font-medium">{selected.profile?.dj_name || selected.profile?.email || "Utilisateur"}</span>
                  {selected.profile?.email && (
                    <span className="text-muted-foreground"> · {selected.profile.email}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eraser className="h-3.5 w-3.5" /> Vider
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Vider la conversation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tous les messages de cette conversation seront supprimés. Le fil restera ouvert.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            const { error } = await supabase.rpc("admin_clear_support_thread", { _thread_id: selected.id });
                            if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
                            toast({ title: "Conversation vidée" });
                            qc.invalidateQueries({ queryKey: ["admin-support-threads"] });
                            setSelected({ ...selected });
                          }}
                        >Vider</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le fil entier sera supprimé. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            const { error } = await supabase.rpc("admin_delete_support_thread", { _thread_id: selected.id });
                            if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
                            toast({ title: "Conversation supprimée" });
                            setSelected(null);
                            qc.invalidateQueries({ queryKey: ["admin-support-threads"] });
                          }}
                        >Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <SupportChat
                key={selected.id}
                threadOverride={{ id: selected.id, user_id: selected.user_id }}
                className="h-[540px]"
              />
            </>
          ) : (
            <div className="h-[600px] flex items-center justify-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Sélectionne une conversation pour répondre.
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
