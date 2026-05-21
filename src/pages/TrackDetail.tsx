import { useParams, Link } from "react-router-dom";
import { Play, Heart, Download, ExternalLink, ArrowLeft, Clock, Music, Tag, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useTrack } from "@/hooks/useTracks";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { downloadTrack } from "@/lib/downloadTrack";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { resolveCover } from "@/lib/trackCover";

export default function TrackDetail() {
  const { id } = useParams();
  const { data: track, isLoading } = useTrack(id);
  const { play } = usePlayer();
  const { user, hasActiveSubscription } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  if (isLoading) return <Layout><div className="container py-20 text-center text-muted-foreground">Chargement...</div></Layout>;

  if (!track) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Track introuvable.</p>
          <Link to="/new"><Button variant="outline" className="mt-4">Retour aux nouveautés</Button></Link>
        </div>
      </Layout>
    );
  }

  const handlePlay = () => {
    play({ id: track.id, title: track.title, artist: track.artist, coverUrl: resolveCover(track), previewUrl: track.preview_url || track.audio_url });
  };

  const handleDownload = () => downloadTrack(track.id, user, hasActiveSubscription);
  const resolvedUrl = (track as any).download_url || track.audio_url;
  const isExternalLink = resolvedUrl && !resolvedUrl.includes("/object/public/track-audio/");
  const DownloadIcon = isExternalLink ? ExternalLink : Download;

  return (
    <Layout>
      <PageHero
        eyebrow={track.version || "Original"}
        title=""
        highlight={track.title}
        description={track.artist}
        stats={[
          { icon: <Disc3 className="h-3.5 w-3.5 text-primary" />, label: track.genre || "—" },
          { icon: <Clock className="h-3.5 w-3.5 text-accent" />, label: track.duration || "—" },
          { label: `${track.bpm ?? "—"} BPM` },
          { label: `Key ${track.musical_key || "—"}` },
        ]}
      />

      <div className="container py-8">
        <Link to="/new" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux nouveautés
        </Link>

        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-6 md:p-8 shadow-xl shadow-primary/5">
          <div className="flex flex-col md:flex-row gap-8">
            <img
              src={resolveCover(track)}
              alt={track.title}
              className="w-full md:w-72 h-72 object-cover rounded-xl border border-border shadow-lg"
            />
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <InfoItem icon={<Music className="h-4 w-4" />} label="Genre" value={track.genre || "—"} />
                <InfoItem label="Label" value={track.label || "—"} />
                <InfoItem label="Sortie" value={track.release_date ? new Date(track.release_date).toLocaleDateString("fr-FR") : "—"} />
                <InfoItem label="Téléchargements" value={(track.downloads ?? 0).toLocaleString("fr-FR")} />
                <InfoItem label="BPM" value={String(track.bpm ?? "—")} />
                <InfoItem label="Tonalité" value={track.musical_key || "—"} />
              </div>

              {track.tags && track.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {track.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-auto">
                <Button variant="hero" size="lg" className="gap-2" onClick={handlePlay} disabled={!track.preview_url && !track.audio_url}>
                  <Play className="h-4 w-4" /> Écouter l'extrait
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="lg" className="gap-2" onClick={handleDownload}>
                      <DownloadIcon className="h-4 w-4" /> {isExternalLink ? "Ouvrir le lien" : "Télécharger"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isExternalLink ? "Ouvre le lien dans un nouvel onglet" : "Télécharge le fichier MP3/WAV directement"}
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="lg"
                  className={isFavorite(track.id) ? "text-red-500 border-red-500/30 hover:text-red-400" : ""}
                  onClick={() => {
                    if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return; }
                    toggleFavorite(track.id);
                  }}
                >
                  <Heart className={`h-4 w-4 ${isFavorite(track.id) ? "fill-current" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 font-mono">
                Connectez-vous avec un abonnement actif pour télécharger le titre complet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">{icon}{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
