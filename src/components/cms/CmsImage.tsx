import { useState } from "react";
import { Pencil, Upload, Link as LinkIcon } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CmsImageProps {
  editKey: string;
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export default function CmsImage({ editKey, src, alt = "", className, loading = "lazy" }: CmsImageProps) {
  const value = useCmsValue<string>(editKey, src);
  const { editMode, saveDraft } = useCms();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `cms/${editKey.replace(/[^a-z0-9_-]/gi, "_")}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
      setUrl(data.publicUrl);
      await saveDraft(editKey, "image", data.publicUrl);
      toast.success("Image enregistrée (brouillon)");
      setOpen(false);
    } catch (e: any) {
      toast.error("Upload impossible");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const img = (
    <img
      src={value}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
    />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remplacer l'image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {url && (
              <div className="rounded border border-border overflow-hidden bg-muted">
                <img src={url} alt="" className="w-full max-h-60 object-contain" />
              </div>
            )}
            <div>
              <Label className="flex items-center gap-2 mb-1"><Upload className="h-4 w-4" /> Téléverser</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1"><LinkIcon className="h-4 w-4" /> Ou coller une URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
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
