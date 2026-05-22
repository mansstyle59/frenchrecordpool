import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import DjLayout from "@/components/dj/DjLayout";
import TrackForm, { type TrackFormData } from "@/components/TrackForm";
import { buildTrackPayload, friendlySubmitError } from "@/lib/djSubmit";
import { Sparkles, ShieldCheck, Clock, Image as ImageIcon } from "lucide-react";

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
      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-4 md:p-6">
          <TrackForm saving={saving} onSubmit={handleSubmit} />
        </div>
        <aside className="space-y-3 lg:sticky lg:top-20 self-start">
          <TipCard
            icon={Sparkles}
            title="Auto-détection"
            text="Les tags ID3 (titre, artiste, BPM, key, pochette intégrée) sont lus automatiquement à l'import."
            color="text-primary"
          />
          <TipCard
            icon={ImageIcon}
            title="Pochette intelligente"
            text="Recherche iTunes/Deezer, miniature YouTube/SoundCloud, ou génération IA — tout depuis le même panneau."
            color="text-accent"
          />
          <TipCard
            icon={ShieldCheck}
            title="Qualité requise"
            text="Audio WAV/FLAC/MP3 320kbps. Pochette carrée 1000×1000 minimum recommandée."
            color="text-emerald-500"
          />
          <TipCard
            icon={Clock}
            title="Validation"
            text="Réponse sous 24-48h. Tu seras notifié par email et via la cloche en haut à droite."
            color="text-yellow-500"
          />
        </aside>
      </div>
    </DjLayout>
  );
}

function TipCard({ icon: Icon, title, text, color }: any) {
  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-4 w-4 ${color}`} />
        <h4 className="text-xs font-semibold uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
