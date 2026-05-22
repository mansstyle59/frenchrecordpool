import { Link } from "react-router-dom";
import { Music, Clock, CheckCircle2, XCircle, Download, Upload, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTracks } from "@/hooks/useTracks";
import { useNotifications } from "@/hooks/useNotifications";
import { useMemo } from "react";
import DjLayout from "@/components/dj/DjLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { resolveCover } from "@/lib/trackCover";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  approved: { label: "Approuvé", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  rejected: { label: "Refusé", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function DjDashboard() {
  const { user } = useAuth();
  const { data: myTracks = [] } = useMyTracks(user?.id);
  const { notifications } = useNotifications();

  const stats = useMemo(() => {
    const pending = myTracks.filter((t) => t.status === "pending").length;
    const approved = myTracks.filter((t) => t.status === "approved").length;
    const rejected = myTracks.filter((t) => t.status === "rejected").length;
    const downloads = myTracks.reduce((s, t) => s + (t.downloads ?? 0), 0);
    return { pending, approved, rejected, downloads, total: myTracks.length };
  }, [myTracks]);

  const recent = myTracks.slice(0, 5);

  return (
    <DjLayout
      title="Mon espace DJ"
      subtitle="Suis le statut de tes soumissions et publie de nouveaux morceaux."
      actions={
        <Link to="/dj/upload">
          <Button variant="hero" size="sm" className="gap-2">
            <Upload className="h-4 w-4" /> Nouveau morceau
          </Button>
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Music} label="Total" value={stats.total} accent="from-primary/20 to-primary/5" iconColor="text-primary" />
        <StatCard icon={Clock} label="En attente" value={stats.pending} accent="from-yellow-500/20 to-yellow-500/5" iconColor="text-yellow-500" />
        <StatCard icon={CheckCircle2} label="Approuvés" value={stats.approved} accent="from-emerald-500/20 to-emerald-500/5" iconColor="text-emerald-500" />
        <StatCard icon={XCircle} label="Refusés" value={stats.rejected} accent="from-destructive/20 to-destructive/5" iconColor="text-destructive" />
        <StatCard icon={Download} label="Téléchargements" value={stats.downloads} accent="from-accent/20 to-accent/5" iconColor="text-accent" />
      </div>

      {/* Two columns: recent tracks + notifications */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" /> Mes derniers morceaux
            </h3>
            <Link to="/dj/tracks" className="text-xs text-muted-foreground hover:text-primary">Tout voir</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>Aucun morceau pour le moment.</p>
              <Link to="/dj/upload"><Button variant="outline" size="sm" className="mt-3 gap-2"><Upload className="h-3 w-3" />Soumettre ton premier morceau</Button></Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((t) => {
                const st = STATUS_LABEL[t.status ?? "pending"];
                return (
                  <li key={t.id} className="flex items-center gap-3">
                    <img src={resolveCover(t)} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-accent" /> Notifications récentes
          </h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune notification.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read_at ? "bg-muted" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DjLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent, iconColor }: any) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${accent} border border-border rounded-xl p-4`}>
      <Icon className={`h-5 w-5 ${iconColor} mb-3`} />
      <p className="text-2xl font-display font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
