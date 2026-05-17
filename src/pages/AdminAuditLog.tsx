import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Disc3, Search, ScrollText, FileMusic, User, CreditCard, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTION_LABELS: Record<string, string> = {
  "track.create": "Création de track",
  "track.update": "Modification de track",
  "track.delete": "Suppression de track",
  "user.password_reset": "Réinitialisation de mot de passe",
  "subscription.create": "Création d'abonnement",
  "subscription.update": "Modification d'abonnement",
  "subscription.delete": "Suppression d'abonnement",
};

function actionIcon(action: string) {
  if (action.startsWith("track.")) return <FileMusic className="h-3.5 w-3.5" />;
  if (action.startsWith("subscription.")) return <CreditCard className="h-3.5 w-3.5" />;
  if (action === "user.password_reset") return <KeyRound className="h-3.5 w-3.5" />;
  return <User className="h-3.5 w-3.5" />;
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.endsWith(".delete")) return "destructive";
  if (action.endsWith(".create")) return "default";
  return "secondary";
}

export default function AdminAuditLog() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Récupère les emails des acteurs
  const actorIds = useMemo(() => Array.from(new Set(logs.map((l: any) => l.actor_id))), [logs]);
  const { data: actors = {} } = useQuery({
    queryKey: ["audit-actors", actorIds.join(",")],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, email, dj_name").in("user_id", actorIds);
      const m: Record<string, { email?: string; dj_name?: string }> = {};
      (data ?? []).forEach((p: any) => { m[p.user_id] = p; });
      return m;
    },
  });

  const filtered = useMemo(() => {
    let res = logs as any[];
    if (entity !== "all") res = res.filter(l => l.entity_type === entity);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(l =>
        (l.entity_label ?? "").toLowerCase().includes(q) ||
        (l.action ?? "").toLowerCase().includes(q) ||
        (actors[l.actor_id]?.email ?? "").toLowerCase().includes(q)
      );
    }
    return res;
  }, [logs, entity, search, actors]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">Admin</span>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
      </header>

      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Journal d'audit</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} action{filtered.length > 1 ? "s" : ""} enregistrée{filtered.length > 1 ? "s" : ""} (max 500 récentes)</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (action, cible, acteur)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entités</SelectItem>
              <SelectItem value="track">Tracks</SelectItem>
              <SelectItem value="user">Utilisateurs</SelectItem>
              <SelectItem value="subscription">Abonnements</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Cible</th>
                  <th className="px-4 py-3">Acteur</th>
                  <th className="px-4 py-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucune action enregistrée.</td></tr>
                ) : filtered.map((log: any) => {
                  const actor = actors[log.actor_id];
                  const hasDetails = log.details && Object.keys(log.details).length > 0;
                  return (
                    <tr key={log.id} className="hover:bg-secondary/30 align-top">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={actionVariant(log.action)} className="text-xs gap-1">
                          {actionIcon(log.action)}
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[260px] truncate">
                        {log.entity_label ?? log.entity_id ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {actor?.dj_name || actor?.email || log.actor_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[320px]">
                        {hasDetails ? (
                          <details>
                            <summary className="cursor-pointer hover:text-foreground">Voir</summary>
                            <pre className="mt-2 p-2 rounded bg-secondary/50 overflow-x-auto text-[10px]">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
