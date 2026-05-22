import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Link as LinkIcon, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { INTERNAL_ROUTES } from "@/lib/internalRoutes";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function UrlPicker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const isExternal = /^https?:\/\//.test(value);

  const groups = useMemo(() => {
    const g: Record<string, typeof INTERNAL_ROUTES> = {};
    for (const r of INTERNAL_ROUTES) (g[r.group] ||= []).push(r);
    return g;
  }, []);

  const current = INTERNAL_ROUTES.find((r) => r.path === value);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "/route ou https://…"}
          className="flex-1"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Choisir une page interne">
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder="Rechercher une page…" />
              <CommandList>
                <CommandEmpty>Aucune page trouvée.</CommandEmpty>
                {Object.entries(groups).map(([group, routes]) => (
                  <CommandGroup key={group} heading={group}>
                    {routes.map((r) => (
                      <CommandItem
                        key={r.path}
                        value={`${r.label} ${r.path}`}
                        onSelect={() => { onChange(r.path); setOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === r.path ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1">{r.label}</span>
                        <span className="text-[10px] text-muted-foreground">{r.path}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        {isExternal ? <Globe className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
        {value
          ? (isExternal ? "Lien externe (nouvel onglet)" : current ? `Page interne — ${current.label}` : "Route interne")
          : "Aucune destination"}
      </p>
    </div>
  );
}
