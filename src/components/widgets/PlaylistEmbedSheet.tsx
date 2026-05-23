import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getEmbedSrc } from "@/lib/playlistEmbed";
import CustomPlaylistPlayer from "./CustomPlaylistPlayer";
import type { PlaylistCardData } from "./PlaylistCard";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function PlaylistEmbedSheet({
  open,
  onOpenChange,
  playlist,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playlist: PlaylistCardData;
}) {
  const src =
    playlist.source !== "custom"
      ? getEmbedSrc({
          source: playlist.source,
          embed_id: playlist.embed_id ?? null,
          source_url: playlist.source_url,
          accent_color: playlist.accent_color,
        })
      : null;

  // Heights tuned per source for a good default
  const iframeHeight =
    playlist.source === "spotify" ? 480 : playlist.source === "deezer" ? 420 : 420;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{playlist.title}</DialogTitle>
          <DialogDescription>{playlist.description ?? "Playlist"}</DialogDescription>
        </VisuallyHidden>

        {playlist.source === "custom" ? (
          <CustomPlaylistPlayer playlist={playlist} />
        ) : src ? (
          <iframe
            title={playlist.title}
            src={src}
            width="100%"
            height={iframeHeight}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block w-full bg-black"
            style={{ border: 0 }}
          />
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Lien d'intégration invalide.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
