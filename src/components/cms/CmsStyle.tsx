import { useState, type ReactNode } from "react";
import { Pencil, Settings2 } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface StyleValue {
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  margin?: "none" | "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  opacity?: number; // 0-100
  align?: "left" | "center" | "right";
  hideMobile?: boolean;
  hideTablet?: boolean;
  hideDesktop?: boolean;
}

const DEFAULTS: StyleValue = {
  padding: "none", margin: "none", radius: "none",
  shadow: "none", opacity: 100, align: "left",
  hideMobile: false, hideTablet: false, hideDesktop: false,
};

const MAP = {
  padding: { none: "", sm: "p-2", md: "p-4", lg: "p-6", xl: "p-8" },
  margin: { none: "", sm: "m-2", md: "m-4", lg: "m-6" },
  radius: { none: "rounded-none", sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" },
  shadow: { none: "shadow-none", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-xl" },
  align: { left: "text-left", center: "text-center", right: "text-right" },
} as const;

interface Props {
  editKey: string;
  className?: string;
  children: ReactNode;
}

export function styleToClasses(v: StyleValue): string {
  return cn(
    v.padding && MAP.padding[v.padding],
    v.margin && MAP.margin[v.margin],
    v.radius && MAP.radius[v.radius],
    v.shadow && MAP.shadow[v.shadow],
    v.align && MAP.align[v.align],
    v.hideMobile && "max-md:hidden",
    v.hideTablet && "max-lg:max-md:hidden md:max-lg:hidden",
    v.hideDesktop && "lg:hidden",
  );
}

export default function CmsStyle({ editKey, className, children }: Props) {
  const value = useCmsValue<StyleValue>(editKey, DEFAULTS);
  const { editMode, saveDraft } = useCms();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StyleValue>(value);

  const classes = styleToClasses({ ...DEFAULTS, ...value });
  const opacity = value.opacity ?? 100;

  if (!editMode) {
    return (
      <div className={cn(className, classes)} style={opacity !== 100 ? { opacity: opacity / 100 } : undefined}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative group/cmsstyle", className, classes)} style={opacity !== 100 ? { opacity: opacity / 100 } : undefined}>
      {children}
      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft({ ...DEFAULTS, ...value }); }}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="absolute top-2 right-2 z-10 hidden group-hover/cmsstyle:flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground shadow-md text-[11px]"
          >
            <Settings2 className="h-3 w-3" /> Style
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[340px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Style du bloc</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-4">
            <Row label="Padding">
              <SelectPicker value={draft.padding} onChange={(v) => setDraft({ ...draft, padding: v as any })} options={["none","sm","md","lg","xl"]} />
            </Row>
            <Row label="Marge externe">
              <SelectPicker value={draft.margin} onChange={(v) => setDraft({ ...draft, margin: v as any })} options={["none","sm","md","lg"]} />
            </Row>
            <Row label="Rayon">
              <SelectPicker value={draft.radius} onChange={(v) => setDraft({ ...draft, radius: v as any })} options={["none","sm","md","lg","xl","full"]} />
            </Row>
            <Row label="Ombre">
              <SelectPicker value={draft.shadow} onChange={(v) => setDraft({ ...draft, shadow: v as any })} options={["none","sm","md","lg","xl"]} />
            </Row>
            <Row label="Alignement texte">
              <SelectPicker value={draft.align} onChange={(v) => setDraft({ ...draft, align: v as any })} options={["left","center","right"]} />
            </Row>
            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>Opacité</span>
                <span className="font-mono">{draft.opacity ?? 100}%</span>
              </Label>
              <Slider
                min={20} max={100} step={5}
                value={[draft.opacity ?? 100]}
                onValueChange={([v]) => setDraft({ ...draft, opacity: v })}
                className="mt-2"
              />
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibilité</Label>
              <ToggleRow label="Masquer sur mobile" v={!!draft.hideMobile} onChange={(b) => setDraft({ ...draft, hideMobile: b })} />
              <ToggleRow label="Masquer sur tablette" v={!!draft.hideTablet} onChange={(b) => setDraft({ ...draft, hideTablet: b })} />
              <ToggleRow label="Masquer sur desktop" v={!!draft.hideDesktop} onChange={(b) => setDraft({ ...draft, hideDesktop: b })} />
            </div>

            <Button
              className="w-full"
              onClick={async () => { await saveDraft(editKey, "style", draft); setOpen(false); }}
            >
              Enregistrer (brouillon)
            </Button>
            <Button
              variant="ghost" className="w-full"
              onClick={async () => { await saveDraft(editKey, "style", DEFAULTS); setDraft(DEFAULTS); }}
            >
              Réinitialiser
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs flex-1">{label}</Label>
      <div className="w-32">{children}</div>
    </div>
  );
}

function SelectPicker({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ToggleRow({ label, v, onChange }: { label: string; v: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}
