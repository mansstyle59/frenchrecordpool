import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_NAV } from "./adminNav";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground hidden md:inline-flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Rechercher…</span>
        <kbd className="ml-2 hidden lg:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="md:hidden"
        aria-label="Rechercher"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Aller à une section, rechercher…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          {ADMIN_NAV.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.to}
                    value={`${item.label} ${item.desc ?? ""} ${item.keywords ?? ""}`}
                    onSelect={() => go(item.to)}
                  >
                    <item.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.desc && (
                      <span className="ml-auto text-xs text-muted-foreground truncate max-w-[180px]">
                        {item.desc}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Site public">
            <CommandItem value="retour site accueil" onSelect={() => go("/")}>
              <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
              Retour au site
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
