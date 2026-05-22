import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useBranding } from "@/contexts/BrandingContext";
import { Download, Image as ImageIcon, Smartphone, Square, Monitor, Twitter, Facebook, Sparkles, Music, Loader2 } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { toast } from "sonner";

type TemplateId = "ig-story" | "ig-post" | "fb-share" | "x-card" | "mockup-desktop" | "mockup-mobile";

const TEMPLATES: Array<{ id: TemplateId; label: string; w: number; h: number; icon: any }> = [
  { id: "ig-story", label: "IG Story", w: 1080, h: 1920, icon: Smartphone },
  { id: "ig-post", label: "IG Post", w: 1080, h: 1080, icon: Square },
  { id: "fb-share", label: "Facebook", w: 1200, h: 630, icon: Facebook },
  { id: "x-card", label: "X / Twitter", w: 1600, h: 900, icon: Twitter },
  { id: "mockup-desktop", label: "Mockup Desktop", w: 1600, h: 1000, icon: Monitor },
  { id: "mockup-mobile", label: "Mockup Mobile", w: 1080, h: 1920, icon: Smartphone },
];

const PRESETS = [
  { id: "studio", label: "Studio Glass", from: "#1e3a8a", via: "#4338ca", to: "#dc2626" },
  { id: "midnight", label: "Midnight", from: "#0f172a", via: "#1e1b4b", to: "#312e81" },
  { id: "neon", label: "Neon Club", from: "#0a0a0a", via: "#7c3aed", to: "#ec4899" },
  { id: "sunset", label: "Sunset", from: "#7c2d12", via: "#dc2626", to: "#fbbf24" },
  { id: "ocean", label: "Ocean Deep", from: "#0c4a6e", via: "#0e7490", to: "#06b6d4" },
  { id: "mono", label: "Monochrome", from: "#000000", via: "#171717", to: "#404040" },
];

function useApprovedTracks() {
  return useQuery({
    queryKey: ["screenshot-studio-tracks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks")
        .select("id,title,artist,cover_url,genre,bpm,musical_key,version,release_date")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(150);
      return data ?? [];
    },
  });
}

