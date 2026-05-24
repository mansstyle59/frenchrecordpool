import { useEffect, useRef, useState } from "react";
import { X, ChevronDown, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRoles, roleLabel } from "@/lib/artistRoles";

interface RemixerOption {
  id: string;
  name: string;
  roles: string[];
}

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/**
 * Autocomplete picker for remixers.
 * - Lists existing remixers (artists where kind='remixer' or 'both')
 * - Allows free-text addition of new names (will be created on submit)
 */
export default function RemixerPicker({ value, onChange, placeholder }: Props) {
  const [options, setOptions] = useState<RemixerOption[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("artists")
      .select("id, name, roles")
      .contains("roles", ["remixer"])
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setOptions(data as RemixerOption[]);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const lowerSet = new Set(value.map((v) => v.toLowerCase()));
  const q = draft.trim().toLowerCase();
  const suggestions = options
    .filter((o) => !lowerSet.has(o.name.toLowerCase()))
    .filter((o) => (q ? o.name.toLowerCase().includes(q) : true))
    .slice(0, 8);

  const add = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (lowerSet.has(n.toLowerCase())) return;
    onChange([...value, n]);
    setDraft("");
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const exactExists = options.some((o) => o.name.toLowerCase() === q);

  return (
    <div ref={boxRef} className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[44px] rounded-md border border-border bg-secondary px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        {value.map((tag, i) => {
          const known = options.find((o) => o.name.toLowerCase() === tag.toLowerCase());
          return (
            <span
              key={`${tag}-${i}`}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                known
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-primary/10 text-primary border-primary/30"
              }`}
              title={known ? "Remixer existant" : "Nouveau remixer (sera créé)"}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="hover:text-destructive transition-colors"
                aria-label={`Retirer ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions[0]) add(suggestions[0].name);
              else add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              removeAt(value.length - 1);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={value.length === 0 ? (placeholder ?? "Rechercher ou ajouter un remixer…") : ""}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-0.5"
        />
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 left-0 right-0 rounded-md border border-border bg-popover shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40 flex items-center gap-1.5">
            <Search className="h-3 w-3" /> Remixers existants {q && `· "${draft}"`}
          </div>
          {suggestions.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              {q ? "Aucun remixer trouvé." : "Tape pour rechercher…"}
            </div>
          ) : (
            <ul>
              {suggestions.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => add(o.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/80 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{o.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      {normalizeRoles(o.roles).map((r) => roleLabel(r)).join(" + ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && !exactExists && !lowerSet.has(q) && (
            <button
              type="button"
              onClick={() => add(draft)}
              className="w-full text-left px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 border-t border-border flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter "{draft.trim()}" comme nouveau remixer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
