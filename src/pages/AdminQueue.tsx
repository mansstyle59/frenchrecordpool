import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock, Search, Play, Pause, Eye, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminStatsRow from "@/components/admin/AdminStatsRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveCover } from "@/lib/trackCover";
import type { DbTrack } from "@/hooks/useTracks";
import { logAdminAction } from "@/lib/auditLog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type AnyTrack = DbTrack & {
  status?: string;
  submitted_by?: string | null;
  rejection_reason?: string | null;
};

export default function AdminQueue() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<AnyTrack | null>(null);
  const [patch, setPatch] = useState<any>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const audioRef = typeof window !== "undefined" ? new Audio() : null;

  // Realtime invalidation
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("admin-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "tracks" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-queue"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, qc]);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["admin-queue", tab],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase.from("tracks").select("*").order("created_at", { ascending: false });
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AnyTrack[];
    },
  });

  const { data: countsData } = useQuery({
    queryKey: ["admin-queue-counts"],
    enabled: isAdmin,
    queryFn: async () => {
      const [p, a, r] = await Promise.all([
        supabase.from("tracks").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tracks").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("tracks").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return { pending: p.count ?? 0, approved: a.count ?? 0, rejected: r.count ?? 0 };
    },
  });

  const filtered = useMemo(() => {
    if (!search) return tracks;
    const q = search.toLowerCase();
    return tracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  }, [tracks, search]);

  const openReview = (t: AnyTrack) => {
    setReviewing(t);
    setPatch({});
    setReason("");
  };

  const togglePlay = (url: string | null) => {
    if (!audioRef || !url) return;
    if (audioPlaying === url) {
      audioRef.pause();
      setAudioPlaying(null);
    } else {
      audioRef.src = url;
      audioRef.play().then(() => setAudioPlaying(url)).catch(() => {});
      audioRef.onended = () => setAudioPlaying(null);
    }
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!reviewing) return;
    if (decision === "rejected" && !reason.trim()) {
      toast({ title: "Motif requis", description: "Indique pourquoi tu refuses ce morceau.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const cleanPatch: any = { ...patch };
      // Convert bpm to string for jsonb compat handled by RPC
      if (cleanPatch.bpm !== undefined) cleanPatch.bpm = String(cleanPatch.bpm);
      if (cleanPatch.tags && typeof cleanPatch.tags === "string") {
        cleanPatch.tags = cleanPatch.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      const { error } = await supabase.rpc("admin_review_track" as any, {
        _id: reviewing.id,
        _decision: decision,
        _reason: decision === "rejected" ? reason : null,
        _patch: cleanPatch,
      });
      if (error) throw error;
      await logAdminAction({
        actorId: user!.id,
        action: decision === "approved" ? "track.approve" : "track.reject",
        entityType: "track",
        entityId: reviewing.id,
        entityLabel: `${reviewing.title} — ${reviewing.artist}`,
        details: decision === "rejected" ? { reason } : { patch: cleanPatch },
      });
      toast({ title: decision === "approved" ? "Morceau approuvé ✅" : "Morceau refusé" });
      setReviewing(null);
      qc.invalidateQueries({ queryKey: ["admin-queue"] });
      qc.invalidateQueries({ queryKey: ["admin-queue-counts"] });
      qc.invalidateQueries({ queryKey: ["tracks"] });
      qc.invalidateQueries({ queryKey: ["pending-tracks"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Action impossible.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Helper to merge patch field
  const setField = (k: string, v: any) => setPatch((p: any) => ({ ...p, [k]: v }));
  const val = (k: keyof AnyTrack) => (patch[k] !== undefined ? patch[k] : (reviewing as any)?.[k] ?? "");

  return (
    <AdminLayout
      wide
      title="File de modération"
      subtitle="Valide ou refuse les soumissions des DJs. Tu peux corriger les métadonnées avant publication."
    >
      <AdminStatsRow
        stats={[
          { icon: <Clock className="h-4 w-4" />, label: "En attente", value: countsData?.pending ?? 0, hint: "à modérer", accent: "primary" },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: "Approuvés", value: countsData?.approved ?? 0, hint: "publiés", accent: "accent" },
          { icon: <XCircle className="h-4 w-4" />, label: "Refusés", value: countsData?.rejected ?? 0, hint: "rejetés", accent: "muted" },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher titre, artiste…" className="pl-10" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="rejected">Refusés</TabsTrigger>
            <TabsTrigger value="approved">Approuvés</TabsTrigger>
            <TabsTrigger value="all">Tout</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">Aucune soumission dans cette vue.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden divide-y divide-border">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-secondary/30">
              <img src={resolveCover(t)} alt="" className="h-14 w-14 rounded object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.artist} {t.version && `· ${t.version}`} {t.bpm && `· ${t.bpm} BPM`} {t.genre && `· ${t.genre}`}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  Soumis {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                </p>
                {t.status === "rejected" && t.rejection_reason && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {t.rejection_reason}
                  </p>
                )}
              </div>
              <Badge variant="outline" className={`text-[10px] ${
                t.status === "approved" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                t.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" :
                "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
              }`}>{t.status}</Badge>
              {(t.preview_url || t.audio_url) && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePlay(t.preview_url ?? t.audio_url)}>
                  {audioPlaying === (t.preview_url ?? t.audio_url) ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="hero" size="sm" className="gap-1" onClick={() => openReview(t)}>
                <Eye className="h-3.5 w-3.5" /> Revoir
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modération — {reviewing?.title}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img src={resolveCover(reviewing)} alt="" className="h-32 w-32 rounded-lg object-cover shrink-0" />
                <div className="flex-1 space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Soumis {formatDistanceToNow(new Date(reviewing.created_at), { addSuffix: true, locale: fr })}
                  </p>
                  {(reviewing.preview_url || reviewing.audio_url) && (
                    <audio controls className="w-full" src={reviewing.preview_url ?? reviewing.audio_url ?? undefined} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Titre" value={val("title")} onChange={(v) => setField("title", v)} />
                <Field label="Artiste" value={val("artist")} onChange={(v) => setField("artist", v)} />
                <Field label="Genre" value={val("genre")} onChange={(v) => setField("genre", v)} />
                <Field label="Label" value={val("label")} onChange={(v) => setField("label", v)} />
                <Field label="Version" value={val("version")} onChange={(v) => setField("version", v)} />
                <Field label="BPM" type="number" value={val("bpm")} onChange={(v) => setField("bpm", v)} />
                <Field label="Tonalité" value={val("musical_key")} onChange={(v) => setField("musical_key", v)} />
                <Field label="Date de sortie" type="date" value={val("release_date")} onChange={(v) => setField("release_date", v)} />
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Tags (séparés par virgules)</Label>
                  <Input
                    value={patch.tags !== undefined ? (Array.isArray(patch.tags) ? patch.tags.join(", ") : patch.tags) : (reviewing.tags ?? []).join(", ")}
                    onChange={(e) => setField("tags", e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">URL de la pochette</Label>
                  <Input value={val("cover_url")} onChange={(v) => setField("cover_url", v.target ? (v.target as HTMLInputElement).value : v)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Motif (obligatoire en cas de refus)</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Qualité audio insuffisante, métadonnées erronées…" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReviewing(null)} disabled={busy}>Fermer</Button>
                <Button variant="destructive" onClick={() => decide("rejected")} disabled={busy}><XCircle className="h-4 w-4 mr-1" />Refuser</Button>
                <Button variant="hero" onClick={() => decide("approved")} disabled={busy}><CheckCircle2 className="h-4 w-4 mr-1" />Approuver & publier</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
