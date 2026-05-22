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
// Gère :
//  - separators: feat./ft./featuring/with/pres./vs/x/b2b/starring/introducing/and
//  - ponctuation: & , / + ; · • | — – -  (em/en-dash, bullet, etc.)
//  - parenthèses/crochets: "(prod. by X)", "[Remix]"
//  - suffixes collectifs: "Artist & Remixers/Editors/Crew/Team/Friends/Family/Allstars/Collective"
//  - préfixes parasites: "DJ", "MC", "The", "Le/La/Les" (FR), "El/Los/Las" (ES)
//  - accents, apostrophes (' ’ ` ´), tirets multiples, espaces multiples
//  - cas spéciaux: "Various Artists" / "VA" → "various artists" (groupé)
export function normalizeArtistKey(artist: string): string {
  if (!artist) return "";
  let s = artist
    .toLowerCase()
    // Diacritiques
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // Contenu entre () ou []
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    // Apostrophes / quotes
    .replace(/[’'`´]/g, "")
    // Tirets longs/courts/bullets → délimiteur
    .replace(/\s*[—–•·]\s*/g, "|")
    // Mots-clés de collaboration → délimiteur
    .replace(
      /\s*(?:feat\.?|ft\.?|featuring|featured|with|w\/|presents?|pres\.?|vs\.?|versus|and|starring|introducing|b2b)\s+/gi,
      "|"
    )
    // Séparateurs ponctuels
    .replace(/\s*[&,\/+;]\s*/g, "|")
    // " x " comme séparateur (entouré d'espaces)
    .replace(/\s+x\s+/gi, "|")
    // " - " comme séparateur (tiret entouré d'espaces uniquement)
    .replace(/\s+-\s+/g, "|");

  // Cas spécial: Various Artists / VA
  const compact = s.replace(/\s+/g, " ").trim();
  if (/^(various artists|v\.?\s*a\.?)$/.test(compact)) return "various artists";

  // Premier artiste
  let main = (s.split("|")[0] || "").trim();

  // Préfixes parasites (DJ, MC, articles courants)
  main = main.replace(/^\s*(?:dj|mc|mc\.?|the|le|la|les|el|los|las)\s+/i, "");

  // Suffixes collectifs résiduels
  main = main.replace(
    /\s+(?:remixers?|editors?|crew|team|family|friends|allstars|all-?stars|collective|crew|gang|squad|sound(?:system)?|productions?)$/i,
    ""
  );

  return main.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
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
