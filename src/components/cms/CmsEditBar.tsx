import { useEffect, useState } from "react";
import { Pencil, Eye, EyeOff, Send, Undo2, Redo2, History, X, Loader2, Check, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCms } from "@/contexts/CmsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function CmsEditBar() {
  const { realIsAdmin } = useAuth();
  const {
    editMode, setEditMode, previewDrafts, setPreviewDrafts,
    pendingCount, drafts, publishAll, revertDraft,
    undo, redo, canUndo, canRedo, saving,
    autoPublish, setAutoPublish,
  } = useCms();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (saving) return;
    if (pendingCount === 0) return;
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 1400);
    return () => clearTimeout(t);
  }, [saving, pendingCount]);

  if (!realIsAdmin) return null;

  if (!editMode) {
    return (
      <button
        type="button"
        onClick={() => setEditMode(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition"
        title="Activer l'édition CMS"
      >
        <Pencil className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Édition</span>
      </button>
    );
  }

  const loadHistory = async () => {
    const { data } = await supabase
      .from("cms_content_versions")
      .select("id,content_key,value,action,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setVersions(data ?? []);
  };

  const restore = async (id: string) => {
    const { error } = await supabase.rpc("cms_restore_version", { _version_id: id });
    if (error) toast.error("Restauration impossible");
    else toast.success("Version restaurée comme brouillon");
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 glass rounded-2xl shadow-2xl border border-border p-3 flex flex-col gap-2 min-w-[280px] max-w-[92vw]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Pencil className="h-4 w-4 text-primary" />
          Mode édition
        </div>
        <Button size="icon" variant="ghost" onClick={() => setEditMode(false)} title="Fermer" className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Brouillons</span>
        <div className="flex items-center gap-2">
          <SaveIndicator saving={saving} justSaved={justSaved} />
          <Badge variant={pendingCount > 0 ? "default" : "secondary"}>{pendingCount}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button aria-label="Annuler (Ctrl+Z)" size="sm" variant="outline" className="gap-1.5 h-8" disabled={!canUndo} onClick={undo} title="Annuler (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" /> Annuler
        </Button>
        <Button aria-label="Rétablir (Ctrl+Shift+Z)" size="sm" variant="outline" className="gap-1.5 h-8" disabled={!canRedo} onClick={redo} title="Rétablir (Ctrl+Shift+Z)">
          <Redo2 className="h-3.5 w-3.5" /> Rétablir
        </Button>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => setPreviewDrafts(!previewDrafts)}
      >
        {previewDrafts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {previewDrafts ? "Aperçu brouillons" : "Aperçu publié"}
      </Button>

      <Button
        size="sm"
        className="gap-2"
        disabled={pendingCount === 0}
        onClick={publishAll}
      >
        <Send className="h-4 w-4" />
        Publier tout
      </Button>

      {pendingCount > 0 && (
        <div className="max-h-40 overflow-y-auto border-t border-border pt-2 space-y-1">
          {Object.keys(drafts).map(k => (
            <div key={k} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-mono text-muted-foreground" title={k}>{k}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => revertDraft(k)} title="Annuler">
                <Undo2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={historyOpen} onOpenChange={(o) => { setHistoryOpen(o); if (o) loadHistory(); }}>
        <SheetTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-2">
            <History className="h-4 w-4" /> Historique
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Historique des modifications</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {versions.map(v => (
              <div key={v.id} className="border border-border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground truncate">{v.content_key}</span>
                  <Badge variant="outline" className="text-[10px]">{v.action}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: fr })}
                </div>
                {typeof v.value === "string" && (
                  <div className="text-xs mt-1 line-clamp-2 italic">"{v.value}"</div>
                )}
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => restore(v.id)}>
                  Restaurer comme brouillon
                </Button>
              </div>
            ))}
            {versions.length === 0 && <p className="text-sm text-muted-foreground">Aucune version.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SaveIndicator({ saving, justSaved }: { saving: boolean; justSaved: boolean }) {
  if (saving) return <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</span>;
  if (justSaved) return <span className="flex items-center gap-1 text-[10px] text-primary"><Check className="h-3 w-3" /> Enregistré</span>;
  return null;
}
