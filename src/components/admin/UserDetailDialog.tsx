import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Heart, CalendarDays, Crown, Mail, User as UserIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: any | null;
  isAdmin?: boolean;
  subscription?: any;
}

export default function UserDetailDialog({ open, onOpenChange, profile, isAdmin, subscription }: Props) {
  const enabled = !!profile && open;

  const { data: stats } = useQuery({
    queryKey: ["admin-user-stats", profile?.user_id],
    enabled,
    queryFn: async () => {
      const [downloads, favorites, recent] = await Promise.all([
        supabase.from("downloads").select("id", { count: "exact", head: true }).eq("user_id", profile.user_id),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", profile.user_id),
        supabase
          .from("downloads")
          .select("downloaded_at, track_id, tracks(title, artist)")
          .eq("user_id", profile.user_id)
          .order("downloaded_at", { ascending: false })
          .limit(10),
      ]);
      return {
        downloads: downloads.count ?? 0,
        favorites: favorites.count ?? 0,
        recent: (recent.data ?? []) as any[],
      };
    },
  });

  if (!profile) return null;
  const active =
    subscription &&
    subscription.status === "active" &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-bold">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.dj_name || profile.email || "?").slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              <span>{profile.dj_name || "Sans nom"}</span>
              <span className="text-xs text-muted-foreground font-normal">{profile.email}</span>
            </div>
            {isAdmin && (
              <Badge className="ml-auto bg-accent/15 text-accent border-accent/30 gap-1">
                <Crown className="h-3 w-3" /> Admin
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat icon={<Download className="h-3 w-3" />} label="Téléchargements" value={stats?.downloads ?? "—"} />
          <Stat icon={<Heart className="h-3 w-3" />} label="Favoris" value={stats?.favorites ?? "—"} />
          <Stat
            icon={<Crown className="h-3 w-3" />}
            label="Abonnement"
            value={active ? subscription?.plan ?? "actif" : "—"}
            tone={active ? "primary" : "muted"}
          />
          <Stat
            icon={<CalendarDays className="h-3 w-3" />}
            label="Inscrit le"
            value={new Date(profile.created_at).toLocaleDateString("fr-FR")}
          />
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
            10 derniers téléchargements
          </h4>
          {stats?.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun téléchargement.</p>
          ) : (
            <ul className="text-xs divide-y divide-border rounded-md border border-border bg-card/40 max-h-64 overflow-y-auto">
              {(stats?.recent ?? []).map((d, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="truncate">
                    <span className="font-medium">{d.tracks?.title ?? "Track supprimée"}</span>
                    {d.tracks?.artist && <span className="text-muted-foreground"> — {d.tracks.artist}</span>}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Date(d.downloaded_at).toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Identifiants</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-border bg-card/40 px-3 py-2 flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" /> {profile.email ?? "—"}
            </div>
            <div className="rounded-md border border-border bg-card/40 px-3 py-2 flex items-center gap-2">
              <UserIcon className="h-3 w-3 text-muted-foreground" /> {profile.user_id}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon, label, value, tone = "primary",
}: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "primary" | "muted" }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${tone === "muted" ? "text-muted-foreground" : "text-primary"}`}>
        {icon} {label}
      </div>
      <div className="font-bold text-sm mt-0.5">{value}</div>
    </div>
  );
}
