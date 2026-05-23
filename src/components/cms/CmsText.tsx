import { useEffect, useRef, useState, type ElementType } from "react";
import { Pencil, Type } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CmsTextProps {
  editKey: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  children: string;
}

const SIZE_PRESETS = [
  10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36,
  40, 48, 56, 64, 72, 80, 96, 112, 128,
];

let saveTimer: Record<string, any> = {};

export default function CmsText({
  editKey, as: Tag = "span", className, multiline = false, maxLength = 5000, children,
}: CmsTextProps) {
  const value = useCmsValue<string>(editKey, children);
  const sizeKey = `${editKey}__size`;
  const sizeVal = useCmsValue<{ fontSize?: number } | null>(sizeKey, null);
  const { editMode, saveDraft } = useCms();
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing && ref.current) ref.current.textContent = value;
  }, [value, editing]);

  const inlineStyle = sizeVal?.fontSize
    ? { fontSize: `${sizeVal.fontSize}px`, lineHeight: 1.15 }
    : undefined;

  if (!editMode) {
    return <Tag className={className} style={inlineStyle}>{value}</Tag>;
  }

  const onInput = (e: React.FormEvent<HTMLElement>) => {
    const txt = (e.currentTarget.textContent || "").slice(0, maxLength);
    clearTimeout(saveTimer[editKey]);
    saveTimer[editKey] = setTimeout(() => {
      saveDraft(editKey, multiline ? "richtext" : "text", txt);
    }, 700);
  };

  const setSize = (size: number | null) => {
    saveDraft(sizeKey, "style", size ? { fontSize: size } : {});
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
        style={inlineStyle}
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

      <span className="absolute -top-3 -right-3 z-10 hidden group-hover/cms:flex items-center gap-1">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md pointer-events-none"
          title="Éditer le texte"
        >
          <Pencil className="h-3 w-3" />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className="flex items-center gap-1 h-6 px-1.5 rounded-full bg-background text-foreground border border-primary shadow-md text-[10px] font-mono hover:bg-primary hover:text-primary-foreground transition-colors"
              title="Taille du texte"
            >
              <Type className="h-3 w-3" />
              {sizeVal?.fontSize ?? "auto"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-28">
            <DropdownMenuLabel className="text-[10px]">Taille (px)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSize(null)} className="text-xs">
              Par défaut
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {SIZE_PRESETS.map(s => (
              <DropdownMenuItem
                key={s}
                onClick={() => setSize(s)}
                className={cn("text-xs font-mono", sizeVal?.fontSize === s && "bg-primary/10 text-primary")}
              >
                {s}px
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </span>
  );
}
