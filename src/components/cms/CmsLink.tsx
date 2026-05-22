import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useCms, useCmsValue } from "@/contexts/CmsContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UrlPicker from "@/components/cms/UrlPicker";

interface Props {
  editKey: string;
  defaultLabel: string;
  defaultUrl: string;
  className?: string;
  children?: ReactNode;
}

interface LinkValue { label: string; url: string }

export default function CmsLink({ editKey, defaultLabel, defaultUrl, className, children }: Props) {
  const value = useCmsValue<LinkValue>(editKey, { label: defaultLabel, url: defaultUrl });
  const { editMode, saveDraft } = useCms();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LinkValue>(value);

  const isExternal = /^https?:\/\//.test(value.url);
  const Inner = (
    <span className={className}>{children ?? value.label}</span>
  );

  if (!editMode) {
    return isExternal
      ? <a href={value.url} target="_blank" rel="noreferrer noopener">{Inner}</a>
      : <Link to={value.url || "/"}>{Inner}</Link>;
  }

  return (
    <span className="relative inline-block group/cms align-baseline">
      {isExternal
        ? <a href={value.url} className={className} onClick={(e) => e.preventDefault()}>{value.label}</a>
        : <Link to={value.url || "/"} className={className} onClick={(e) => e.preventDefault()}>{value.label}</Link>
      }
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "absolute -top-2 -right-2 z-10 hidden group-hover/cms:flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md"
            )}
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
          <Button
            size="sm"
            className="w-full"
            disabled={!draft.label || (draft.label === value.label && draft.url === value.url)}
            onClick={async () => { await saveDraft(editKey, "link", draft); setOpen(false); }}
          >
            Enregistrer (brouillon)
          </Button>
        </PopoverContent>
      </Popover>
    </span>
  );
}
