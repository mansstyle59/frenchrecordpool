import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import UrlPicker from "@/components/cms/UrlPicker";

type Variant = "default" | "secondary" | "outline" | "ghost" | "hero";

interface ButtonValue { label: string; url: string; variant: Variant }

interface Props {
  editKey: string;
  defaultLabel: string;
  defaultUrl: string;
  defaultVariant?: Variant;
  size?: ButtonProps["size"];
  className?: string;
}

const VARIANTS: Variant[] = ["default", "hero", "secondary", "outline", "ghost"];

export default function CmsButton({
  editKey, defaultLabel, defaultUrl, defaultVariant = "default", size, className,
}: Props) {
  const value = useCmsValue<ButtonValue>(editKey, {
    label: defaultLabel, url: defaultUrl, variant: defaultVariant,
  });
  const { editMode, saveDraft } = useCms();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ButtonValue>(value);

  const isExternal = /^https?:\/\//.test(value.url);

  const btn = (
    <Button variant={value.variant} size={size} className={className} asChild={!editMode}>
      {editMode
        ? <span>{value.label}</span>
        : (isExternal
            ? <a href={value.url} target="_blank" rel="noreferrer noopener">{value.label}</a>
            : <Link to={value.url || "/"}>{value.label}</Link>)
      }
    </Button>
  );

  if (!editMode) return btn;

  return (
    <span className="relative inline-block group/cms">
      {btn}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute -top-2 -right-2 z-10 hidden group-hover/cms:flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="end">
          <div>
            <Label className="text-xs">Libellé</Label>
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Destination</Label>
            <UrlPicker value={draft.url} onChange={(url) => setDraft({ ...draft, url })} />
          </div>
          <div>
            <Label className="text-xs">Style</Label>
            <Select value={draft.variant} onValueChange={(v) => setDraft({ ...draft, variant: v as Variant })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VARIANTS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!draft.label}
            onClick={async () => { await saveDraft(editKey, "button", draft); setOpen(false); }}
          >
            Enregistrer (brouillon)
          </Button>
        </PopoverContent>
      </Popover>
    </span>
  );
}
