import { useState } from "react";
import { Search, Youtube, Sparkles, Upload, Link as LinkIcon, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileDropzone from "@/components/FileDropzone";
import { validateImageFile } from "@/lib/trackSchema";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CoverPickerProps {
  artist: string;
  title: string;
  genre?: string;
  coverFile: File | null;
  coverUrl: string;
  coverPreview: string | null;
  currentCoverUrl?: string | null;
  onPickFile: (f: File | null) => void;
  onPickUrl: (u: string) => void;
}

type Suggestion = { source: string; url: string; thumb?: string; title?: string };

export default function CoverPicker({
  artist, title, genre,
  coverFile, coverUrl, coverPreview, currentCoverUrl,
  onPickFile, onPickUrl,
}: CoverPickerProps) {
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);

  const [ytUrl, setYtUrl] = useState("");
  const [fetchingThumb, setFetchingThumb] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const activeQuery = searchQ || [artist, title].filter(Boolean).join(" ");
  const activePrompt = aiPrompt || `${title || "album"} by ${artist || "artist"}${genre ? `, ${genre} music` : ""}, modern artwork`;

  const runSearch = async () => {
    if (!activeQuery) {
      toast({ title: "Recherche vide", description: "Renseigne l'artiste/titre ou tape une recherche.", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "search", query: activeQuery },
      });
      if (error) throw error;
      const list = (data?.results || []) as Suggestion[];
      setResults(list);
      if (!list.length) toast({ title: "Aucun résultat", description: "Essaie un autre terme." });
    } catch (e: any) {
      toast({ title: "Erreur recherche", description: e?.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const fetchYouTubeOrSc = async () => {
    if (!ytUrl) return;
    setFetchingThumb(true);
    try {
      const action = ytUrl.includes("soundcloud") ? "soundcloud" : "youtube";
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action, url: ytUrl },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Pas de miniature");
      await pickRemote(data.url);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setFetchingThumb(false);
    }
  };

  const generateAi = async () => {
    setGenerating(true);
    setAiPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "generate", prompt: activePrompt },
      });
      if (error) throw error;
      if (!data?.dataUrl) throw new Error(data?.error || "Génération échouée");
      setAiPreview(data.dataUrl);
    } catch (e: any) {
      toast({ title: "Erreur IA", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const dataUrlToFile = async (dataUrl: string, name: string) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type || "image/png" });
  };

  const pickRemote = async (url: string) => {
    setDownloading(url);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "fetch", url },
      });
      if (error) throw error;
      if (!data?.dataUrl) throw new Error("Téléchargement impossible");
      const ext = data.mime?.includes("png") ? "png" : "jpg";
      const file = await dataUrlToFile(data.dataUrl, `cover.${ext}`);
      onPickFile(file);
      setPickedUrl(url);
      toast({ title: "Pochette sélectionnée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const pickAi = async () => {
    if (!aiPreview) return;
    const file = await dataUrlToFile(aiPreview, "cover-ai.png");
    onPickFile(file);
    setPickedUrl(aiPreview);
    toast({ title: "Pochette IA sélectionnée" });
  };

  const livePreview = coverFile ? coverPreview : (coverUrl || currentCoverUrl || null);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 rounded-md overflow-hidden border border-border bg-secondary flex items-center justify-center shrink-0">
          {livePreview ? (
            <img src={livePreview} alt="Pochette" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Label className="flex items-center gap-1.5 text-sm">
            <ImageIcon className="h-4 w-4 text-accent" /> Pochette
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Recherche en ligne, YouTube/SoundCloud, IA ou import manuel.
          </p>
        </div>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="search" className="text-xs gap-1"><Search className="h-3 w-3" /> Recherche</TabsTrigger>
          <TabsTrigger value="yt" className="text-xs gap-1"><Youtube className="h-3 w-3" /> YT/SC</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> IA</TabsTrigger>
          <TabsTrigger value="manual" className="text-xs gap-1"><Upload className="h-3 w-3" /> Manuel</TabsTrigger>
        </TabsList>

        {/* ============ RECHERCHE ============ */}
        <TabsContent value="search" className="space-y-2 pt-3">
          <div className="flex gap-2">
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
              placeholder={activeQuery || "Artiste — Titre"}
              className="bg-secondary border-border"
            />
            <Button type="button" variant="outline" size="sm" onClick={runSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
              {results.map((r) => {
                const isPicked = pickedUrl === r.url;
                const isLoading = downloading === r.url;
                return (
                  <button
                    key={r.url}
                    type="button"
                    onClick={() => pickRemote(r.url)}
                    disabled={isLoading}
                    className={`group relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      isPicked ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                    title={r.title}
                  >
                    <img src={r.thumb || r.url} alt={r.title || ""} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute top-1 left-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-background/80 backdrop-blur">
                      {r.source}
                    </span>
                    {isLoading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </span>
                    )}
                    {isPicked && (
                      <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {!results.length && !searching && (
            <p className="text-[11px] text-muted-foreground italic">Lance une recherche pour voir les propositions iTunes + Deezer.</p>
          )}
        </TabsContent>

        {/* ============ YT / SC ============ */}
        <TabsContent value="yt" className="space-y-2 pt-3">
          <div className="flex gap-2">
            <Input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… ou https://soundcloud.com/…"
              className="bg-secondary border-border"
            />
            <Button type="button" variant="outline" size="sm" onClick={fetchYouTubeOrSc} disabled={fetchingThumb || !ytUrl}>
              {fetchingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : "Récupérer"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Récupère la miniature haute résolution.</p>
        </TabsContent>

        {/* ============ IA ============ */}
        <TabsContent value="ai" className="space-y-2 pt-3">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={activePrompt}
            className="bg-secondary border-border"
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={generateAi} disabled={generating} className="gap-1.5">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Génération…" : "Générer"}
            </Button>
            {aiPreview && (
              <Button type="button" variant="hero" size="sm" onClick={pickAi} className="gap-1.5">
                <Check className="h-4 w-4" /> Utiliser cette pochette
              </Button>
            )}
          </div>
          {aiPreview && (
            <div className="w-40 aspect-square rounded-md overflow-hidden border-2 border-primary">
              <img src={aiPreview} alt="Aperçu IA" className="w-full h-full object-cover" />
            </div>
          )}
        </TabsContent>

        {/* ============ MANUEL ============ */}
        <TabsContent value="manual" className="space-y-3 pt-3">
          <FileDropzone
            accept="*/*" file={coverFile} onFile={onPickFile} validate={validateImageFile}
            preview={coverFile ? coverPreview ?? undefined : undefined}
            helper="JPG, PNG, WebP. Carré recommandé (1000×1000)."
          />
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><LinkIcon className="h-3 w-3" /> ou URL d'image</Label>
            <Input type="url" value={coverUrl} onChange={(e) => onPickUrl(e.target.value)} placeholder="https://…" className="bg-secondary border-border" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
