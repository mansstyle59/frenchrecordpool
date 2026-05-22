import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCms } from "@/contexts/CmsContext";

/**
 * Rend automatiquement modifiables tous les textes statiques de toute page.
 * - En mode édition (admin) : chaque élément textuel devient contentEditable au survol.
 * - Pour tous les visiteurs : applique les valeurs publiées si elles existent.
 *
 * Pour exclure un conteneur, ajouter l'attribut: data-cms-skip
 */

const EDITABLE_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,a,button,li,blockquote,figcaption,label,small,strong,em,span";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "SVG", "PATH"]);

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export default function CmsAutoEditor() {
  const { editMode, values, saveDraft } = useCms();
  const { pathname } = useLocation();
  const editModeRef = useRef(editMode);
  const valuesRef = useRef(values);
  const pathRef = useRef(pathname);
  const saveRef = useRef(saveDraft);

  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { valuesRef.current = values; }, [values]);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  useEffect(() => { saveRef.current = saveDraft; }, [saveDraft]);

  useEffect(() => {
    const onBlur = (ev: FocusEvent) => {
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

    let raf = 0;
    let scanning = false;

    const scan = () => {
      scanning = true;
      try {
        const nodes = document.body.querySelectorAll(EDITABLE_SELECTOR);
        nodes.forEach((el) => {
          const e = el as HTMLElement;
          if (SKIP_TAGS.has(e.tagName)) return;
          if (e.closest("[data-cms-skip]")) return;
          if (e.closest("input,textarea,select")) return;
          // Skip elements already managed by typed CMS components
          if (e.closest("[data-cms]")) return;
          // Must contain exactly one text node child
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
          if (stored !== undefined && stored !== null && typeof stored === "string" && e.textContent !== stored) {
            e.textContent = stored;
            e.dataset.cmsOrig = stored;
          }

          if (editModeRef.current) {
            if (e.getAttribute("contenteditable") !== "true") {
              e.setAttribute("contenteditable", "true");
              e.classList.add("cms-auto-editable");
              e.addEventListener("blur", onBlur);
              e.setAttribute("spellcheck", "false");
            }
          } else if (e.getAttribute("contenteditable") === "true") {
            e.removeAttribute("contenteditable");
            e.classList.remove("cms-auto-editable");
            e.removeEventListener("blur", onBlur);
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
          e.removeEventListener("blur", onBlur);
        }
      });
    };
  }, []);

  // Re-scan when route or values change
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      // trigger a no-op DOM read; scan effect uses refs + MutationObserver
      const evt = new Event("cms:refresh");
      document.dispatchEvent(evt);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, values, editMode]);

  return null;
}