export default function AdminScreenshotStudio() {
  const { branding } = useBranding();
  const { data: tracks = [] } = useApprovedTracks();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Editor state
  const [template, setTemplate] = useState<TemplateId>("ig-post");
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [trackId, setTrackId] = useState<string>("");
  const [overlayOpacity, setOverlayOpacity] = useState(55);
  const [showLogo, setShowLogo] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [eyebrow, setEyebrow] = useState("Nouveauté · French Record Pool");
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [ctaLabel, setCtaLabel] = useState("frenchrecordpool.com");
  const [format, setFormat] = useState<"png" | "webp">("png");

  const tpl = TEMPLATES.find(t => t.id === template)!;
  const presetObj = PRESETS.find(p => p.id === preset)!;
  const track = tracks.find(t => t.id === trackId);

  // Auto-fill when track is selected
  useEffect(() => {
    if (track) {
      setHeadline(track.title || "");
      setSubhead([track.artist, track.version, track.genre].filter(Boolean).join(" · "));
    }
  }, [trackId]);

  // Scale preview to fit container (max 520px tallest dim)
  const PREVIEW_MAX = 520;
  const scale = useMemo(() => {
    return Math.min(PREVIEW_MAX / tpl.w, PREVIEW_MAX / tpl.h);
  }, [tpl]);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const node = canvasRef.current;
      const opts = {
        pixelRatio: 1, // canvas is already at full resolution
        cacheBust: true,
        skipFonts: false,
        backgroundColor: "#000",
      };
      const dataUrl = format === "webp"
        ? await htmlToImage.toPng(node, opts) // webp via canvas conversion below
        : await htmlToImage.toPng(node, opts);

      let finalUrl = dataUrl;
      if (format === "webp") {
        const img = new Image();
        img.src = dataUrl;
        await new Promise(r => img.onload = r);
        const cnv = document.createElement("canvas");
        cnv.width = tpl.w; cnv.height = tpl.h;
        cnv.getContext("2d")!.drawImage(img, 0, 0);
        finalUrl = cnv.toDataURL("image/webp", 0.95);
      }

      const a = document.createElement("a");
      a.href = finalUrl;
      a.download = `frp-${template}-${Date.now()}.${format}`;
      a.click();
      toast.success("Visuel exporté");
    } catch (e: any) {
      console.error(e);
      toast.error("Export impossible (image CORS bloquée ?)");
    } finally {
      setExporting(false);
    }
  };

  const isVertical = tpl.h >= tpl.w;
  const isMockup = template.startsWith("mockup");

  return (
    <AdminLayout title="Screenshot Studio" subtitle="Génère des visuels prêts pour les réseaux sociaux" wide>
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(t => {
                  const Ico = t.icon;
                  const active = template === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`group relative rounded-lg border p-2 text-[10px] flex flex-col items-center gap-1 transition-all ${active ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/50 text-muted-foreground"}`}
                    >
                      <Ico className="h-4 w-4" />
                      <span className="font-medium">{t.label}</span>
                      <span className="opacity-60">{t.w}×{t.h}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="content">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="brand">Branding</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-3 mt-3">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label className="text-xs">Track (auto-remplit le visuel)</Label>
                    <Select value={trackId || "__none__"} onValueChange={(v) => setTrackId(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Aucun – contenu libre" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">— Aucun —</SelectItem>
                        {tracks.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="truncate">{t.artist} – {t.title}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Eyebrow</Label>
                    <Input value={eyebrow} onChange={e => setEyebrow(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Titre</Label>
                    <Textarea value={headline} onChange={e => setHeadline(e.target.value)} rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">Sous-titre</Label>
                    <Input value={subhead} onChange={e => setSubhead(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">CTA / URL</Label>
                    <Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-3 mt-3">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label className="text-xs">Palette</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {PRESETS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPreset(p.id)}
                          className={`h-12 rounded-md border-2 transition-all ${preset === p.id ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                          style={{ background: `linear-gradient(135deg, ${p.from}, ${p.via}, ${p.to})` }}
                          title={p.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Opacité overlay : {overlayOpacity}%</Label>
                    <Slider value={[overlayOpacity]} onValueChange={v => setOverlayOpacity(v[0])} min={0} max={90} step={5} />
                  </div>
                  <div>
                    <Label className="text-xs">Format export</Label>
                    <Select value={format} onValueChange={v => setFormat(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG (qualité max)</SelectItem>
                        <SelectItem value="webp">WEBP (léger)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="brand" className="space-y-3 mt-3">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Logo</Label>
                    <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Watermark URL</Label>
                    <Switch checked={showWatermark} onCheckedChange={setShowWatermark} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Le logo et le nom utilisent les réglages de Branding.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Button onClick={handleExport} disabled={exporting} className="w-full" size="lg">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exporter {tpl.w}×{tpl.h} {format.toUpperCase()}
          </Button>
        </div>

        {/* Preview */}
        <div className="flex items-start justify-center">
          <div
            className="relative rounded-xl shadow-2xl overflow-hidden ring-1 ring-border"
            style={{ width: tpl.w * scale, height: tpl.h * scale }}
          >
            {/* Scaled wrapper — the inner canvas is at full resolution */}
            <div
              style={{
                width: tpl.w,
                height: tpl.h,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <CanvasInner
                refEl={canvasRef}
                tpl={tpl}
                preset={presetObj}
                overlayOpacity={overlayOpacity}
                track={track}
                branding={branding}
                showLogo={showLogo}
                showWatermark={showWatermark}
                eyebrow={eyebrow}
                headline={headline || "Votre titre ici"}
                subhead={subhead || "Sous-titre"}
                ctaLabel={ctaLabel}
                isMockup={isMockup}
                isVertical={isVertical}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function CanvasInner({
  refEl, tpl, preset, overlayOpacity, track, branding, showLogo, showWatermark,
  eyebrow, headline, subhead, ctaLabel, isMockup, isVertical,
}: any) {
  const cover = track?.cover_url;
  const siteName = branding?.site_name || "French Record Pool";

  return (
    <div
      ref={refEl}
      style={{
        width: tpl.w,
        height: tpl.h,
        background: `linear-gradient(135deg, ${preset.from}, ${preset.via}, ${preset.to})`,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif",
        color: "#fff",
      }}
    >
      {/* Cover background blurred */}
      {cover && !isMockup && (
        <img
          src={cover}
          crossOrigin="anonymous"
          alt=""
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", filter: "blur(40px) saturate(140%)", transform: "scale(1.15)",
            opacity: 0.55,
          }}
        />
      )}

      {/* Dark gradient overlay */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,${overlayOpacity / 200}) 0%, rgba(0,0,0,${overlayOpacity / 100}) 100%)`,
        }}
      />

      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: preset.to, opacity: 0.25, filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: preset.from, opacity: 0.35, filter: "blur(80px)" }} />

      {/* MOCKUP layouts */}
      {isMockup ? (
        <MockupLayout tpl={tpl} cover={cover} headline={headline} subhead={subhead} siteName={siteName} ctaLabel={ctaLabel} showLogo={showLogo} />
      ) : (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: isVertical ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: isVertical ? 60 : 80,
            padding: isVertical ? 80 : 100,
            width: "100%", height: "100%",
          }}
        >
          {/* Cover artwork */}
          {cover && (
            <div
              style={{
                width: isVertical ? Math.min(tpl.w - 200, 720) : Math.min(tpl.h - 200, 680),
                height: isVertical ? Math.min(tpl.w - 200, 720) : Math.min(tpl.h - 200, 680),
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                flexShrink: 0,
              }}
            >
              <img src={cover} crossOrigin="anonymous" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          {/* Text block */}
          <div style={{ flex: 1, maxWidth: isVertical ? tpl.w - 160 : 700 }}>
            {/* Logo + brand */}
            {showLogo && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 20px rgba(239,68,68,0.8)" }} />
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{siteName}</span>
              </div>
            )}

            {/* Eyebrow */}
            {eyebrow && (
              <div style={{
                display: "inline-block", padding: "10px 20px", borderRadius: 999,
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)", fontSize: 22, fontWeight: 500,
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 32,
              }}>
                {eyebrow}
              </div>
            )}

            {/* Headline */}
            <h1 style={{
              fontSize: isVertical ? 110 : 96, fontWeight: 800, lineHeight: 1.02,
              margin: "0 0 28px 0", letterSpacing: "-0.03em",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}>
              {headline}
            </h1>

            {/* Sub */}
            {subhead && (
              <p style={{ fontSize: 36, opacity: 0.85, lineHeight: 1.35, margin: "0 0 40px 0", fontWeight: 400 }}>
                {subhead}
              </p>
            )}

            {/* Track meta chips */}
            {track && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 40 }}>
                {track.bpm && <Chip>{track.bpm} BPM</Chip>}
                {track.musical_key && <Chip>Key {track.musical_key}</Chip>}
                {track.genre && <Chip>{track.genre}</Chip>}
              </div>
            )}

            {/* CTA */}
            {ctaLabel && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 14,
                padding: "20px 36px", borderRadius: 16,
                background: "linear-gradient(135deg, #fff 0%, #f1f5f9 100%)",
                color: "#0f172a", fontSize: 28, fontWeight: 700,
                boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
              }}>
                ▶ {ctaLabel}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watermark */}
      {showWatermark && !isMockup && (
        <div style={{
          position: "absolute", bottom: 40, right: 40, zIndex: 3,
          fontSize: 18, opacity: 0.6, letterSpacing: "0.15em",
          textTransform: "uppercase", fontWeight: 600,
        }}>
          frenchrecordpool.com
        </div>
      )}
    </div>
  );
}

