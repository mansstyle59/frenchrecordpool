import { useState } from "react";
import { Pencil } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  editKey: string;
  defaultColor: string; // hex
  className?: string;
  children: (color: string) => React.ReactNode;
}

export default function CmsColor({ editKey, defaultColor, className, children }: Props) {
  const value = useCmsValue<string>(editKey, defaultColor);
  const { editMode, saveDraft } = useCms();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editMode) return <>{children(value)}</>;

  return (
    <span className={`relative inline-block group/cms ${className ?? ""}`}>
      {children(value)}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute -top-2 -right-2 z-10 hidden group-hover/cms:flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="end">
          <div>
            <Label className="text-xs">Couleur</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-10 w-10 rounded border border-border cursor-pointer"
              />
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono" />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={draft === value}
            onClick={async () => { await saveDraft(editKey, "color", draft); setOpen(false); }}
          >
            Enregistrer (brouillon)
          </Button>
        </PopoverContent>
      </Popover>
    </span>
  );
}
