import { useState } from "react";
import { Pencil, Upload, Link as LinkIcon, Search, Youtube, Sparkles, Loader2, Check, Image as ImageIcon } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CmsImageProps {
  editKey: string;
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

type Suggestion = { source: string; url: string; thumb?: string; title?: string };

export default function CmsImage({ editKey, src, alt = "", className, loading = "lazy" }: CmsImageProps) {
  const value = useCmsValue<string>(editKey, src);
  const { editMode, saveDraft } = useCms();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value);
  const [uploading, setUploading] = useState(false);

  // Web search
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);

  // YT/SC
  const [ytUrl, setYtUrl] = useState("");
  const [fetchingThumb, setFetchingThumb] = useState(false);

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const uploadBlobToStorage = async (blob: Blob, ext: string) => {
    const path = `cms/${editKey.replace(/[^a-z0-9_-]/gi, "_")}-${Date.now()}.${ext}`;
    const file = new File([blob], `img.${ext}`, { type: blob.type });
    const { error } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const publicUrl = await uploadBlobToStorage(file, ext);
      setUrl(publicUrl);
      await saveDraft(editKey, "image", publicUrl);
      toast.success("Image enregistrée (brouillon)");
      setOpen(false);
    } catch (e: any) {
      toast.error("Upload impossible");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const importRemote = async (remoteUrl: string) => {
    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "fetch", url: remoteUrl },
      });
      if (error) throw error;
      if (!data?.dataUrl) throw new Error("Téléchargement impossible");
      const res = await fetch(data.dataUrl);
      const blob = await res.blob();
      const ext = data.mime?.includes("png") ? "png" : data.mime?.includes("webp") ? "webp" : "jpg";
      const publicUrl = await uploadBlobToStorage(blob, ext);
      setUrl(publicUrl);
      toast.success("Image importée");
    } catch (e: any) {
      toast.error(e?.message || "Import impossible");
    } finally {
      setUploading(false);
    }
  };

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "search", query: searchQ },
      });
      if (error) throw error;
      setResults((data?.results || []) as Suggestion[]);
    } catch (e: any) {
      toast.error(e?.message || "Erreur recherche");
    } finally {
      setSearching(false);
    }
  };

  const fetchYtSc = async () => {
    if (!ytUrl) return;
    setFetchingThumb(true);
    try {
      const action = ytUrl.includes("soundcloud") ? "soundcloud" : "youtube";
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action, url: ytUrl },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Pas de miniature");
      await importRemote(data.url);
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setFetchingThumb(false);
    }
  };

  const generateAi = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setAiPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("cover-tools", {
        body: { action: "generate", prompt: aiPrompt },
      });
      if (error) throw error;
      if (!data?.dataUrl) throw new Error(data?.error || "Génération échouée");
      setAiPreview(data.dataUrl);
    } catch (e: any) {
      toast.error(e?.message || "Erreur IA");
    } finally {
      setGenerating(false);
    }
  };

  const useAi = async () => {
    if (!aiPreview) return;
    setUploading(true);
    try {
      const res = await fetch(aiPreview);
      const blob = await res.blob();
      const publicUrl = await uploadBlobToStorage(blob, "png");
      setUrl(publicUrl);
      toast.success("Image IA importée");
    } catch (e: any) {
      toast.error(e?.message || "Import impossible");
    } finally {
      setUploading(false);
    }
  };

  const img = (
    <img src={value} alt={alt} loading={loading} decoding="async" className={className} />
  );

  if (!editMode) return img;

  return (
    <>
      <span className={cn("relative inline-block group/cms", className && "block")}>
        {img}
        <button
          type="button"
          onClick={() => { setUrl(value); setOpen(true); }}
          className="absolute top-2 right-2 z-10 hidden group-hover/cms:flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground shadow-md text-xs"
        >
          <Pencil className="h-3 w-3" /> Image
        </button>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Remplacer l'image</DialogTitle>
          </DialogHeader>

          {url && (
            <div className="rounded border border-border overflow-hidden bg-muted">
              <img src={url} alt="" className="w-full max-h-48 object-contain" />
            </div>
          )}

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="manual" className="text-xs gap-1"><Upload className="h-3 w-3" /> Fichier / URL</TabsTrigger>
              <TabsTrigger value="search" className="text-xs gap-1"><Search className="h-3 w-3" /> Web</TabsTrigger>
              <TabsTrigger value="yt" className="text-xs gap-1"><Youtube className="h-3 w-3" /> YT/SC</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> IA</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-3 pt-3">
              <div>
                <Label className="flex items-center gap-2 mb-1"><Upload className="h-4 w-4" /> Téléverser</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1"><LinkIcon className="h-4 w-4" /> Ou coller une URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-2 pt-3">
              <div className="flex gap-2">
                <Input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
                  placeholder="Artiste, titre, mot-clé…"
                />
                <Button type="button" variant="outline" size="sm" onClick={runSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {results.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
                  {results.map((r) => {
                    const picked = url === r.url;
                    return (
                      <button
                        key={r.url}
                        type="button"
                        onClick={() => importRemote(r.url)}
                        disabled={uploading}
                        className={cn(
                          "group relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                          picked ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                        )}
                        title={r.title}
                      >
                        <img src={r.thumb || r.url} alt={r.title || ""} className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute top-1 left-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-background/80 backdrop-blur">{r.source}</span>
                        {picked && <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Recherche iTunes + Deezer en haute résolution.
                </p>
              )}
            </TabsContent>

            <TabsContent value="yt" className="space-y-2 pt-3">
              <div className="flex gap-2">
                <Input
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=… ou https://soundcloud.com/…"
                />
                <Button type="button" variant="outline" size="sm" onClick={fetchYtSc} disabled={fetchingThumb || !ytUrl}>
                  {fetchingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : "Récupérer"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Récupère la miniature haute résolution.</p>
            </TabsContent>

            <TabsContent value="ai" className="space-y-2 pt-3">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Décris l'image souhaitée…"
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={generateAi} disabled={generating || !aiPrompt.trim()} className="gap-1.5">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Génération…" : "Générer"}
                </Button>
                {aiPreview && (
                  <Button type="button" size="sm" onClick={useAi} disabled={uploading} className="gap-1.5">
                    <Check className="h-4 w-4" /> Utiliser
                  </Button>
                )}
              </div>
              {aiPreview && (
                <div className="w-40 aspect-square rounded-md overflow-hidden border-2 border-primary">
                  <img src={aiPreview} alt="Aperçu IA" className="w-full h-full object-cover" />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              disabled={uploading || !url || url === value}
              onClick={async () => {
                await saveDraft(editKey, "image", url);
                toast.success("Image enregistrée (brouillon)");
                setOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