function Chip({ children }: any) {
  return (
    <span style={{
      padding: "10px 18px", borderRadius: 999,
      background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
      fontSize: 22, fontWeight: 600, fontFamily: "monospace",
    }}>{children}</span>
  );
}

function MockupLayout({ tpl, cover, headline, subhead, siteName, ctaLabel, showLogo }: any) {
  const isMobile = tpl.h > tpl.w;
  if (isMobile) {
    // Phone mockup
    return (
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 540, height: 1140, borderRadius: 80, background: "#0a0a0a",
          padding: 16, boxShadow: "0 40px 100px rgba(0,0,0,0.7)", border: "8px solid #1a1a1a",
        }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 64, overflow: "hidden", position: "relative", background: "#000" }}>
            {cover && <img src={cover} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9))" }} />
            <div style={{ position: "absolute", bottom: 60, left: 40, right: 40, color: "#fff" }}>
              <div style={{ fontSize: 28, opacity: 0.8, marginBottom: 12 }}>{subhead}</div>
              <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05 }}>{headline}</div>
            </div>
          </div>
        </div>
        {showLogo && (
          <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>{siteName}</div>
          </div>
        )}
      </div>
    );
  }
  // Desktop mockup
  return (
    <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{
        width: "100%", maxWidth: 1300, borderRadius: 20, overflow: "hidden",
        background: "#0a0a0a", boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ height: 44, background: "#1a1a1a", display: "flex", alignItems: "center", padding: "0 18px", gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#28c840" }} />
          <div style={{ marginLeft: 20, fontSize: 16, color: "#888" }}>{ctaLabel}</div>
        </div>
        <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
          {cover && <img src={cover} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.95))" }} />
          <div style={{ position: "absolute", bottom: 50, left: 60, right: 60, color: "#fff" }}>
            <div style={{ fontSize: 22, opacity: 0.7, marginBottom: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>{subhead}</div>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{headline}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
