import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Music2, Download, Search, Lock, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTracks } from "@/hooks/useTracks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type StemKind = "acapella" | "instrumental";

export default function Stems() {
  const { data: tracks = [], isLoading } = useTracks();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StemKind>("all");

  const stemTracks = useMemo(() => {
    return tracks.filter((t: any) => {
      const has = (t.acapella_url || t.instrumental_url);
      if (!has) return false;
      if (filter === "acapella" && !t.acapella_url) return false;
      if (filter === "instrumental" && !t.instrumental_url) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.genre ?? "").toLowerCase().includes(q);
    });
  }, [tracks, query, filter]);

  const handleDownload = async (track: any, kind: StemKind) => {
    const url = kind === "acapella" ? track.acapella_url : track.instrumental_url;
    if (!url) return;
    if (!user) {
      toast({ title: "Connexion requise", description: "Connecte-toi pour télécharger les stems.", variant: "destructive" });
      return;
    }
    // check active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const active = sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    if (!active) {
      toast({ title: "Abonnement requis", description: "Le téléchargement des stems est réservé aux membres actifs.", variant: "destructive" });
      return;
    }
    // log download (RLS enforces active subscription server-side too)
    await supabase.from("downloads").insert({ user_id: user.id, track_id: track.id });
    window.open(url, "_blank");
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container py-12 md:py-16">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
            <Sparkles className="h-3 w-3" /> Outils DJ
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 gradient-text">Stems & Acapellas</h1>
          <p className="text-muted-foreground max-w-2xl mb-6">
            Télécharge les voix isolées et les pistes instrumentales des morceaux du catalogue pour tes mashups, edits et mixes en live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un titre, artiste, genre..."
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <div className="flex gap-1 bg-secondary rounded-md p-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >Tout</button>
              <button
                onClick={() => setFilter("acapella")}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors flex items-center gap-1 ${filter === "acapella" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              ><Mic className="h-3 w-3" /> Acapellas</button>
              <button
                onClick={() => setFilter("instrumental")}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors flex items-center gap-1 ${filter === "instrumental" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              ><Music2 className="h-3 w-3" /> Instrumentales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container py-10">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Chargement...</p>
        ) : stemTracks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Mic className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun stem disponible pour le moment.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">L'admin peut ajouter des stems depuis la fiche d'une track.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{stemTracks.length} morceau{stemTracks.length > 1 ? "x" : ""} avec stems disponibles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stemTracks.map((t: any) => (
                <article key={t.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all group">
                  <div className="aspect-square relative overflow-hidden bg-secondary">
                    <img
                      src={t.cover_url || "/placeholder.svg"}
                      alt={t.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {t.acapella_url && <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1"><Mic className="h-2.5 w-2.5" /> Acapella</Badge>}
                      {t.instrumental_url && <Badge className="bg-accent/90 text-accent-foreground text-[10px] gap-1"><Music2 className="h-2.5 w-2.5" /> Instru</Badge>}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <Link to={`/tracks/${t.id}`} className="font-display font-bold leading-tight hover:text-primary transition-colors line-clamp-1">{t.title}</Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.artist}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {t.bpm && <span>{t.bpm} BPM</span>}
                      {t.musical_key && <span>· {t.musical_key}</span>}
                      {t.genre && <Badge variant="outline" className="text-[10px] ml-auto">{t.genre}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant={t.acapella_url ? "outline" : "ghost"}
                        disabled={!t.acapella_url}
                        onClick={() => handleDownload(t, "acapella")}
                        className="gap-1 text-xs"
                      >
                        {user ? <Download className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        Acapella
                      </Button>
                      <Button
                        size="sm"
                        variant={t.instrumental_url ? "outline" : "ghost"}
                        disabled={!t.instrumental_url}
                        onClick={() => handleDownload(t, "instrumental")}
                        className="gap-1 text-xs"
                      >
                        {user ? <Download className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        Instru
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!user && (
          <div className="mt-10 bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-display font-semibold mb-1">Téléchargements réservés aux membres</p>
            <p className="text-sm text-muted-foreground mb-4">Crée un compte et active un abonnement pour débloquer les stems.</p>
            <div className="flex gap-2 justify-center">
              <Link to="/signup"><Button variant="hero" size="sm">S'inscrire</Button></Link>
              <Link to="/login"><Button variant="outline" size="sm">Se connecter</Button></Link>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
