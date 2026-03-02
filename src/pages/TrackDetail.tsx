import { useParams, Link } from "react-router-dom";
import { Play, Heart, Download, ArrowLeft, Clock, Music, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useTrack } from "@/hooks/useTracks";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTrack } from "@/lib/downloadTrack";

export default function TrackDetail() {
  const { id } = useParams();
  const { data: track, isLoading } = useTrack(id);
  const { play } = usePlayer();
  const { user, hasActiveSubscription } = useAuth();

  if (isLoading) return <Layout><div className="container py-20 text-center text-muted-foreground">Chargement...</div></Layout>;

  if (!track) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Track introuvable.</p>
          <Link to="/tracks"><Button variant="outline" className="mt-4">Retour au catalogue</Button></Link>
        </div>
      </Layout>
    );
  }

  const handlePlay = () => {
    play({ id: track.id, title: track.title, artist: track.artist, coverUrl: track.cover_url, previewUrl: track.preview_url });
  };

  const handleDownload = () => downloadTrack(track.id, user, hasActiveSubscription);

  return (
    <Layout>
      <div className="container py-8">
        <Link to="/tracks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex flex-col md:flex-row gap-8">
          <img src={track.cover_url || "/placeholder.svg"} alt={track.title} className="w-full md:w-72 h-72 object-cover rounded-xl border border-border" />
          <div className="flex-1">
            <Badge variant="outline" className="mb-2">{track.version || "Original"}</Badge>
            <h1 className="font-display text-3xl font-bold mb-1">{track.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">{track.artist}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <InfoItem icon={<Music className="h-4 w-4" />} label="Genre" value={track.genre} />
              <InfoItem icon={<Clock className="h-4 w-4" />} label="Durée" value={track.duration || "-"} />
              <InfoItem label="BPM" value={String(track.bpm ?? "-")} />
              <InfoItem label="Tonalité" value={track.musical_key || "-"} />
              <InfoItem label="Label" value={track.label || "-"} />
              <InfoItem label="Sortie" value={track.release_date ? new Date(track.release_date).toLocaleDateString("fr-FR") : "-"} />
              <InfoItem label="Téléchargements" value={(track.downloads ?? 0).toLocaleString("fr-FR")} />
            </div>
            {track.tags && track.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {track.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="hero" size="lg" className="gap-2" onClick={handlePlay} disabled={!track.preview_url}>
                <Play className="h-4 w-4" /> Écouter l'extrait
              </Button>
              <Button variant="default" size="lg" className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" /> Télécharger
              </Button>
              <Button variant="outline" size="lg"><Heart className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Connectez-vous avec un abonnement actif pour télécharger.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
