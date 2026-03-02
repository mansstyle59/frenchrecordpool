import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function downloadTrack(trackId: string, user: { id: string } | null, hasActiveSubscription: boolean) {
  if (!user) {
    toast({ title: "Connectez-vous pour télécharger", variant: "destructive" });
    return;
  }
  if (!hasActiveSubscription) {
    toast({ title: "Abonnement requis", description: "Un abonnement actif est nécessaire pour télécharger.", variant: "destructive" });
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

    // Trigger browser download
    const link = document.createElement("a");
    link.href = data.download_url;
    link.download = data.filename || "track.mp3";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Téléchargement lancé !" });
  } catch (err: any) {
    toast({ title: "Erreur de téléchargement", description: err.message, variant: "destructive" });
  }
}
