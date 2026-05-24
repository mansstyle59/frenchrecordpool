import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  trackId: string;
  currentUrl?: string | null;
  className?: string;
}

/** Admin-only floating button on a track cover. Lets you change the cover in 1 click. */
export default function AdminCoverEditor({ trackId, currentUrl, className }: Props) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return null;

  const persist = async (cover_url: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_upsert_track" as any, {
        _id: trackId,
        _track: { cover_url },
      });
      if (error) throw error;
      toast.success("Cover mise à jour");
      setOpen(false);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${trackId}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("track-covers")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
      await persist(data.publicUrl);
    } catch (e: any) {
      toast.error(e?.message || "Upload échoué");
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); }}
          onDoubleClick={(e) => e.stopPropagation()}
          className={
            "absolute top-0.5 left-0.5 z-30 h-5 w-5 rounded-md bg-background/90 hover:bg-primary hover:text-primary-foreground border border-border/60 flex items-center justify-center text-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity " +
            (className ?? "")
          }
          aria-label="Modifier la cover"
          title="Admin · changer la cover"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 space-y-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Changer la cover
        </div>

        <label className="flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed border-border/60 hover:border-primary/60 cursor-pointer text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>Téléverser une image</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        <div className="space-y-1.5">
          <Label htmlFor={`cover-url-${trackId}`} className="text-[10px] uppercase tracking-wider">
            ou URL directe
          </Label>
          <Input
            id={`cover-url-${trackId}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/cover.jpg"
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            className="w-full h-8"
            disabled={busy || !url.trim()}
            onClick={() => persist(url.trim())}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
