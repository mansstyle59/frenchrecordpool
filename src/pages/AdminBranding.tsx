import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, RotateCcw, Upload, Palette, Type, Image as ImageIcon, Layout, Eye,
  Loader2, Sun, Moon, Monitor, Tablet, Smartphone, Sparkles, Check, Copy,
  Trash2, ExternalLink, Wand2, ShieldCheck, AlertTriangle, Shuffle, Columns2,
  Home as HomeIcon, Music, CreditCard, LogIn,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding, applyBrandingToDom, type Branding } from "@/contexts/BrandingContext";
import { hexToHsl, hslToHex } from "@/lib/colorUtils";
import { harmonize, deriveDark, HARMONY_LABELS, type Harmony } from "@/lib/paletteGenerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/* ----------------------------- DATA ----------------------------- */
const FONTS = [
  "Space Grotesk", "DM Sans", "Inter", "Poppins", "Roboto", "Montserrat",
  "Playfair Display", "Bebas Neue", "Oswald", "Raleway", "Outfit", "Manrope",
  "Sora", "Syne", "Archivo", "Urbanist", "Lora", "Cormorant", "Work Sans", "JetBrains Mono",
];

const FONT_PAIRS: Array<{ label: string; display: string; body: string; vibe: string }> = [
  { label: "Tech moderne", display: "Space Grotesk", body: "DM Sans", vibe: "Net, technologique" },
  { label: "Éditorial", display: "Playfair Display", body: "Inter", vibe: "Élégant, magazine" },
  { label: "Brutaliste", display: "Bebas Neue", body: "Work Sans", vibe: "Impact, sport" },
  { label: "Boutique", display: "Cormorant", body: "Manrope", vibe: "Luxe, raffiné" },
  { label: "Indie", display: "Syne", body: "DM Sans", vibe: "Créatif, jeune" },
  { label: "Studio", display: "Sora", body: "Outfit", vibe: "Doux, pro" },
];

const RADII = [
  { v: "0rem", label: "Carré" },
  { v: "0.25rem", label: "Léger" },
  { v: "0.5rem", label: "Standard" },
  { v: "0.75rem", label: "Doux" },
  { v: "1rem", label: "Arrondi" },
  { v: "1.5rem", label: "Très arrondi" },
];

type Preset = { name: string; tag: string; swatch: string[]; patch: Partial<Branding> };

const PRESETS: Preset[] = [
  {
    name: "French Pool", tag: "Signature",
    swatch: ["#1f4ed8", "#dc2626", "#0f1729", "#fafafa"],
    patch: {
      light_primary: "220 75% 45%", light_accent: "0 72% 51%",
      dark_primary: "220 80% 58%", dark_accent: "0 72% 55%",
      light_background: "0 0% 98%", dark_background: "222 30% 8%",
      light_foreground: "222 47% 11%", dark_foreground: "210 20% 95%",
    },
  },
  {
    name: "Midnight Indigo", tag: "Tech sombre",
    swatch: ["#4f46e5", "#1e1e5a", "#0a0a1a", "#fafbfc"],
    patch: {
      light_primary: "239 84% 60%", light_accent: "265 84% 65%",
      dark_primary: "239 84% 67%", dark_accent: "265 84% 70%",
      light_background: "0 0% 99%", dark_background: "240 33% 7%",
    },
  },
  {
    name: "Noir & Or", tag: "Luxe",
    swatch: ["#c9a84c", "#f0d78c", "#0d0d0d", "#fafafa"],
    patch: {
      light_primary: "42 65% 45%", light_accent: "42 80% 70%",
      dark_primary: "42 80% 60%", dark_accent: "42 90% 75%",
      light_background: "40 20% 96%", dark_background: "0 0% 5%",
    },
  },
  {
    name: "Néon Mint", tag: "Énergie",
    swatch: ["#2dd4a8", "#73ffb8", "#0d1b2a", "#f5f7f5"],
    patch: {
      light_primary: "165 80% 35%", light_accent: "150 100% 45%",
      dark_primary: "165 80% 50%", dark_accent: "150 100% 55%",
      light_background: "0 0% 99%", dark_background: "210 50% 8%",
    },
  },
  {
    name: "Coral Sunset", tag: "Vibrant",
    swatch: ["#ff6b35", "#e84393", "#1a0a14", "#fff5f0"],
    patch: {
      light_primary: "12 85% 55%", light_accent: "330 75% 55%",
      dark_primary: "12 85% 60%", dark_accent: "330 80% 65%",
      light_background: "30 30% 97%", dark_background: "340 30% 8%",
    },
  },
  {
    name: "Ocean Deep", tag: "Confiance",
    swatch: ["#2d8a9e", "#5cbdb9", "#0c2340", "#eef6fa"],
    patch: {
      light_primary: "192 56% 40%", light_accent: "178 38% 55%",
      dark_primary: "192 56% 55%", dark_accent: "178 45% 65%",
      light_background: "200 30% 98%", dark_background: "215 50% 12%",
    },
  },
  {
    name: "Forêt", tag: "Naturel",
    swatch: ["#2d5a3d", "#a0c49d", "#0d1f15", "#f4f7f3"],
    patch: {
      light_primary: "145 35% 28%", light_accent: "115 30% 70%",
      dark_primary: "145 35% 50%", dark_accent: "115 30% 60%",
      light_background: "90 15% 97%", dark_background: "140 30% 8%",
    },
  },
  {
    name: "Brutalist Pop", tag: "Audacieux",
    swatch: ["#ff5722", "#ffeb3b", "#000000", "#ffffff"],
    patch: {
      light_primary: "14 100% 56%", light_accent: "54 100% 62%",
      dark_primary: "14 100% 60%", dark_accent: "54 100% 65%",
      light_background: "0 0% 100%", dark_background: "0 0% 5%",
    },
  },
];

