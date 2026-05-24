import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { Pencil, Type, Lock, RotateCcw, Smartphone, Monitor } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent,
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

/**
 * SizeValue — nouveau modèle fluide:
 *   - min: taille px à 320 vw (mobile)
 *   - max: taille px à 1440 vw (desktop)
 *   Le rendu utilise clamp() pour interpoler linéairement entre les deux.
 *
 * Compatibilité ascendante: les anciennes valeurs (mobile/tablet/desktop/fontSize)
 * sont automatiquement converties en min/max au premier rendu.
 */
interface SizeValue {
  min?: number;
  max?: number;
  // legacy
  mobile?: number;
  tablet?: number;
  desktop?: number;
  fontSize?: number;
}

/** Presets sémantiques (min → max en px) */
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

const saveTimer: Record<string, any> = {};

/** Stable, CSS-safe id derived from editKey */
function safeId(key: string) {
  return "cms-" + key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Convertit l'ancien format en {min,max}. */
function normalize(v: SizeValue | null | undefined): { min?: number; max?: number } {
  if (!v) return {};
  if (v.min != null || v.max != null) return { min: v.min, max: v.max };
  const legacy = v.fontSize;
  const mobile = v.mobile ?? v.tablet ?? v.desktop ?? legacy;
  const desktop = v.desktop ?? v.tablet ?? v.mobile ?? legacy;
  if (mobile == null && desktop == null) return {};
  return { min: mobile, max: desktop };
}

/** clamp() linéaire entre VP_MIN et VP_MAX. */
function clampExpr(min: number, max: number) {
  if (min === max) return `${min}px`;
  const slope = ((max - min) * 100) / (VP_MAX - VP_MIN);          // vw factor
  const intercept = min - (slope * VP_MIN) / 100;                 // px constant
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
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);

  const { min, max } = useMemo(() => normalize(sizeVal), [sizeVal]);
  const hasSize = !lockSize && (min != null || max != null);

  // Sliders state (initialisé depuis sizeVal, restauré quand on change d'élément)
  const [minDraft, setMinDraft] = useState<number>(min ?? 16);
  const [maxDraft, setMaxDraft] = useState<number>(max ?? Math.max(min ?? 16, 24));
  useEffect(() => {
    setMinDraft(min ?? 16);
    setMaxDraft(max ?? Math.max(min ?? 16, 24));
  }, [min, max]);

  useEffect(() => {
    if (!editing && ref.current) ref.current.textContent = value;
  }, [value, editing]);

  const cls = useMemo(() => safeId(editKey), [editKey]);

  const styleTag = hasSize ? (
    <style>{
      `.${cls}{font-size:${clampExpr(min ?? maxDraft, max ?? minDraft)};line-height:1.1}`
    }</style>
  ) : null;

  if (!editMode) {
    return (
      <>
        {styleTag}
        <Tag className={cn(className, hasSize && cls)}>{value}</Tag>
      </>
    );
  }

  const commitSize = (next: SizeValue | null) => {
    saveDraft(sizeKey, "style", next ?? {});
  };

  const onInput = (e: React.FormEvent<HTMLElement>) => {
    const txt = (e.currentTarget.textContent || "").slice(0, maxLength);
    clearTimeout(saveTimer[editKey]);
    saveTimer[editKey] = setTimeout(() => {
      saveDraft(editKey, multiline ? "richtext" : "text", txt);
    }, 700);
  };

  const applyPreset = (p: { min: number; max: number }) => {
    setMinDraft(p.min);
    setMaxDraft(p.max);
    commitSize({ min: p.min, max: p.max });
  };

  const onMinChange = (n: number) => {
    const clamped = Math.max(8, Math.min(200, n));
    setMinDraft(clamped);
    const safeMax = Math.max(clamped, maxDraft);
    if (safeMax !== maxDraft) setMaxDraft(safeMax);
    commitSize({ min: clamped, max: safeMax });
  };
  const onMaxChange = (n: number) => {
    const clamped = Math.max(8, Math.min(300, n));
    setMaxDraft(clamped);
    const safeMin = Math.min(clamped, minDraft);
    if (safeMin !== minDraft) setMinDraft(safeMin);
    commitSize({ min: safeMin, max: clamped });
  };

  const resetAll = () => commitSize(null);

  // Sample courant rendu (utile pour montrer la taille effective)
  const effectiveSummary = min != null || max != null
    ? `${min ?? "—"} → ${max ?? "—"}px`
    : "auto";

  return (
    <span className="relative inline-block group/cms align-baseline">
      {styleTag}
      <Tag
        ref={ref as any}
        className={cn(
          className,
          hasSize && cls,
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
        {lockSize ? (
          <span
            className="flex items-center gap-1 h-6 px-1.5 rounded-full bg-muted text-muted-foreground border border-border shadow-md text-[10px] font-mono cursor-not-allowed"
            title="Taille verrouillée sur ce texte"
          >
            <Lock className="h-3 w-3" />
            verrouillé
          </span>
        ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className="flex items-center gap-1 h-6 px-1.5 rounded-full bg-background text-foreground border border-primary shadow-md text-[10px] font-mono hover:bg-primary hover:text-primary-foreground transition-colors"
              title={`Taille fluide (min → max): ${effectiveSummary}`}
            >
              <Type className="h-3 w-3" />
              {effectiveSummary}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 p-0"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="px-3 py-2">
              <DropdownMenuLabel className="px-0 text-[10px] flex items-center justify-between">
                <span>Taille fluide (clamp)</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={resetAll}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  title="Hériter (taille par défaut)"
                >
                  <RotateCcw className="h-3 w-3" /> reset
                </button>
              </DropdownMenuLabel>

              {/* Sliders */}
              <div className="space-y-3 mt-2">
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
              </div>

              {/* Aperçu live */}
              <div className="mt-3 rounded border border-border bg-muted/40 px-2 py-1.5 text-center overflow-hidden">
                <span
                  className={cn("inline-block leading-none", className)}
                  style={{ fontSize: clampExpr(minDraft, maxDraft) as any }}
                >
                  Aa
                </span>
                <div className="mt-1 text-[9px] font-mono text-muted-foreground truncate">
                  clamp({minDraft}px, …, {maxDraft}px)
                </div>
              </div>
            </div>

            <DropdownMenuSeparator />

            <div className="px-2 py-2">
              <div className="text-[10px] text-muted-foreground px-1 mb-1">Presets sémantiques</div>
              <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto">
                {SEMANTIC_PRESETS.map((p) => {
                  const active = minDraft === p.min && maxDraft === p.max;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyPreset(p)}
                      title={p.hint}
                      className={cn(
                        "flex items-center justify-between px-2 py-1 rounded border text-[10px] font-mono transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      <span className="font-sans font-semibold">{p.label}</span>
                      <span className="opacity-70">{p.min}-{p.max}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </span>
    </span>
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
