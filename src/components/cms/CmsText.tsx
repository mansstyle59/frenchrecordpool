import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { Pencil, Type, Lock, RotateCcw, Smartphone, Monitor, Check, X } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

interface SizeValue {
  min?: number;
  max?: number;
  // legacy
  mobile?: number;
  tablet?: number;
  desktop?: number;
  fontSize?: number;
}

const SEMANTIC_PRESETS: { label: string; min: number; max: number; hint: string }[] = [
  { label: "Caption",  min: 11, max: 13,  hint: "Légendes, métadonnées" },
  { label: "Body S",   min: 13, max: 14,  hint: "Texte secondaire" },
  { label: "Body",     min: 14, max: 16,  hint: "Paragraphe par défaut" },
  { label: "Body L",   min: 16, max: 18,  hint: "Texte mis en avant" },
  { label: "Lead",     min: 18, max: 22,  hint: "Intros / chapeaux" },
  { label: "H4",       min: 18, max: 24,  hint: "Sous-section" },
  { label: "H3",       min: 22, max: 30,  hint: "Titre tertiaire" },
  { label: "H2",       min: 26, max: 44,  hint: "Titre de section" },
  { label: "H1",       min: 34, max: 64,  hint: "Titre principal" },
  { label: "Display",  min: 48, max: 96,  hint: "Hero / accroche" },
  { label: "Hero XL",  min: 56, max: 128, hint: "Très grand impact" },
];

const VP_MIN = 320;
const VP_MAX = 1440;

