import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, Save, Upload, Sparkles, ImageIcon, Eye } from "lucide-react";
import DjLayout from "@/components/dj/DjLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ALL_ROLES, normalizeRoles, roleClassName, roleLabel, type ArtistRole } from "@/lib/artistRoles";

const SOCIALS: Array<[string, string]> = [
  ["website_url", "Site web"], ["instagram_url", "Instagram"],
  ["soundcloud_url", "SoundCloud"], ["youtube_url", "YouTube"],
  ["spotify_url", "Spotify"], ["beatport_url", "Beatport"],
  ["tiktok_url", "TikTok"],
];

export default function DjProfile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const { data: artist, isLoading } = useQuery({
    queryKey: ["dj-profile-self", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("artists").select("*").eq("user_id", user!.id).maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (!artist) return;
    setDraft({
      tagline: artist.tagline ?? "",
      bio_long: artist.bio_long ?? artist.bio ?? "",
      banner_url: artist.banner_url ?? "",
      photo_url: artist.photo_url ?? "",
      country: artist.country ?? "",
      genre: artist.genre ?? "",
      roles: normalizeRoles(artist.roles, artist.kind),
      website_url: artist.website_url ?? "",
      instagram_url: artist.instagram_url ?? "",
      soundcloud_url: artist.soundcloud_url ?? "",
      youtube_url: artist.youtube_url ?? "",
      spotify_url: artist.spotify_url ?? "",
      beatport_url: artist.beatport_url ?? "",
      tiktok_url: artist.tiktok_url ?? "",
    });
  }, [artist]);

  const live = useMemo(() => ({ ...(artist ?? {}), ...draft }), [artist, draft]);
  const roles = (draft.roles ?? []) as ArtistRole[];

  const toggleRole = (r: ArtistRole) => {
    setDraft((p) => {
      const cur: ArtistRole[] = p.roles ?? [];
      return { ...p, roles: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] };
    });
  };

  const uploadImage = async (file: File, field: "banner_url" | "photo_url") => {
    if (!artist) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${artist.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("artist-banners").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload échoué", description: error.message, variant: "destructive" }); return; }
    const { data } = supabase.storage.from("artist-banners").getPublicUrl(path);
    setDraft((p) => ({ ...p, [field]: data.publicUrl }));
  };

  const save = async () => {
    if (!artist) return;
    setSaving(true);
    const payload = { ...draft, roles: roles.length ? roles : ["dj"] };
    const { error } = await supabase.from("artists").update(payload).eq("id", artist.id);
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Profil mis à jour ✨" });
    qc.invalidateQueries({ queryKey: ["dj-profile-self", user?.id] });
    qc.invalidateQueries({ queryKey: ["dj-studio-profile", user?.id] });
  };

  if (isLoading) {
    return <DjLayout title="Mon profil artiste"><p className="text-center text-muted-foreground py-12">Chargement…</p></DjLayout>;
  }

  if (!artist) {
    return (
      <DjLayout title="Mon profil artiste">
        <div className="max-w-xl mx-auto text-center py-12">
          <Sparkles className="h-10 w-10 mx-auto text-primary/60 mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Aucun profil artiste lié</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ton compte n'est pas encore associé à une page artiste publique. Publie un morceau pour que ta page soit créée automatiquement, puis demande à un admin de te lier.
          </p>
          <Link to="/dj/upload"><Button variant="hero"><Upload className="h-4 w-4 mr-2" /> Publier un morceau</Button></Link>
        </div>
      </DjLayout>
    );
  }

  return (
    <DjLayout
      title="Mon profil artiste"
      subtitle={`Page publique : /artists/${artist.slug}`}
      actions={
        <div className="flex gap-2">
          <Link to={`/artists/${artist.slug}`} target="_blank">
            <Button variant="ghost" size="sm" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Voir</Button>
          </Link>
          <Button variant="hero" size="sm" onClick={save} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> {saving ? "…" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      {/* Live preview */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border border-border">
        <div className="relative h-40 w-full">
          {live.banner_url ? (
            <img src={live.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-accent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        <div className="-mt-12 px-4 pb-4 flex items-end gap-4">
          <div className="h-20 w-20 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent ring-4 ring-background shadow-2xl shrink-0">
            {live.photo_url ? (
              <img src={live.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-display font-black text-background">
                {(artist.name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold truncate">{artist.name}</h2>
            <p className="text-xs text-muted-foreground italic truncate">{live.tagline || "—"}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="outline" className={`text-[10px] uppercase tracking-wider font-bold ${roleClassName(r)}`}>
                  {roleLabel(r)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">Identité</h3>
          <div>
            <Label className="text-xs">Tagline</Label>
            <Input value={draft.tagline ?? ""} onChange={(e) => setDraft((p) => ({ ...p, tagline: e.target.value }))} placeholder="Phrase d'accroche" />
          </div>
          <div>
            <Label className="text-xs">Bio</Label>
            <Textarea rows={6} value={draft.bio_long ?? ""} onChange={(e) => setDraft((p) => ({ ...p, bio_long: e.target.value }))} placeholder="Présente-toi…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Genre principal</Label>
              <Input value={draft.genre ?? ""} onChange={(e) => setDraft((p) => ({ ...p, genre: e.target.value }))} placeholder="Afro House" /></div>
            <div><Label className="text-xs">Pays</Label>
              <Input value={draft.country ?? ""} onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))} placeholder="FR" /></div>
          </div>
          <div>
            <Label className="text-xs">Mes rôles</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_ROLES.map((r) => {
                const on = roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-3 h-8 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                      on ? roleClassName(r) + " ring-2 ring-offset-1 ring-offset-background" : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground"
                    }`}
                  >
                    {roleLabel(r)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">Visuels</h3>
          <ImageField label="Bannière" value={draft.banner_url ?? ""} onUrl={(v) => setDraft((p) => ({ ...p, banner_url: v }))} onFile={(f) => uploadImage(f, "banner_url")} aspect="banner" />
          <ImageField label="Photo de profil" value={draft.photo_url ?? ""} onUrl={(v) => setDraft((p) => ({ ...p, photo_url: v }))} onFile={(f) => uploadImage(f, "photo_url")} aspect="square" />
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card/40 p-5 lg:col-span-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5" /> Réseaux sociaux
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {SOCIALS.map(([k, label]) => (
              <div key={k}>
                <Label className="text-xs">{label}</Label>
                <Input value={draft[k] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.value }))} placeholder="https://…" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DjLayout>
  );
}

function ImageField({ label, value, onUrl, onFile, aspect }: { label: string; value: string; onUrl: (v: string) => void; onFile: (f: File) => void; aspect: "banner" | "square" }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3 mt-1">
        <div className={`shrink-0 bg-secondary/50 rounded overflow-hidden ${aspect === "banner" ? "h-12 w-28" : "h-16 w-16"}`}>
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground/50" /></div>}
        </div>
        <div className="flex-1 space-y-1">
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-xs" />
          <Input value={value} onChange={(e) => onUrl(e.target.value)} placeholder="…ou URL d'une image" className="text-xs" />
        </div>
      </div>
    </div>
  );
}
