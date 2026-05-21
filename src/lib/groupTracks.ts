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

// Normalise l'artiste principal pour regrouper les variantes.
// Gère: feat./ft./featuring/with, &, +, /, ,, vs/x, "and",
//       "Artist & Remixers", contenu entre () ou [] (ex: "(prod. by X)"),
//       préfixes/suffixes courants (DJ, MC, The), accents et apostrophes.
export function normalizeArtistKey(artist: string): string {
  if (!artist) return "";
  let s = artist
    .toLowerCase()
    // Retire diacritiques
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // Retire contenu entre () ou [] (prod. by, remix credits, etc.)
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    // Normalise les apostrophes/quotes
    .replace(/[’'`]/g, "")
    // Remplace séparateurs courants par un délimiteur unique
    .replace(/\s*(?:feat\.?|ft\.?|featuring|with|presents|pres\.?|vs\.?|versus|and)\s+/gi, "|")
    .replace(/\s*[&,\/+]\s*/g, "|")
    .replace(/\s+x\s+/gi, "|");

  // Garde le premier artiste
  let main = s.split("|")[0] || "";

  // Retire préfixes parasites (dj, mc, the)
  main = main.replace(/^\s*(dj|mc|the)\s+/i, "");
  // Suffixes "remix(ers)/edit(s)/crew" résiduels
  main = main.replace(/\s+(remixers?|editors?|crew|team)$/i, "");

  return main.replace(/[^a-z0-9]+/g, " ").trim();
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
