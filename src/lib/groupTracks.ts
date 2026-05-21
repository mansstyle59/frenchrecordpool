import type { DbTrack } from "@/hooks/useTracks";

// Normalise un titre pour regrouper les variantes d'un même morceau.
// Retire les parenthèses/crochets (remix, edit…), feat./ft., et la ponctuation.
export function normalizeTitleKey(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ") // contenu entre () ou []
    .replace(/\b(feat\.?|ft\.?|featuring|with|vs\.?|x)\b.*$/i, " ") // featurings résiduels
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Normalise l'artiste principal (avant feat./&/,)
export function normalizeArtistKey(artist: string): string {
  return (artist || "")
    .toLowerCase()
    .split(/\s*(?:feat\.?|ft\.?|featuring|&|,|vs\.?|x)\s+/i)[0]
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface TrackGroup {
  key: string;
  primary: DbTrack;
  variants: DbTrack[]; // toutes les versions (primary inclus), triées
}

export function groupTracks(tracks: DbTrack[]): TrackGroup[] {
  const map = new Map<string, DbTrack[]>();
  for (const t of tracks) {
    const k = `${normalizeArtistKey(t.artist)}::${normalizeTitleKey(t.title)}`;
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(t);
    map.set(k, arr);
  }
  const groups: TrackGroup[] = [];
  for (const [key, list] of map.entries()) {
    // Tri interne : "Original" en premier, puis par téléchargements puis date
    const sorted = [...list].sort((a, b) => {
      const ao = (a.version || "").toLowerCase() === "original" ? 0 : 1;
      const bo = (b.version || "").toLowerCase() === "original" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const dl = (b.downloads ?? 0) - (a.downloads ?? 0);
      if (dl !== 0) return dl;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    groups.push({ key, primary: sorted[0], variants: sorted });
  }
  return groups;
}
