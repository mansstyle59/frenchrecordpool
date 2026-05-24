import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCms } from "@/contexts/CmsContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Rend automatiquement modifiables :
 *  - tous les textes statiques (contentEditable au survol en mode édition admin)
 *  - toutes les images <img> (overlay "Image" → upload ou URL)
 *  - tous les liens <a> avec href (overlay "Lien" → modifier l'URL)
 *
 * Pour exclure : data-cms-skip sur un parent.
 */

const TEXT_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,a,button,li,blockquote,figcaption,label,small,strong,em,span";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "SVG", "PATH"]);

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

type ImgTarget = { key: string; el: HTMLImageElement; current: string };
type LinkTarget = { key: string; el: HTMLAnchorElement; current: string };

const SECTION_SELECTOR = "section[id], section[data-cms-section], [data-cms-block]";

export default function CmsAutoEditor() {
  const { editMode, values, saveDraft } = useCms();
  const { pathname } = useLocation();
  const editModeRef = useRef(editMode);
  const valuesRef = useRef(values);
  const pathRef = useRef(pathname);
  const saveRef = useRef(saveDraft);

  const [imgTarget, setImgTarget] = useState<ImgTarget | null>(null);
  const [imgUrl, setImgUrl] = useState("");
  const [imgUploading, setImgUploading] = useState(false);

  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { valuesRef.current = values; }, [values]);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  useEffect(() => { saveRef.current = saveDraft; }, [saveDraft]);

  useEffect(() => {
    const onTextBlur = (ev: FocusEvent) => {
      const e = ev.target as HTMLElement;
      const key = e.dataset.cmsAuto;
      if (!key) return;
      const val = (e.textContent || "").trim();
      const orig = e.dataset.cmsOrig || "";
      if (val && val !== orig) {
        e.dataset.cmsOrig = val;
        saveRef.current(key, "text", val);
      }
    };

    const onImgClick = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      const btn = ev.currentTarget as HTMLElement;
      const img = btn.previousElementSibling as HTMLImageElement | null;
      if (!img) return;
      const key = img.dataset.cmsImg!;
      setImgTarget({ key, el: img, current: img.src });
      setImgUrl(img.src);
    };

    const onLinkClick = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      const btn = ev.currentTarget as HTMLElement;
      const a = btn.previousElementSibling as HTMLAnchorElement | null;
      if (!a) return;
      const key = a.dataset.cmsHref!;
      setLinkTarget({ key, el: a, current: a.getAttribute("href") || "" });
      setLinkUrl(a.getAttribute("href") || "");
    };

    let raf = 0;
    let scanning = false;

    const scan = () => {
      scanning = true;
      try {
        // ===== Textes =====
        const nodes = document.body.querySelectorAll(TEXT_SELECTOR);
        nodes.forEach((el) => {
          const e = el as HTMLElement;
          if (SKIP_TAGS.has(e.tagName)) return;
          if (e.closest("[data-cms-skip]")) return;
          if (e.closest("input,textarea,select")) return;
          if (e.closest("[data-cms]")) return;
          if (e.childNodes.length !== 1 || e.childNodes[0].nodeType !== Node.TEXT_NODE) return;
          const raw = e.textContent || "";
          const text = raw.trim();
          if (!text || text.length > 400) return;

          let key = e.dataset.cmsAuto;
          if (!key) {
            key = `auto:${pathRef.current}:${e.tagName.toLowerCase()}:${hashStr(text)}`;
            e.dataset.cmsAuto = key;
            e.dataset.cmsOrig = text;
          }

          const stored = valuesRef.current[key];
          if (typeof stored === "string" && e.textContent !== stored) {
            e.textContent = stored;
            e.dataset.cmsOrig = stored;
          }

          if (editModeRef.current) {
            if (e.getAttribute("contenteditable") !== "true") {
              e.setAttribute("contenteditable", "true");
              e.classList.add("cms-auto-editable");
              e.addEventListener("blur", onTextBlur);
              e.setAttribute("spellcheck", "false");
            }
          } else if (e.getAttribute("contenteditable") === "true") {
            e.removeAttribute("contenteditable");
            e.classList.remove("cms-auto-editable");
            e.removeEventListener("blur", onTextBlur);
          }
        });

        // ===== Images =====
        document.body.querySelectorAll("img").forEach((el) => {
          const img = el as HTMLImageElement;
          if (img.closest("[data-cms-skip]")) return;
          if (img.closest("[data-cms]")) return;
          if (!img.src || img.src.startsWith("data:")) return;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w && h && (w < 32 || h < 32)) return; // skip icons

          let key = img.dataset.cmsImg;
          if (!key) {
            key = `auto-img:${pathRef.current}:${hashStr(img.src)}`;
            img.dataset.cmsImg = key;
            img.dataset.cmsOrigSrc = img.src;
          }
          const stored = valuesRef.current[key];
          if (typeof stored === "string" && img.src !== stored) {
            img.src = stored;
          }

          const next = img.nextElementSibling as HTMLElement | null;
          const hasBtn = next?.classList.contains("cms-auto-img-btn");
          if (editModeRef.current && !hasBtn) {
            img.classList.add("cms-auto-img");
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cms-auto-img-btn";
            btn.textContent = "✎ Image";
            btn.addEventListener("click", onImgClick);
            img.parentElement?.insertBefore(btn, img.nextSibling);
          } else if (!editModeRef.current && hasBtn) {
            img.classList.remove("cms-auto-img");
            (next as HTMLElement).removeEventListener("click", onImgClick);
            next!.remove();
          }
        });

        // ===== Liens =====
        document.body.querySelectorAll("a[href]").forEach((el) => {
          const a = el as HTMLAnchorElement;
          if (a.closest("[data-cms-skip]")) return;
          if (a.closest("[data-cms]")) return;
          const href = a.getAttribute("href") || "";
          if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

          let key = a.dataset.cmsHref;
          if (!key) {
            key = `auto-href:${pathRef.current}:${hashStr(href + "|" + (a.textContent?.trim() || ""))}`;
            a.dataset.cmsHref = key;
            a.dataset.cmsOrigHref = href;
          }
          const stored = valuesRef.current[key];
          if (typeof stored === "string" && a.getAttribute("href") !== stored) {
            a.setAttribute("href", stored);
          }

          const next = a.nextElementSibling as HTMLElement | null;
          const hasBtn = next?.classList.contains("cms-auto-link-btn");
          if (editModeRef.current && !hasBtn) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cms-auto-link-btn";
            btn.textContent = "🔗";
            btn.title = "Modifier le lien";
            btn.addEventListener("click", onLinkClick);
            a.parentElement?.insertBefore(btn, a.nextSibling);
          } else if (!editModeRef.current && hasBtn) {
            (next as HTMLElement).removeEventListener("click", onLinkClick);
            next!.remove();
          }
        });

        // ===== Sections (visibilité) =====
        document.body.querySelectorAll<HTMLElement>(SECTION_SELECTOR).forEach((sec) => {
          if (sec.closest("[data-cms-skip]")) return;
          const id = sec.id || sec.dataset.cmsSection || hashStr(sec.outerHTML.slice(0, 200));
          const key = `auto-vis:${pathRef.current}:${id}`;
          sec.dataset.cmsVis = key;
          const stored = valuesRef.current[key];
          const hidden = stored === false || stored === "hidden";
          sec.style.display = hidden ? (editModeRef.current ? "" : "none") : "";
          if (editModeRef.current) sec.style.opacity = hidden ? "0.4" : "";
          else sec.style.opacity = "";

          let badge = sec.querySelector<HTMLButtonElement>(":scope > .cms-auto-vis-btn");
          if (editModeRef.current) {
            if (!badge) {
              badge = document.createElement("button");
              badge.type = "button";
              badge.className = "cms-auto-vis-btn";
              if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
              sec.appendChild(badge);
              badge.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const cur = valuesRef.current[key];
                const isHidden = cur === false || cur === "hidden";
                saveRef.current(key, "visibility", !isHidden ? "hidden" : "visible");
              });
            }
            badge.textContent = hidden ? "👁 Afficher" : "🚫 Masquer";
          } else if (badge) {
            badge.remove();
          }
        });
      } finally {
        scanning = false;
      }
    };

    const schedule = () => {
      if (scanning) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    };

    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      document.querySelectorAll<HTMLElement>("[data-cms-auto]").forEach((e) => {
        if (e.getAttribute("contenteditable") === "true") {
          e.removeAttribute("contenteditable");
          e.classList.remove("cms-auto-editable");
          e.removeEventListener("blur", onTextBlur);
        }
      });
      document.querySelectorAll<HTMLElement>(".cms-auto-img-btn, .cms-auto-link-btn").forEach((b) => b.remove());
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.dispatchEvent(new Event("cms:refresh"));
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, values, editMode]);

  // ===== Dialog handlers =====
  const uploadFile = async (file: File) => {
    if (!imgTarget) return;
    setImgUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `cms/${imgTarget.key.replace(/[^a-z0-9_-]/gi, "_")}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
      setImgUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e?.message || "Upload impossible");
    } finally {
      setImgUploading(false);
    }
  };

  const saveImage = async () => {
    if (!imgTarget || !imgUrl) return;
    await saveRef.current(imgTarget.key, "image", imgUrl);
    imgTarget.el.src = imgUrl;
    toast.success("Image enregistrée (brouillon)");
    setImgTarget(null);
  };

  const saveLink = async () => {
    if (!linkTarget) return;
    await saveRef.current(linkTarget.key, "url", linkUrl);
    linkTarget.el.setAttribute("href", linkUrl);
    toast.success("Lien enregistré (brouillon)");
    setLinkTarget(null);
  };

  return (
    <>
      <Dialog open={!!imgTarget} onOpenChange={(o) => !o && setImgTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remplacer l'image</DialogTitle>
          </DialogHeader>
          {imgUrl && (
            <div className="rounded border border-border overflow-hidden bg-muted">
              <img src={imgUrl} alt="" className="w-full max-h-48 object-contain" />
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label className="flex items-center gap-2 mb-1"><Upload className="h-4 w-4" /> Téléverser</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={imgUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1"><LinkIcon className="h-4 w-4" /> Ou URL</Label>
              <Input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImgTarget(null)}>Annuler</Button>
            <Button onClick={saveImage} disabled={imgUploading || !imgUrl || imgUrl === imgTarget?.current}>
              {imgUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkTarget} onOpenChange={(o) => !o && setLinkTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le lien</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-1 block">URL de destination</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… ou /route" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Texte actuel : « {linkTarget?.el.textContent?.trim()} »
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkTarget(null)}>Annuler</Button>
            <Button onClick={saveLink} disabled={!linkUrl || linkUrl === linkTarget?.current}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
