// Client-side slugify mirroring the SQL public.slugify function.
export function slugify(input: string): string {
  if (!input) return "";
  const map: Record<string, string> = {
    à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a",
    ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", ø: "o",
    è: "e", é: "e", ê: "e", ë: "e",
    ç: "c", ì: "i", í: "i", î: "i", ï: "i",
    ù: "u", ú: "u", û: "u", ü: "u",
    ÿ: "y", ñ: "n",
  };
  const lowered = input
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
  return lowered.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
