import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import DjLayout from "@/components/dj/DjLayout";
import TrackForm, { type TrackFormData } from "@/components/TrackForm";
import type { DbTrack } from "@/hooks/useTracks";
import { buildTrackPayload, friendlySubmitError } from "@/lib/djSubmit";
import { AlertCircle } from "lucide-react";

export default function DjEdit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const { data: track, isLoading } = useQuery({
    queryKey: ["my-track", id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // Sensitive URL columns aren't readable via the table anymore; fetch them via the secure RPC.
      const { data: urls } = await supabase.rpc("get_track_urls" as any, { _id: id! });
      const u = Array.isArray(urls) ? urls[0] : null;
      return {
        ...(data as any),
        download_url: u?.download_url ?? null,
        acapella_url: u?.acapella_url ?? null,
        instrumental_url: u?.instrumental_url ?? null,
      } as DbTrack;
    },
  });

  useEffect(() => {
    if (!isLoading && track && user && track.submitted_by !== user.id) {
      toast({ title: "Accès refusé", description: "Tu n'es pas le propriétaire.", variant: "destructive" });
      navigate("/dj/tracks");
    }
  }, [isLoading, track, user, navigate]);

  const isApproved = track?.status === "approved";

  const handleSubmit = async (data: TrackFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = await buildTrackPayload({
        data,
        existingTrackId: id,
        existing: {
          cover_url: track?.cover_url ?? null,
          audio_url: track?.audio_url ?? null,
          preview_url: track?.preview_url ?? null,
          download_url: (track as any)?.download_url ?? null,
          acapella_url: (track as any)?.acapella_url ?? null,
          instrumental_url: (track as any)?.instrumental_url ?? null,
        },
      });
      if (isApproved) {
        const { error } = await supabase.rpc("dj_submit_track_revision" as any, { _track_id: id, _payload: payload as any });
        if (error) throw error;
        toast({ title: "Demande envoyée", description: "Tes modifications attendent la validation d'un admin." });
      } else {
        const { error } = await supabase.rpc("dj_update_own_track" as any, { _id: id, _track: payload as any });
        if (error) throw error;
        toast({ title: "Morceau mis à jour", description: "Il repasse en attente de validation." });
      }
      qc.invalidateQueries({ queryKey: ["my-tracks", user?.id] });
      navigate("/dj/tracks");
    } catch (err: any) {
      toast({ title: "Erreur", description: friendlySubmitError(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <DjLayout title="Chargement…"><p className="text-muted-foreground">Chargement du morceau…</p></DjLayout>;
  if (!track) return <DjLayout title="Introuvable"><p className="text-muted-foreground">Ce morceau n'existe plus.</p></DjLayout>;

  return (
    <DjLayout
      title={`Modifier — ${track.title}`}
      subtitle={isApproved
        ? "Tes modifications seront soumises à l'admin avant publication."
        : "La modification renvoie le morceau en file d'attente pour validation."}
    >
      {track.status === "rejected" && track.rejection_reason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Motif du refus</p>
            <p className="text-sm">{track.rejection_reason}</p>
          </div>
        </div>
      )}
      {isApproved && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-primary">Morceau déjà publié</p>
            <p className="text-sm text-muted-foreground">Tes changements créeront une demande de modification. Le morceau actuel reste en ligne jusqu'à validation.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-4 md:p-6">
        <TrackForm initialData={track} saving={saving} onSubmit={handleSubmit} />
      </div>
    </DjLayout>
  );
}