const TOPBAR_HEIGHT = 56;

/* --------------------------- HELPERS --------------------------- */
function loadGoogleFont(family: string) {
  if (!family || typeof document === "undefined") return;
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function hslLuminance(hsl: string): number {
  // Approx luminance from "H S% L%"
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return 0;
  const l = parseFloat(m[3]) / 100;
  return l;
}

function contrastRatio(a: string, b: string) {
  const L1 = hslLuminance(a) + 0.05;
  const L2 = hslLuminance(b) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

/* --------------------------- PAGE --------------------------- */
export default function AdminBranding() {
  const { user } = useAuth();
  const { branding, applyPreview, refresh } = useBranding();
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFav, setUploadingFav] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewPage, setPreviewPage] = useState<PreviewPage>("home");
  const [compareModes, setCompareModes] = useState(false);
  const [genHarmony, setGenHarmony] = useState<Harmony>("complementary");
  const [genDeriveDark, setGenDeriveDark] = useState(true);
  const initialRef = useRef<Branding | null>(null);

  useEffect(() => {
    if (branding && !draft) {
      setDraft(branding);
      initialRef.current = branding;
    }
  }, [branding, draft]);

  // Preload preset fonts so the preview reacts instantly
  useEffect(() => {
    FONT_PAIRS.forEach((p) => {
      loadGoogleFont(p.display);
      loadGoogleFont(p.body);
    });
  }, []);

  const dirty = useMemo(() => {
    if (!initialRef.current || !draft) return false;
    return JSON.stringify(initialRef.current) !== JSON.stringify(draft);
  }, [draft]);

  const update = (patch: Partial<Branding>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    applyPreview(next);
  };

  const applyPreset = (p: Preset) => {
    update(p.patch);
    toast({ title: `Palette « ${p.name} » appliquée`, description: "Visible en direct dans l'aperçu →" });
  };

  const reset = () => {
    if (!initialRef.current) return;
    setDraft(initialRef.current);
    applyBrandingToDom(initialRef.current);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { id, ...payload } = draft;
    const { error } = await supabase
      .from("site_branding")
      .update({ ...payload, updated_by: user?.id })
      .eq("id", "global");
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer.", variant: "destructive" });
      return;
    }
    initialRef.current = draft;
    toast({ title: "Branding publié ✨", description: "Les changements sont en ligne." });
    await refresh();
  };

  const uploadAsset = async (file: File, field: "logo_url" | "favicon_url") => {
    const setU = field === "logo_url" ? setUploadingLogo : setUploadingFav;
    setU(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `branding/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setU(false);
      return;
    }
    const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
    update({ [field]: data.publicUrl } as any);
    setU(false);
  };

  const copyTokensCss = () => {
    if (!draft) return;
    const css = `:root{
  --primary:${draft.light_primary};
  --accent:${draft.light_accent};
  --background:${draft.light_background};
  --foreground:${draft.light_foreground};
  --radius:${draft.radius};
}
.dark{
  --primary:${draft.dark_primary};
  --accent:${draft.dark_accent};
  --background:${draft.dark_background};
  --foreground:${draft.dark_foreground};
}`;
    navigator.clipboard.writeText(css);
    toast({ title: "Tokens CSS copiés" });
  };

  if (!draft) return null;

  return (
    <AdminLayout
      wide
      title="Branding Studio"
      subtitle="Identité visuelle, palette, typographie, contenu — modifiez tout en direct."
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Basculer thème">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyTokensCss} title="Copier tokens CSS">
            <Copy className="h-4 w-4" />
          </Button>
          <Link to="/" target="_blank" rel="noopener">
            <Button variant="ghost" size="sm" title="Ouvrir le site">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </>
      }
    >
      <div className="grid lg:grid-cols-[440px_1fr] gap-6 pb-32">
        {/* ===================== EDITOR ===================== */}
        <div className="space-y-6">
          {/* PRESETS GALLERY */}
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Palettes signature
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-border text-[10px] text-muted-foreground">
                {PRESETS.length} thèmes
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((p) => {
                const active = draft.light_primary === p.patch.light_primary;
                return (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className={cn(
                      "group relative text-left rounded-lg p-3 transition-all overflow-hidden",
                      active
                        ? "bg-white/5 border-2 border-primary ring-4 ring-primary/10"
                        : "bg-white/5 border border-border hover:border-primary/40 hover:bg-white/10"
                    )}
                  >
                    <div className="flex h-10 w-full rounded-md overflow-hidden mb-3 ring-1 ring-black/10">
                      {p.swatch.map((c, i) => (
                        <div key={i} style={{ background: c }} className="flex-1" />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.tag}</p>
                      </div>
                      {active && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* TABS */}
          <Tabs defaultValue="identity" className="rounded-xl border border-border bg-white/5 backdrop-blur-md overflow-hidden shadow-sm">
            <TabsList className="grid grid-cols-4 w-full bg-black/20 dark:bg-black/30 rounded-none h-auto p-0 border-b border-border">
              {[
                { v: "identity", icon: ImageIcon, label: "Identité" },
                { v: "colors", icon: Palette, label: "Couleurs" },
                { v: "typo", icon: Type, label: "Typo" },
                { v: "content", icon: Layout, label: "Contenu" },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="py-3 text-xs font-medium text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center justify-center gap-1.5 transition-colors"
                >
                  <t.icon className="h-3.5 w-3.5" />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ---------- Identity ---------- */}
            <TabsContent value="identity" className="space-y-5 p-5 m-0">
              <Field label="Nom du site">
                <Input value={draft.site_name} onChange={(e) => update({ site_name: e.target.value })} className="bg-black/20 dark:bg-black/40 border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary" />
              </Field>
              <Field label="Slogan" hint={`${(draft.tagline ?? "").length}/80`}>
                <Input value={draft.tagline ?? ""} maxLength={80} onChange={(e) => update({ tagline: e.target.value })} className="bg-black/20 dark:bg-black/40 border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary" />
              </Field>

              <AssetDropzone
                label="Logo"
                url={draft.logo_url}
                onPick={(f) => uploadAsset(f, "logo_url")}
                onUrl={(v) => update({ logo_url: v })}
                onClear={() => update({ logo_url: null })}
                loading={uploadingLogo}
                shape="rect"
              />
              <AssetDropzone
                label="Favicon"
                url={draft.favicon_url}
                onPick={(f) => uploadAsset(f, "favicon_url")}
                onUrl={(v) => update({ favicon_url: v })}
                onClear={() => update({ favicon_url: null })}
                loading={uploadingFav}
                shape="square"
              />

              <Field label="Coins arrondis">
                <Select value={draft.radius} onValueChange={(v) => update({ radius: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{RADII.map((r) => <SelectItem key={r.v} value={r.v}>{r.label} <span className="text-muted-foreground">({r.v})</span></SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-2 mt-2">
                  {RADII.map((r) => (
                    <button
                      key={r.v}
                      onClick={() => update({ radius: r.v })}
                      className={cn(
                        "h-9 flex-1 bg-secondary border transition-all",
                        draft.radius === r.v ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                      )}
                      style={{ borderRadius: r.v }}
                      aria-label={r.label}
                    />
                  ))}
                </div>
              </Field>
            </TabsContent>

            {/* ---------- Colors ---------- */}
            <TabsContent value="colors" className="space-y-5 p-5 m-0">
              <ColorMode
                title="Mode clair" icon={<Sun className="h-3 w-3" />}
                draft={draft} update={update} mode="light"
              />
              <ColorMode
                title="Mode sombre" icon={<Moon className="h-3 w-3" />}
                draft={draft} update={update} mode="dark"
              />
              <button
                onClick={copyTokensCss}
                className="w-full text-xs h-9 rounded-md border border-border hover:border-primary/40 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-3 w-3" /> Copier les tokens CSS
              </button>
            </TabsContent>

            {/* ---------- Typo ---------- */}
            <TabsContent value="typo" className="space-y-4 p-5 m-0">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Couples typographiques</Label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_PAIRS.map((p) => {
                    const active = draft.font_display === p.display && draft.font_body === p.body;
                    return (
                      <button
                        key={p.label}
                        onClick={() => update({ font_display: p.display, font_body: p.body })}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-all bg-white/5",
                          active ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/40 hover:bg-white/10"
                        )}
                      >
                        <div style={{ fontFamily: `"${p.display}"` }} className="text-xl font-bold leading-tight text-foreground">{p.display}</div>
                        <div style={{ fontFamily: `"${p.body}"` }} className="text-[11px] text-muted-foreground mt-0.5">{p.body} · {p.vibe}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Police des titres">
                <Select value={draft.font_display} onValueChange={(v) => update({ font_display: v })}>
                  <SelectTrigger className="bg-black/20 dark:bg-black/40 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <div className="mt-2 p-3 rounded-md bg-white/5 border border-border">
                  <p style={{ fontFamily: `"${draft.font_display}"` }} className="text-3xl font-bold leading-tight">{draft.site_name}</p>
                </div>
              </Field>
              <Field label="Police du texte">
                <Select value={draft.font_body} onValueChange={(v) => update({ font_body: v })}>
                  <SelectTrigger className="bg-black/20 dark:bg-black/40 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <div className="mt-2 p-3 rounded-md bg-white/5 border border-border">
                  <p style={{ fontFamily: `"${draft.font_body}"` }} className="text-sm">
                    The quick brown fox jumps over the lazy dog. — Le DJ mixe ses tracks tard dans la nuit. 1234567890
                  </p>
                </div>
              </Field>
            </TabsContent>

            {/* ---------- Content ---------- */}
            <TabsContent value="content" className="space-y-4 p-5 m-0">
              <Field label="Titre du Hero" hint={`${(draft.hero_title ?? "").length}/60`}>
                <Input maxLength={60} value={draft.hero_title ?? ""} onChange={(e) => update({ hero_title: e.target.value })} className="bg-black/20 dark:bg-black/40 border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary" />
              </Field>
              <Field label="Sous-titre du Hero" hint={`${(draft.hero_subtitle ?? "").length}/160`}>
                <Textarea maxLength={160} value={draft.hero_subtitle ?? ""} onChange={(e) => update({ hero_subtitle: e.target.value })} className="bg-black/20 dark:bg-black/40 border-border min-h-[80px] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary" />
              </Field>
              <Field label="Texte du footer">
                <Input value={draft.footer_text ?? ""} onChange={(e) => update({ footer_text: e.target.value })} className="bg-black/20 dark:bg-black/40 border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary" />
              </Field>
            </TabsContent>
          </Tabs>
        </div>

        {/* ===================== PREVIEW ===================== */}
        <div className="space-y-4">
          {/* Device toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-4 w-4 text-emerald-400" /> Aperçu en direct
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-border rounded-md p-1">
              {([
                { v: "desktop", icon: Monitor, label: "Desktop" },
                { v: "tablet", icon: Tablet, label: "Tablet" },
                { v: "mobile", icon: Smartphone, label: "Mobile" },
              ] as const).map((d) => (
                <button
                  key={d.v}
                  onClick={() => setDevice(d.v)}
                  className={cn(
                    "h-6 w-7 rounded flex items-center justify-center transition-all",
                    device === d.v ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={d.label}
                >
                  <d.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <motion.div
            layout
            className="mx-auto rounded-3xl border border-border bg-card overflow-hidden shadow-2xl"
            style={{
              width: device === "desktop" ? "100%" : device === "tablet" ? 768 : 390,
              maxWidth: "100%",
              transition: "width 0.4s cubic-bezier(.2,.7,.2,1)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 h-9 bg-secondary/60 border-b border-border">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              </div>
              <div className="flex-1 mx-3 h-5 rounded bg-background/70 border border-border flex items-center px-2 text-[10px] text-muted-foreground truncate">
                frenchrecordpool.com /
              </div>
            </div>

            <SitePreview draft={draft} device={device} />
          </motion.div>

          <ContrastReport draft={draft} />
        </div>
      </div>

      {/* ===================== STICKY SAVE BAR ===================== */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Modifications non publiées</span>
              <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
                <RotateCcw className="h-3 w-3 mr-1" /> Annuler
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              >
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Publier
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

/* --------------------------- SUBCOMPONENTS --------------------------- */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</Label>
        {hint && <span className="text-[10px] font-normal text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AssetDropzone({
  label, url, onPick, onUrl, onClear, loading, shape,
}: {
  label: string; url: string | null;
  onPick: (f: File) => void; onUrl: (v: string) => void; onClear: () => void;
  loading: boolean; shape: "rect" | "square";
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onPick(f);
        }}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-3 transition-all flex items-center gap-3",
          drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-secondary/30"
        )}
      >
        <div
          className={cn(
            "shrink-0 bg-background/70 border border-border flex items-center justify-center overflow-hidden",
            shape === "square" ? "h-12 w-12 rounded-md" : "h-12 w-20 rounded-md"
          )}
        >
          {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <Input
            value={url ?? ""} placeholder="URL ou glisser-déposer"
            onChange={(e) => onUrl(e.target.value)}
            className="h-7 text-xs bg-background border-border"
          />
          <div className="flex items-center gap-1">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
              <span className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Téléverser
              </span>
            </label>
            {url && (
              <button onClick={onClear} className="text-[10px] text-destructive hover:underline ml-2 inline-flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Retirer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorMode({
  title, icon, draft, update, mode,
}: {
  title: string; icon: React.ReactNode; draft: Branding;
  update: (p: Partial<Branding>) => void; mode: "light" | "dark";
}) {
  const fields: Array<{ key: keyof Branding; label: string }> = [
    { key: `${mode}_primary` as keyof Branding, label: "Primaire" },
    { key: `${mode}_accent` as keyof Branding, label: "Accent" },
    { key: `${mode}_background` as keyof Branding, label: "Fond" },
    { key: `${mode}_foreground` as keyof Branding, label: "Texte" },
    { key: `${mode}_card` as keyof Branding, label: "Cartes" },
    { key: `${mode}_muted` as keyof Branding, label: "Discret" },
    { key: `${mode}_border` as keyof Branding, label: "Bordures" },
  ];
  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
        {icon} {title}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <ColorChip key={String(f.key)} label={f.label} value={String(draft[f.key])} onChange={(v) => update({ [f.key]: v } as any)} />
        ))}
      </div>
    </div>
  );
}

function ColorChip({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = hslToHex(value);
  return (
    <label className="group relative flex items-center gap-2 rounded-lg border border-border bg-secondary/40 hover:bg-secondary/70 p-2 transition-colors cursor-pointer">
      <input
        type="color" value={hex}
        onChange={(e) => onChange(hexToHsl(e.target.value))}
        className="h-8 w-8 rounded-md border border-border cursor-pointer bg-transparent shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-[11px] font-mono truncate">{hex}</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(hex); toast({ title: "Copié", description: hex }); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background"
        title="Copier"
      >
        <Copy className="h-3 w-3" />
      </button>
    </label>
  );
}

function ContrastReport({ draft }: { draft: Branding }) {
  const checks = [
    { label: "Texte sur fond (clair)", a: draft.light_foreground, b: draft.light_background },
    { label: "Texte sur fond (sombre)", a: draft.dark_foreground, b: draft.dark_background },
    { label: "Primaire sur fond (clair)", a: draft.light_primary, b: draft.light_background },
    { label: "Primaire sur fond (sombre)", a: draft.dark_primary, b: draft.dark_background },
  ];
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-amber-400" /> Lisibilité (estimation WCAG)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {checks.map((c) => {
          const ratio = contrastRatio(c.a, c.b);
          const pass = ratio >= 3.5;
          return (
            <div key={c.label} className="p-3 bg-white/5 border border-border rounded-lg flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground truncate pr-2">{c.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    pass ? "bg-emerald-500 shadow-[0_0_8px_hsl(160_70%_45%/0.7)]" : "bg-amber-500 shadow-[0_0_8px_hsl(38_92%_50%/0.7)]"
                  )}
                />
                <span className={cn("text-xs font-bold font-mono", pass ? "text-emerald-400" : "text-amber-400")}>
                  {ratio.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SitePreview({ draft, device }: { draft: Branding; device: "desktop" | "tablet" | "mobile" }) {
  const compact = device === "mobile";
  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {draft.logo_url
            ? <img src={draft.logo_url} alt="" className="h-8 w-8 rounded-md object-contain" />
            : <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent" />}
          <span style={{ fontFamily: `"${draft.font_display}"` }} className="font-bold text-base">{draft.site_name}</span>
        </div>
        {!compact && (
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Tracks</span><span>Remixers</span><span>Genres</span><span>Top</span>
          </nav>
        )}
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs">Connexion</Button>
      </div>

      {/* Hero */}
      <div
        className="rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(${draft.light_primary}), hsl(${draft.light_accent}))`,
        }}
      >
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }} />
        <div className="relative">
          <span style={{ fontFamily: `"${draft.font_body}"` }} className="inline-block text-[10px] uppercase tracking-widest text-white/80 mb-2">
            {draft.tagline}
          </span>
          <h2 style={{ fontFamily: `"${draft.font_display}"` }} className={cn("font-bold text-white leading-tight mb-3", compact ? "text-2xl" : "text-4xl")}>
            {draft.hero_title}
          </h2>
          <p style={{ fontFamily: `"${draft.font_body}"` }} className="text-white/90 text-sm max-w-md mx-auto mb-4">
            {draft.hero_subtitle}
          </p>
          <div className="flex gap-2 justify-center">
            <button className="px-4 h-9 rounded-md bg-white text-sm font-semibold" style={{ color: `hsl(${draft.light_primary})`, borderRadius: draft.radius }}>
              Découvrir
            </button>
            <button className="px-4 h-9 rounded-md border border-white/40 text-white text-sm" style={{ borderRadius: draft.radius }}>
              En savoir +
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-3")}>
        {[
          { l: "Tracks", v: "1 247", c: "light_primary" },
          { l: "Remixers", v: "328", c: "light_accent" },
          { l: "DJs", v: "5 612", c: "light_foreground" },
        ].slice(0, compact ? 2 : 3).map((s) => (
          <div key={s.l} className="rounded-xl p-4 border border-border bg-secondary/40" style={{ borderRadius: draft.radius }}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</p>
            <p style={{ fontFamily: `"${draft.font_display}"`, color: `hsl(${(draft as any)[s.c]})` }} className="text-2xl font-bold mt-0.5">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Track card row */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3 flex items-center gap-3" style={{ borderRadius: draft.radius }}>
        <div className="h-12 w-12 rounded-md shrink-0" style={{
          background: `linear-gradient(135deg, hsl(${draft.light_primary}), hsl(${draft.light_accent}))`,
          borderRadius: draft.radius,
        }} />
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: `"${draft.font_display}"` }} className="text-sm font-semibold truncate">Midnight Drive</p>
          <p style={{ fontFamily: `"${draft.font_body}"` }} className="text-[11px] text-muted-foreground truncate">DJ Lumière · House · 124 BPM</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/10">NEW</span>
      </div>

      {/* Footer */}
      <p style={{ fontFamily: `"${draft.font_body}"` }} className="text-center text-[11px] text-muted-foreground pt-2 border-t border-border">
        {draft.footer_text}
      </p>
    </div>
  );
}
