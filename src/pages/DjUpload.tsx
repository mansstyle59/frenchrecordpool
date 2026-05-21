import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import DjLayout from "@/components/dj/DjLayout";
import TrackForm, { type TrackFormData } from "@/components/TrackForm";
import { buildTrackPayload, friendlySubmitError } from "@/lib/djSubmit";

export default function DjUpload() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: TrackFormData) => {
    if (!data.title || !data.artist) {
      toast({ title: "Titre et artiste requis", variant: "destructive" });
      return;
    }
    if (!data.audioFile && !data.audioUrl) {
      toast({ title: "Fichier ou URL audio requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = await buildTrackPayload({ data });
      const { error } = await supabase.rpc("dj_submit_track" as any, { _track: payload as any });
      if (error) throw error;
      toast({
        title: "Soumission envoyée 🎉",
        description: "Ton morceau est en attente de validation par l'équipe.",
      });
      qc.invalidateQueries({ queryKey: ["my-tracks", user?.id] });
      navigate("/dj/tracks");
    } catch (err: any) {
      toast({ title: "Erreur", description: friendlySubmitError(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DjLayout
      title="Nouveau morceau"
      subtitle="Renseigne les métadonnées et téléverse ton fichier audio. Validation admin sous 24-48h."
    >
      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-4 md:p-6">
        <TrackForm saving={saving} onSubmit={handleSubmit} />
      </div>
    </DjLayout>
  );
}
