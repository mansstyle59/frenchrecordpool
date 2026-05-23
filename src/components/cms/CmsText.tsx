import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { Pencil, Type, Smartphone, Tablet, Monitor, Lock } from "lucide-react";
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
  /** Empêche toute modification de la taille du texte (pages sensibles). */
  lockSize?: boolean;
  children: string;
}

type Breakpoint = "mobile" | "tablet" | "desktop";

interface SizeValue {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  /** legacy single-size value */
  fontSize?: number;
}

const SIZE_PRESETS = [
  10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36,
  40, 48, 56, 64, 72, 80, 96, 112, 128,
];

const BP_META: Record<Breakpoint, { label: string; icon: ElementType; mq: string }> = {
  mobile:  { label: "Mobile",   icon: Smartphone, mq: "(max-width: 767px)" },
  tablet:  { label: "Tablette", icon: Tablet,     mq: "(min-width: 768px) and (max-width: 1023px)" },
  desktop: { label: "Desktop",  icon: Monitor,    mq: "(min-width: 1024px)" },
};

const saveTimer: Record<string, any> = {};

/** Stable, CSS-safe id derived from editKey */
function safeId(key: string) {
  return "cms-" + key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Detect current breakpoint (client-only). Falls back to desktop on SSR. */
function useCurrentBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });
  useEffect(() => {
    const onR = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return bp;
}

/** Resolve effective size for a breakpoint with desktop→tablet→mobile fallback. */
function resolveSize(v: SizeValue | null | undefined, bp: Breakpoint): number | undefined {
  if (!v) return undefined;
  // legacy
  const legacy = v.fontSize;
  if (bp === "mobile")  return v.mobile  ?? v.tablet  ?? v.desktop ?? legacy;
  if (bp === "tablet")  return v.tablet  ?? v.desktop ?? v.mobile  ?? legacy;
  return v.desktop ?? v.tablet ?? v.mobile ?? legacy;
}

export default function CmsText({
  editKey, as: Tag = "span", className, multiline = false, maxLength = 5000, lockSize = false, children,
}: CmsTextProps) {
  const value = useCmsValue<string>(editKey, children);
  const sizeKey = `${editKey}__size`;
  const sizeVal = useCmsValue<SizeValue | null>(sizeKey, null);
  const { editMode, saveDraft } = useCms();
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [activeBp, setActiveBp] = useState<Breakpoint>("desktop");
  const currentBp = useCurrentBreakpoint();

  useEffect(() => {
    if (!editing && ref.current) ref.current.textContent = value;
  }, [value, editing]);

  // Build a stable class + scoped <style> with media queries
  const cls = useMemo(() => safeId(editKey), [editKey]);
  const hasAnySize = !lockSize && !!(sizeVal && (sizeVal.mobile || sizeVal.tablet || sizeVal.desktop || sizeVal.fontSize));

  const styleTag = hasAnySize ? (
    <style>{[
      sizeVal?.mobile  && `@media ${BP_META.mobile.mq}{.${cls}{font-size:${sizeVal.mobile}px;line-height:1.15}}`,
      sizeVal?.tablet  && `@media ${BP_META.tablet.mq}{.${cls}{font-size:${sizeVal.tablet}px;line-height:1.15}}`,
      sizeVal?.desktop && `@media ${BP_META.desktop.mq}{.${cls}{font-size:${sizeVal.desktop}px;line-height:1.15}}`,
      // legacy fallback if no per-bp value
      !sizeVal?.mobile && !sizeVal?.tablet && !sizeVal?.desktop && sizeVal?.fontSize
        && `.${cls}{font-size:${sizeVal.fontSize}px;line-height:1.15}`,
    ].filter(Boolean).join("")}</style>
  ) : null;

  if (!editMode) {
    return (
      <>
        {styleTag}
        <Tag className={cn(className, hasAnySize && cls)}>{value}</Tag>
      </>
    );
  }

  const onInput = (e: React.FormEvent<HTMLElement>) => {
    const txt = (e.currentTarget.textContent || "").slice(0, maxLength);
    clearTimeout(saveTimer[editKey]);
    saveTimer[editKey] = setTimeout(() => {
      saveDraft(editKey, multiline ? "richtext" : "text", txt);
    }, 700);
  };

  const setBpSize = (bp: Breakpoint, size: number | null) => {
    const next: SizeValue = { ...(sizeVal || {}) };
    // strip legacy once user starts using per-bp
    delete next.fontSize;
    if (size == null) delete next[bp];
    else next[bp] = size;
    saveDraft(sizeKey, "style", next);
  };

  const resetAll = () => saveDraft(sizeKey, "style", {});

  const activeSize = sizeVal?.[activeBp];
  const ActiveIcon = BP_META[activeBp].icon;
  const displaySize = resolveSize(sizeVal, currentBp);

  return (
    <span className="relative inline-block group/cms align-baseline">
      {styleTag}
      <Tag
        ref={ref as any}
        className={cn(
          className,
          hasAnySize && cls,
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
              title={`Taille du texte (rendu actuel: ${displaySize ?? "auto"})`}
            >
              <Type className="h-3 w-3" />
              {displaySize ?? "auto"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto w-56">
            <DropdownMenuLabel className="text-[10px]">Taille par breakpoint</DropdownMenuLabel>

            {/* Breakpoint tabs */}
            <div className="px-2 pb-2 pt-1 flex gap-1">
              {(Object.keys(BP_META) as Breakpoint[]).map((bp) => {
                const Icon = BP_META[bp].icon;
                const has = !!sizeVal?.[bp];
                return (
                  <button
                    key={bp}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setActiveBp(bp)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded border text-[10px] transition-colors",
                      activeBp === bp
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted",
                      has && activeBp !== bp && "border-primary/50"
                    )}
                    title={BP_META[bp].label}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="font-mono">{sizeVal?.[bp] ?? "—"}</span>
                  </button>
                );
              })}
            </div>

            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <ActiveIcon className="h-3 w-3" />
              Définir pour <strong className="text-foreground">{BP_META[activeBp].label}</strong>
            </div>

            <DropdownMenuItem onClick={() => setBpSize(activeBp, null)} className="text-xs">
              Hériter (par défaut)
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <div className="max-h-48 overflow-y-auto">
              {SIZE_PRESETS.map(s => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setBpSize(activeBp, s)}
                  className={cn("text-xs font-mono", activeSize === s && "bg-primary/10 text-primary")}
                >
                  {s}px
                </DropdownMenuItem>
              ))}
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px]">Personnalisé (px)</DropdownMenuLabel>
            <div className="px-2 py-1">
              <input
                type="number"
                min={1}
                max={999}
                value={customSize}
                placeholder="ex: 34"
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(customSize, 10);
                    if (!isNaN(n) && n >= 1 && n <= 999) {
                      setBpSize(activeBp, n);
                      setCustomSize("");
                    }
                  }
                }}
                onBlur={() => setCustomSize("")}
                className="w-full h-7 px-1.5 text-xs font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetAll} className="text-xs text-destructive">
              Réinitialiser tous les breakpoints
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </span>
  );
}
