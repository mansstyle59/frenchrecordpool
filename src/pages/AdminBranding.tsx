import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Save, RotateCcw, Upload, Palette, Type, Image as ImageIcon, Layout, Eye, Loader2, Sun, Moon } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding, applyBrandingToDom, type Branding } from "@/contexts/BrandingContext";
import { hexToHsl, hslToHex } from "@/lib/colorUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

const FONTS = [
  "Space Grotesk", "DM Sans", "Inter", "Poppins", "Roboto", "Montserrat",
  "Playfair Display", "Bebas Neue", "Oswald", "Raleway", "Outfit", "Manrope",
  "Sora", "Syne", "Archivo", "Urbanist", "Lora", "Cormorant", "Work Sans", "JetBrains Mono",
];

const RADII = [
  { v: "0rem", label: "Carré" },
  { v: "0.25rem", label: "Léger" },
  { v: "0.5rem", label: "Standard" },
  { v: "0.75rem", label: "Doux" },
  { v: "1rem", label: "Arrondi" },
  { v: "1.5rem", label: "Très arrondi" },
];

const PRESETS: Array<{ name: string; patch: Partial<Branding> }> = [
  {
    name: "French Pool (défaut)",
    patch: {
      light_primary: "220 75% 45%", light_accent: "0 72% 51%",
      dark_primary: "220 80% 58%", dark_accent: "0 72% 55%",
      light_background: "0 0% 98%", dark_background: "222 30% 8%",
    },
  },
  {
    name: "Néon Mint",
    patch: {
      light_primary: "165 80% 35%", light_accent: "150 100% 45%",
      dark_primary: "165 80% 50%", dark_accent: "150 100% 55%",
      light_background: "0 0% 99%", dark_background: "180 30% 6%",
    },
  },
  {
    name: "Or & Noir",
    patch: {
      light_primary: "42 65% 45%", light_accent: "42 80% 55%",
      dark_primary: "42 80% 60%", dark_accent: "42 90% 65%",
      light_background: "40 20% 96%", dark_background: "0 0% 5%",
    },
  },
  {
    name: "Coral Sunset",
    patch: {
      light_primary: "12 85% 55%", light_accent: "330 75% 55%",
      dark_primary: "12 85% 60%", dark_accent: "330 80% 65%",
      light_background: "30 30% 97%", dark_background: "340 30% 8%",
    },
  },
];

