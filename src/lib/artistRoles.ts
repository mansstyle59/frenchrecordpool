// Centralized labels, colors, ordering for artist roles.
// A role lives in artists.roles (text[]). Multiple roles per artist.

export type ArtistRole = "dj" | "remixer" | "producer" | "vocalist" | "band";

export const ALL_ROLES: ArtistRole[] = ["dj", "remixer", "producer", "vocalist", "band"];

const ROLE_META: Record<ArtistRole, { label: string; short: string; className: string }> = {
  dj:       { label: "DJ",        short: "DJ",  className: "bg-primary/15 text-primary border-primary/30" },
  remixer:  { label: "Remixer",   short: "RMX", className: "bg-accent/15 text-accent border-accent/30" },
  producer: { label: "Producer",  short: "PRD", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  vocalist: { label: "Vocalist",  short: "VOC", className: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
  band:     { label: "Group",     short: "GRP", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
};

export function roleLabel(role: string): string {
  return ROLE_META[role as ArtistRole]?.label ?? role;
}
export function roleClassName(role: string): string {
  return ROLE_META[role as ArtistRole]?.className ?? "bg-muted text-muted-foreground border-border";
}
export function normalizeRoles(input: unknown, legacyKind?: string | null): ArtistRole[] {
  let arr: string[] = [];
  if (Array.isArray(input)) arr = input.filter(Boolean) as string[];
  if (arr.length === 0 && legacyKind) {
    if (legacyKind === "both") arr = ["dj", "remixer"];
    else if (legacyKind === "remixer") arr = ["remixer"];
    else arr = ["dj"];
  }
  const seen = new Set<string>();
  return arr
    .map((r) => r.toLowerCase())
    .filter((r): r is ArtistRole => (ALL_ROLES as string[]).includes(r))
    .filter((r) => (seen.has(r) ? false : (seen.add(r), true)));
}