function safeId(key: string) {
  return "cms-" + key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalize(v: SizeValue | null | undefined): { min?: number; max?: number } {
  if (!v) return {};
  if (v.min != null || v.max != null) return { min: v.min, max: v.max };
  const legacy = v.fontSize;
  const mobile = v.mobile ?? v.tablet ?? v.desktop ?? legacy;
  const desktop = v.desktop ?? v.tablet ?? v.mobile ?? legacy;
  if (mobile == null && desktop == null) return {};
  return { min: mobile, max: desktop };
}

function clampExpr(min: number, max: number) {
  if (min === max) return `${min}px`;
  const slope = ((max - min) * 100) / (VP_MAX - VP_MIN);
  const intercept = min - (slope * VP_MIN) / 100;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return `clamp(${lo}px, ${intercept.toFixed(3)}px + ${slope.toFixed(4)}vw, ${hi}px)`;
}

export default function CmsText({
  editKey, as: Tag = "span", className, multiline = false, maxLength = 5000, lockSize = false, children,
}: CmsTextProps) {
  const value = useCmsValue<string>(editKey, children);
  const sizeKey = `${editKey}__size`;
  const sizeVal = useCmsValue<SizeValue | null>(sizeKey, null);
  const { editMode, saveDraft } = useCms();

  const { min, max } = useMemo(() => normalize(sizeVal), [sizeVal]);
  const hasSize = !lockSize && (min != null || max != null);
  const cls = useMemo(() => safeId(editKey), [editKey]);

  const styleTag = hasSize ? (
    <style>{`.${cls}{font-size:${clampExpr(min ?? max ?? 16, max ?? min ?? 16)};line-height:1.1}`}</style>
  ) : null;

  // === Mode lecture (pas d'édition) ===
  if (!editMode) {
    return (
      <>
        {styleTag}
        <Tag className={cn(className, hasSize && cls)}>{value}</Tag>
      </>
    );
  }

  return (
    <EditableCmsText
      Tag={Tag}
      className={className}
      value={value}
      cls={cls}
      hasSize={hasSize}
      styleTag={styleTag}
      min={min}
      max={max}
      multiline={multiline}
      maxLength={maxLength}
      lockSize={lockSize}
      onSave={(txt) => saveDraft(editKey, multiline ? "richtext" : "text", txt)}
      onSaveSize={(v) => saveDraft(sizeKey, "style", v ?? {})}
    />
  );
}

function EditableCmsText({
  Tag, className, value, cls, hasSize, styleTag, min, max,
  multiline, maxLength, lockSize, onSave, onSaveSize,
}: {
  Tag: ElementType;
  className?: string;
  value: string;
  cls: string;
  hasSize: boolean;
  styleTag: React.ReactNode;
  min?: number;
  max?: number;
  multiline: boolean;
  maxLength: number;
  lockSize: boolean;
  onSave: (txt: string) => void;
  onSaveSize: (v: SizeValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [minDraft, setMinDraft] = useState<number>(min ?? 16);
  const [maxDraft, setMaxDraft] = useState<number>(max ?? Math.max(min ?? 16, 24));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Réinitialise les brouillons à chaque ouverture
  useEffect(() => {
    if (open) {
      setDraft(value);
      setMinDraft(min ?? 16);
      setMaxDraft(max ?? Math.max(min ?? 16, 24));
      setTimeout(() => {
        (multiline ? textareaRef.current : inputRef.current)?.focus();
        (multiline ? textareaRef.current : inputRef.current)?.select();
      }, 60);
    }
  }, [open, value, min, max, multiline]);

  const commit = () => {
    const txt = draft.slice(0, maxLength);
    if (txt !== value) onSave(txt);
    setOpen(false);
  };

  const cancel = () => {
    setDraft(value);
    setOpen(false);
  };

  const applyPreset = (p: { min: number; max: number }) => {
    setMinDraft(p.min);
    setMaxDraft(p.max);
    onSaveSize({ min: p.min, max: p.max });
  };

  const onMinChange = (n: number) => {
    const clamped = Math.max(8, Math.min(200, n));
    setMinDraft(clamped);
    const safeMax = Math.max(clamped, maxDraft);
    setMaxDraft(safeMax);
    onSaveSize({ min: clamped, max: safeMax });
  };
  const onMaxChange = (n: number) => {
    const clamped = Math.max(8, Math.min(300, n));
    setMaxDraft(clamped);
    const safeMin = Math.min(clamped, minDraft);
    setMinDraft(safeMin);
    onSaveSize({ min: safeMin, max: clamped });
  };

  const resetSize = () => {
    setMinDraft(16);
    setMaxDraft(24);
    onSaveSize(null);
  };

  const effectiveSummary = min != null || max != null
    ? `${min ?? "—"}→${max ?? "—"}`
    : "auto";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Tag
          className={cn(
            className,
            hasSize && cls,
            "relative cursor-text rounded-sm ring-1 ring-dashed ring-primary/40 hover:ring-primary hover:ring-2 transition-all px-0.5",
            open && "ring-2 ring-primary"
          )}
          tabIndex={0}
          role="button"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            setOpen(true);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {styleTag}
          {value}
          <span
            className="inline-flex items-center justify-center w-4 h-4 ml-1 align-middle rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 pointer-events-none"
            aria-hidden
          >
            <Pencil className="h-2.5 w-2.5" />
          </span>
        </Tag>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-[min(92vw,380px)] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Pencil className="h-3 w-3 text-primary" />
            Édition de texte
          </div>
          <button
            type="button"
            onClick={cancel}
            className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
            title="Annuler"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Champ texte */}
        <div className="p-3 space-y-2">
          {multiline ? (
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, maxLength))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              rows={4}
              className="text-sm resize-y min-h-[88px]"
              placeholder="Texte…"
            />
          ) : (
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, maxLength))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              className="text-sm h-9"
              placeholder="Texte…"
            />
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{draft.length}/{maxLength}</span>
            <span className="font-mono">
              {multiline ? "⌘+↵ pour valider" : "↵ pour valider"} · Esc annule
            </span>
          </div>
        </div>

        {/* Section taille */}
        {!lockSize ? (
          <div className="px-3 pb-3 pt-1 border-t border-border bg-background/60 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <div className="inline-flex items-center gap-1.5 font-semibold">
                <Type className="h-3 w-3 text-primary" />
                Taille fluide
                <span className="font-mono text-[10px] text-muted-foreground">({effectiveSummary})</span>
              </div>
              <button
                type="button"
                onClick={resetSize}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw className="h-3 w-3" /> reset
              </button>
            </div>

            <SizeSlider
              icon={<Smartphone className="h-3 w-3" />}
              label="Min (mobile)"
              value={minDraft}
              min={8}
              max={120}
              onChange={onMinChange}
            />
            <SizeSlider
              icon={<Monitor className="h-3 w-3" />}
              label="Max (desktop)"
              value={maxDraft}
              min={8}
              max={200}
              onChange={onMaxChange}
            />

            {/* Aperçu live */}
            <div className="rounded border border-border bg-muted/40 px-2 py-1.5 text-center overflow-hidden">
              <span
                className={cn("inline-block leading-none", className)}
                style={{ fontSize: clampExpr(minDraft, maxDraft) as any }}
              >
                Aa
              </span>
              <div className="mt-0.5 text-[9px] font-mono text-muted-foreground truncate">
                {minDraft}px → {maxDraft}px
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Presets sémantiques</div>
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto pr-1">
                {SEMANTIC_PRESETS.map((p) => {
                  const active = minDraft === p.min && maxDraft === p.max;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      title={p.hint}
                      className={cn(
                        "flex flex-col items-center justify-center px-1.5 py-1 rounded border text-[10px] transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      <span className="font-sans font-semibold leading-tight">{p.label}</span>
                      <span className="opacity-70 font-mono text-[9px]">{p.min}-{p.max}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 border-t border-border bg-muted/40 text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Taille verrouillée sur ce texte
          </div>
        )}

        {/* Footer actions */}
        <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancel}>
            Annuler
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={commit}>
            <Check className="h-3 w-3" />
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SizeSlider({
  icon, label, value, min, max, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="inline-flex items-center gap-1 text-muted-foreground">{icon}{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
          className="w-14 h-5 px-1 text-[10px] font-mono bg-background border border-border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 accent-primary cursor-pointer"
      />
    </div>
  );
}
