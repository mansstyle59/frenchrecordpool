import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { requireSubscription } from "@/components/SubscriptionRequiredDialog";

export async function downloadTrack(trackId: string, user: { id: string } | null, hasActiveSubscription: boolean) {
  if (!user) {
    requireSubscription({
      title: "Connexion requise",
      description: "Connectez-vous puis souscrivez à une offre pour télécharger.",
    });
    return;
  }
  if (!hasActiveSubscription) {
    requireSubscription();
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke("download-track", {
      body: { track_id: trackId },
    });

    if (error) throw error;
    if (data?.error) {
      toast({ title: "Erreur", description: data.error, variant: "destructive" });
      return;
    }

    if (data.type === "link") {
      // External link → open in new tab
      window.open(data.download_url, "_blank", "noopener,noreferrer");
      toast({ title: "Lien ouvert dans un nouvel onglet" });
    } else {
      // Storage file → direct download
      const link = document.createElement("a");
      link.href = data.download_url;
      link.download = data.filename || "track.mp3";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Téléchargement lancé !" });
    }
  } catch (err: any) {
    toast({ title: "Erreur de téléchargement", description: err.message, variant: "destructive" });
  }
}
