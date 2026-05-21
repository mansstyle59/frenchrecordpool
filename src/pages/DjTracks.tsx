import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, Trash2, Plus, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTracks } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import DjLayout from "@/components/dj/DjLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  approved: { label: "Approuvé", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  rejected: { label: "Refusé", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function DjTracks() {
  const { user } = useAuth();
  const { data: tracks = [] } = useMyTracks(user?.id);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    let res = [...tracks];
    if (status !== "all") res = res.filter((t) => (t.status ?? "pending") === status);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    return res;
  }, [tracks, status, search]);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette soumission ? Action irréversible.")) return;
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Soumission supprimée" });
    qc.invalidateQueries({ queryKey: ["my-tracks", user?.id] });
  };

  return (
    <DjLayout
      title="Mes morceaux"
      subtitle="Toutes tes soumissions et leur statut de validation."
      actions={<Link to="/dj/upload"><Button variant="hero" size="sm" className="gap-2"><Plus className="h-4 w-4" />Nouveau</Button></Link>}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-10" />
        </div>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">Tous ({tracks.length})</TabsTrigger>
            <TabsTrigger value="pending">En attente ({tracks.filter((t) => t.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="approved">Approuvés ({tracks.filter((t) => t.status === "approved").length})</TabsTrigger>
            <TabsTrigger value="rejected">Refusés ({tracks.filter((t) => t.status === "rejected").length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <p className="text-muted-foreground mb-4">Aucun morceau dans cette vue.</p>
          <Link to="/dj/upload"><Button variant="hero" className="gap-2"><Plus className="h-4 w-4" />Soumettre un morceau</Button></Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden divide-y divide-border">
          {filtered.map((t) => {
            const st = STATUS_LABEL[t.status ?? "pending"];
            const editable = t.status === "pending" || t.status === "rejected";
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30">
                {t.cover_url ? (
                  <img src={t.cover_url} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded bg-secondary shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.artist} {t.version && `· ${t.version}`} {t.bpm && `· ${t.bpm} BPM`}
                  </p>
                  {t.status === "rejected" && t.rejection_reason && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {t.rejection_reason}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                <div className="flex gap-1">
                  <Link to={`/dj/edit/${t.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!editable} title={editable ? "Modifier" : "Modification désactivée (approuvé)"}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={!editable} onClick={() => remove(t.id)} title={editable ? "Supprimer" : "Suppression désactivée (approuvé)"}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DjLayout>
  );
}
