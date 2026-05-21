import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { cn } from "@/lib/utils";

interface CmsTextProps {
  editKey: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  children: string;
}

let saveTimer: Record<string, any> = {};

export default function CmsText({
  editKey, as: Tag = "span", className, multiline = false, maxLength = 5000, children,
}: CmsTextProps) {
  const value = useCmsValue<string>(editKey, children);
  const { editMode, saveDraft } = useCms();
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing && ref.current) ref.current.textContent = value;
  }, [value, editing]);

  if (!editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  const onInput = (e: React.FormEvent<HTMLElement>) => {
    const txt = (e.currentTarget.textContent || "").slice(0, maxLength);
    clearTimeout(saveTimer[editKey]);
    saveTimer[editKey] = setTimeout(() => {
      saveDraft(editKey, multiline ? "richtext" : "text", txt);
    }, 700);
  };

  return (
    <span className="relative inline-block group/cms align-baseline">
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
        onBlur={(e) => {
          setEditing(false);
          const txt = (e.currentTarget.textContent || "").slice(0, maxLength);
          clearTimeout(saveTimer[editKey]);
          saveDraft(editKey, multiline ? "richtext" : "text", txt);
        }}
        onInput={onInput}
      >
        {value}
      </Tag>
      <span
        className="absolute -top-2 -right-2 z-10 hidden group-hover/cms:flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md pointer-events-none"
        title="Éditer"
      >
        <Pencil className="h-3 w-3" />
      </span>
    </span>
  );
}
