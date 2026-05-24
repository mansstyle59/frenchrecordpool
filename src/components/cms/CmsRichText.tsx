import { useEffect, useRef, useState, type ElementType } from "react";
import { Pencil, Bold, Italic, Underline as UIcon, Link2, List, ListOrdered } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface Props {
  editKey: string;
  as?: ElementType;
  className?: string;
  children: string; // fallback HTML/text
}

let saveTimer: Record<string, any> = {};

/**
 * Lightweight rich-text editor. Stores raw HTML string under type "richtext".
 * Toolbar appears while editing.
 */
export default function CmsRichText({ editKey, as: Tag = "div", className, children }: Props) {
  const value = useCmsValue<string>(editKey, children);
  const { editMode, saveDraft } = useCms();
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing && ref.current) ref.current.innerHTML = sanitizeHtml(value);
  }, [value, editing]);

  if (!editMode) {
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />;
  }

  const queueSave = () => {
    const html = ref.current?.innerHTML || "";
    clearTimeout(saveTimer[editKey]);
    saveTimer[editKey] = setTimeout(() => saveDraft(editKey, "richtext", html), 700);
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    queueSave();
    ref.current?.focus();
  };

  return (
    <span className="relative inline-block group/cms w-full">
      {editing && (
        <div className="absolute -top-9 left-0 z-20 flex items-center gap-0.5 rounded-md border border-border bg-popover shadow-md px-1 py-1">
          <ToolBtn onClick={() => exec("bold")}><Bold className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn onClick={() => exec("italic")}><Italic className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn onClick={() => exec("underline")}><UIcon className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn onClick={() => {
            const u = prompt("URL du lien");
            if (u) exec("createLink", u);
          }}><Link2 className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn onClick={() => exec("insertUnorderedList")}><List className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn onClick={() => exec("insertOrderedList")}><ListOrdered className="h-3.5 w-3.5" /></ToolBtn>
        </div>
      )}
      <Tag
        ref={ref as any}
        className={cn(
          className,
          "outline-none ring-1 ring-transparent hover:ring-primary/40 focus:ring-primary rounded-sm transition-shadow",
          editing && "ring-primary"
        )}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          clearTimeout(saveTimer[editKey]);
          saveDraft(editKey, "richtext", ref.current?.innerHTML || "");
        }}
        onInput={queueSave}
        dangerouslySetInnerHTML={{ __html: value || "" }}
      />
      <span className="absolute -top-2 -right-2 z-10 hidden group-hover/cms:flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md pointer-events-none">
        <Pencil className="h-3 w-3" />
      </span>
    </span>
  );
}

function ToolBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-secondary text-foreground/80"
    >
      {children}
    </button>
  );
}