export default function AdminBranding() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { branding, applyPreview, refresh } = useBranding();
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (branding && !draft) setDraft(branding);
  }, [branding, draft]);

  const dirty = useMemo(() => {
    if (!branding || !draft) return false;
    return JSON.stringify(branding) !== JSON.stringify(draft);
  }, [branding, draft]);

  const update = (patch: Partial<Branding>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    applyPreview(next); // live preview
  };

  const applyPreset = (patch: Partial<Branding>) => update(patch);

  const reset = () => {
    if (!branding) return;
    setDraft(branding);
    applyBrandingToDom(branding);
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
    toast({ title: "Branding enregistré", description: "Les changements sont visibles partout." });
    await refresh();
  };

  const uploadLogo = async (file: File, field: "logo_url" | "favicon_url") => {
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `branding/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("track-covers").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }
    const { data } = supabase.storage.from("track-covers").getPublicUrl(path);
    update({ [field]: data.publicUrl } as any);
    setUploadingLogo(false);
  };

  if (loading || !draft) return null;

  const ColorRow = ({ label, field }: { label: string; field: keyof Branding }) => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={hslToHex(String(draft[field]))}
        onChange={(e) => update({ [field]: hexToHsl(e.target.value) } as any)}
        className="h-10 w-14 rounded-md border border-border cursor-pointer bg-transparent"
      />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          value={String(draft[field])}
          onChange={(e) => update({ [field]: e.target.value } as any)}
          className="h-7 text-xs font-mono bg-secondary border-border mt-0.5"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">Branding Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={reset} disabled={!dirty || saving}>
              <RotateCcw className="h-3 w-3 mr-1" /> Annuler
            </Button>
            <Button variant="hero" size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Publier
            </Button>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2">
              <ArrowLeft className="h-3 w-3" /> Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-6 grid lg:grid-cols-[400px_1fr] gap-6">
        {/* PANNEAU D'ÉDITION */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-display font-bold mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" /> Préréglages
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.patch)}
                  className="text-xs px-3 py-2 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="identity" className="bg-card border border-border rounded-xl p-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="identity" className="text-xs"><ImageIcon className="h-3 w-3 mr-1" />Identité</TabsTrigger>
              <TabsTrigger value="colors" className="text-xs"><Palette className="h-3 w-3 mr-1" />Couleurs</TabsTrigger>
              <TabsTrigger value="typo" className="text-xs"><Type className="h-3 w-3 mr-1" />Typo</TabsTrigger>
              <TabsTrigger value="content" className="text-xs"><Layout className="h-3 w-3 mr-1" />Contenu</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-3 mt-4">
              <div>
                <Label>Nom du site</Label>
                <Input value={draft.site_name} onChange={(e) => update({ site_name: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div>
                <Label>Slogan</Label>
                <Input value={draft.tagline ?? ""} onChange={(e) => update({ tagline: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="flex items-center justify-between">Logo
                  {draft.logo_url && <img src={draft.logo_url} alt="logo" className="h-6 w-6 rounded object-contain bg-white/10" />}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input value={draft.logo_url ?? ""} onChange={(e) => update({ logo_url: e.target.value })} placeholder="https://..." className="bg-secondary border-border" />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0], "logo_url")} />
                    <Button type="button" size="sm" variant="outline" disabled={uploadingLogo} asChild>
                      <span>{uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
                    </Button>
                  </label>
                </div>
              </div>
              <div>
                <Label>Favicon</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={draft.favicon_url ?? ""} onChange={(e) => update({ favicon_url: e.target.value })} placeholder="https://..." className="bg-secondary border-border" />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0], "favicon_url")} />
                    <Button type="button" size="sm" variant="outline" disabled={uploadingLogo} asChild>
                      <span><Upload className="h-3 w-3" /></span>
                    </Button>
                  </label>
                </div>
              </div>
              <div>
                <Label>Bordures arrondies</Label>
                <Select value={draft.radius} onValueChange={(v) => update({ radius: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{RADII.map((r) => <SelectItem key={r.v} value={r.v}>{r.label} ({r.v})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4 mt-4">
              <div>
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><Sun className="h-3 w-3" /> Mode clair</h3>
                <div className="space-y-2">
                  <ColorRow label="Primaire" field="light_primary" />
                  <ColorRow label="Accent" field="light_accent" />
                  <ColorRow label="Fond" field="light_background" />
                  <ColorRow label="Texte" field="light_foreground" />
                  <ColorRow label="Cartes" field="light_card" />
                  <ColorRow label="Discret" field="light_muted" />
                  <ColorRow label="Bordures" field="light_border" />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><Moon className="h-3 w-3" /> Mode sombre</h3>
                <div className="space-y-2">
                  <ColorRow label="Primaire" field="dark_primary" />
                  <ColorRow label="Accent" field="dark_accent" />
                  <ColorRow label="Fond" field="dark_background" />
                  <ColorRow label="Texte" field="dark_foreground" />
                  <ColorRow label="Cartes" field="dark_card" />
                  <ColorRow label="Discret" field="dark_muted" />
                  <ColorRow label="Bordures" field="dark_border" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="typo" className="space-y-3 mt-4">
              <div>
                <Label>Police des titres</Label>
                <Select value={draft.font_display} onValueChange={(v) => update({ font_display: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <p className="font-display text-2xl mt-2">Aa Bb Cc 123</p>
              </div>
              <div>
                <Label>Police du texte</Label>
                <Select value={draft.font_body} onValueChange={(v) => update({ font_body: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <p className="font-body text-sm mt-2 text-muted-foreground">The quick brown fox jumps over the lazy dog.</p>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-3 mt-4">
              <div>
                <Label>Titre du Hero</Label>
                <Input value={draft.hero_title ?? ""} onChange={(e) => update({ hero_title: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div>
                <Label>Sous-titre du Hero</Label>
                <Textarea value={draft.hero_subtitle ?? ""} onChange={(e) => update({ hero_subtitle: e.target.value })} className="bg-secondary border-border min-h-[80px]" />
              </div>
              <div>
                <Label>Texte du footer</Label>
                <Input value={draft.footer_text ?? ""} onChange={(e) => update({ footer_text: e.target.value })} className="bg-secondary border-border" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* PREVIEW */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" /> Aperçu en direct
              </div>
              <span className="text-xs text-muted-foreground">L'app entière change pendant l'édition</span>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                {draft.logo_url && <img src={draft.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />}
                <div>
                  <h1 className="font-display text-3xl font-bold gradient-text">{draft.site_name}</h1>
                  <p className="text-sm text-muted-foreground">{draft.tagline}</p>
                </div>
              </div>
              <div className="rounded-xl p-8 text-center" style={{ background: "var(--gradient-primary)" }}>
                <h2 className="font-display text-4xl font-bold text-primary-foreground mb-2">{draft.hero_title}</h2>
                <p className="text-primary-foreground/90">{draft.hero_subtitle}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Tracks</p>
                  <p className="font-display text-2xl font-bold">1 247</p>
                </div>
                <div className="bg-secondary border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Artistes</p>
                  <p className="font-display text-2xl font-bold text-primary">328</p>
                </div>
                <div className="bg-secondary border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">DJs</p>
                  <p className="font-display text-2xl font-bold text-accent">5 612</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="hero">Action principale</Button>
                <Button variant="outline">Secondaire</Button>
                <Button variant="ghost">Discret</Button>
                <Button variant="destructive">Supprimer</Button>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display font-bold mb-1">Carte exemple</h3>
                <p className="text-sm text-muted-foreground">{draft.footer_text}</p>
              </div>
            </div>
          </div>
          <Link to="/" target="_blank" className="block text-center text-xs text-primary hover:underline">
            Ouvrir le site complet dans un nouvel onglet ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
