import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CmsType = "text" | "richtext" | "image" | "url" | "color";

interface CmsRow {
  key: string;
  type: CmsType;
  value_draft: any | null;
  value_published: any | null;
}

interface CmsContextType {
  values: Record<string, any>;          // resolved value (draft if preview, else published)
  drafts: Record<string, any>;          // raw drafts (admin only)
  published: Record<string, any>;       // raw published values
  loaded: boolean;
  editMode: boolean;
  previewDrafts: boolean;
  setEditMode: (v: boolean) => void;
  setPreviewDrafts: (v: boolean) => void;
  pendingCount: number;
  saveDraft: (key: string, type: CmsType, value: any) => Promise<void>;
  publishAll: () => Promise<void>;
  publishKey: (key: string) => Promise<void>;
  revertDraft: (key: string) => Promise<void>;
}

const CmsContext = createContext<CmsContextType>({
  values: {}, drafts: {}, published: {}, loaded: false,
  editMode: false, previewDrafts: true,
  setEditMode: () => {}, setPreviewDrafts: () => {},
  pendingCount: 0,
  saveDraft: async () => {}, publishAll: async () => {},
  publishKey: async () => {}, revertDraft: async () => {},
});

export const useCms = () => useContext(CmsContext);

export function useCmsValue<T = string>(key: string, fallback: T): T {
  const { values } = useCms();
  const v = values[key];
  return (v === undefined || v === null) ? fallback : (v as T);
}

const STORAGE_EDIT_MODE = "frp:cmsEditMode";

export function CmsProvider({ children }: { children: ReactNode }) {
  const { realIsAdmin } = useAuth();
  const [published, setPublished] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [types, setTypes] = useState<Record<string, CmsType>>({});
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_EDIT_MODE) === "1";
  });
  const [previewDrafts, setPreviewDrafts] = useState<boolean>(true);

  const setEditMode = useCallback((v: boolean) => {
    setEditModeState(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem(STORAGE_EDIT_MODE, "1");
      else localStorage.removeItem(STORAGE_EDIT_MODE);
    }
  }, []);

  // Load all content
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (realIsAdmin) {
          const { data } = await supabase.from("cms_content").select("key,type,value_draft,value_published");
          if (cancelled) return;
          const pub: Record<string, any> = {};
          const dft: Record<string, any> = {};
          const tps: Record<string, CmsType> = {};
          (data as any as CmsRow[] | null)?.forEach(r => {
            tps[r.key] = r.type;
            if (r.value_published !== null && r.value_published !== undefined) pub[r.key] = r.value_published;
            if (r.value_draft !== null && r.value_draft !== undefined) dft[r.key] = r.value_draft;
          });
          setPublished(pub); setDrafts(dft); setTypes(tps);
        } else {
          const { data } = await supabase.from("cms_content_public").select("key,type,value");
          if (cancelled) return;
          const pub: Record<string, any> = {};
          const tps: Record<string, CmsType> = {};
          (data as any[] | null)?.forEach(r => {
            pub[r.key] = r.value;
            tps[r.key] = r.type;
          });
          setPublished(pub); setTypes(tps);
        }
      } catch (e) {
        console.error("CMS load failed", e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [realIsAdmin]);

  // Realtime sync for admins
  useEffect(() => {
    if (!realIsAdmin) return;
    const channel = supabase
      .channel("cms_content_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_content" }, (payload: any) => {
        const row = (payload.new ?? payload.old) as CmsRow;
        if (!row?.key) return;
        if (payload.eventType === "DELETE") {
          setPublished(p => { const n = { ...p }; delete n[row.key]; return n; });
          setDrafts(d => { const n = { ...d }; delete n[row.key]; return n; });
          return;
        }
        setTypes(t => ({ ...t, [row.key]: row.type }));
        setPublished(p => ({ ...p, [row.key]: row.value_published }));
        setDrafts(d => {
          const n = { ...d };
          if (row.value_draft === null || row.value_draft === undefined) delete n[row.key];
          else n[row.key] = row.value_draft;
          return n;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [realIsAdmin]);

  const saveDraft = useCallback(async (key: string, type: CmsType, value: any) => {
    setDrafts(d => ({ ...d, [key]: value }));
    setTypes(t => ({ ...t, [key]: type }));
    const { error } = await supabase.rpc("cms_save_draft", { _key: key, _type: type, _value: value });
    if (error) {
      toast.error("Sauvegarde impossible");
      console.error(error);
    }
  }, []);

  const publishAll = useCallback(async () => {
    const { error } = await supabase.rpc("cms_publish", { _keys: null as any });
    if (error) { toast.error("Publication impossible"); return; }
    setPublished(p => ({ ...p, ...drafts }));
    setDrafts({});
    toast.success("Modifications publiées");
  }, [drafts]);

  const publishKey = useCallback(async (key: string) => {
    const { error } = await supabase.rpc("cms_publish", { _keys: [key] as any });
    if (error) { toast.error("Publication impossible"); return; }
    setPublished(p => ({ ...p, [key]: drafts[key] }));
    setDrafts(d => { const n = { ...d }; delete n[key]; return n; });
  }, [drafts]);

  const revertDraft = useCallback(async (key: string) => {
    const { error } = await supabase.rpc("cms_revert_draft", { _key: key });
    if (error) { toast.error("Annulation impossible"); return; }
    setDrafts(d => { const n = { ...d }; delete n[key]; return n; });
  }, []);

  const values = useMemo(() => {
    if (realIsAdmin && previewDrafts) {
      return { ...published, ...drafts };
    }
    return published;
  }, [published, drafts, realIsAdmin, previewDrafts]);

  const pendingCount = Object.keys(drafts).length;

  return (
    <CmsContext.Provider value={{
      values, drafts, published, loaded,
      editMode: editMode && realIsAdmin,
      previewDrafts,
      setEditMode, setPreviewDrafts,
      pendingCount,
      saveDraft, publishAll, publishKey, revertDraft,
    }}>
      {children}
    </CmsContext.Provider>
  );
}
