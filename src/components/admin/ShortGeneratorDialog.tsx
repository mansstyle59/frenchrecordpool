import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Loader2, Play, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Track = {
  id: string;
  title: string | null;
  artist: string | null;
  cover_url: string | null;
  preview_url: string | null;
  bpm: number | null;
  musical_key: string | null;
  version: string | null;
  label: string | null;
  genre: string | null;
};

interface Props {
  track: Track | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const W = 1080;
const H = 1920;

export function ShortGeneratorDialog({ track, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const [duration, setDuration] = useState(15);
  const [recording, setRecording] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [coverReady, setCoverReady] = useState(false);

  // Preload cover (with CORS) for use in canvas
  useEffect(() => {
    if (!open || !track) return;
    setResultUrl(null);
    setCoverReady(false);
    if (track.cover_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { coverImgRef.current = img; setCoverReady(true); draw(0); };
      img.onerror = () => { coverImgRef.current = null; setCoverReady(true); draw(0); };
      img.src = track.cover_url;
    } else {
      coverImgRef.current = null;
      setCoverReady(true);
      draw(0);
    }
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, track?.id]);

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setRecording(false);
    setPreviewing(false);
  }

  function drawFrame(t: number, freq: Uint8Array | null) {
    const c = canvasRef.current;
    if (!c || !track) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Background: cover blurred + dark gradient overlay
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);
    const img = coverImgRef.current;
    if (img) {
      ctx.save();
      ctx.filter = "blur(40px) brightness(0.45) saturate(1.2)";
      const scale = Math.max(W / img.width, H / img.height) * 1.2;
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
    }
    // Vignette
    const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.9);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Brand bar
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 32px 'Space Grotesk', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("FRENCH RECORD POOL", 60, 90);
    // Accent bar
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(60, 110, 80, 6);

    // Vinyl + cover (centered)
    const cx = W / 2;
    const cy = H * 0.42;
    const coverSize = 620;
    const vinylSize = coverSize * 1.05;

    // Vinyl disc (behind cover, slides out + spins)
    ctx.save();
    const slide = Math.min(1, t / 0.8);
    const offset = 200 * slide;
    ctx.translate(cx + offset, cy);
    ctx.rotate((t * Math.PI * 2) / 3);
    // vinyl base
    ctx.beginPath();
    ctx.arc(0, 0, vinylSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();
    // grooves
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1.5;
    for (let r = 80; r < vinylSize / 2 - 10; r += 10) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // reflection
    const refl = ctx.createLinearGradient(-vinylSize / 2, -vinylSize / 2, vinylSize / 2, vinylSize / 2);
    refl.addColorStop(0, "rgba(255,255,255,0.18)");
    refl.addColorStop(0.5, "rgba(255,255,255,0)");
    refl.addColorStop(1, "rgba(255,255,255,0.1)");
    ctx.fillStyle = refl;
    ctx.beginPath();
    ctx.arc(0, 0, vinylSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // label
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cover (front)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    const r = 24;
    const x = -coverSize / 2;
    const y = -coverSize / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + coverSize, y, x + coverSize, y + coverSize, r);
    ctx.arcTo(x + coverSize, y + coverSize, x, y + coverSize, r);
    ctx.arcTo(x, y + coverSize, x, y, r);
    ctx.arcTo(x, y, x + coverSize, y, r);
    ctx.closePath();
    ctx.clip();
    if (img) {
      ctx.drawImage(img, x, y, coverSize, coverSize);
    } else {
      const cg = ctx.createLinearGradient(x, y, x + coverSize, y + coverSize);
      cg.addColorStop(0, "#1e3a8a");
      cg.addColorStop(1, "#ef4444");
      ctx.fillStyle = cg;
      ctx.fillRect(x, y, coverSize, coverSize);
    }
    ctx.restore();

    // Waveform bars
    const wfY = H * 0.74;
    const wfH = 140;
    const bars = 48;
    const barW = (W - 200) / bars;
    for (let i = 0; i < bars; i++) {
      let v: number;
      if (freq) {
        const idx = Math.floor((i / bars) * freq.length * 0.6);
        v = (freq[idx] ?? 0) / 255;
      } else {
        v = 0.3 + 0.5 * Math.abs(Math.sin(t * 4 + i * 0.4));
      }
      const h = Math.max(6, v * wfH);
      const bx = 100 + i * barW;
      const grd = ctx.createLinearGradient(0, wfY - h / 2, 0, wfY + h / 2);
      grd.addColorStop(0, "#3b82f6");
      grd.addColorStop(0.5, "#ffffff");
      grd.addColorStop(1, "#ef4444");
      ctx.fillStyle = grd;
      ctx.beginPath();
      const rr = barW / 2.6;
      const bw = barW - 6;
      const bh = h;
      const by = wfY - h / 2;
      const bxx = bx + 3;
      ctx.moveTo(bxx + rr, by);
      ctx.arcTo(bxx + bw, by, bxx + bw, by + bh, rr);
      ctx.arcTo(bxx + bw, by + bh, bxx, by + bh, rr);
      ctx.arcTo(bxx, by + bh, bxx, by, rr);
      ctx.arcTo(bxx, by, bxx + bw, by, rr);
      ctx.closePath();
      ctx.fill();
    }

    // Text block
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 84px 'Space Grotesk', system-ui, sans-serif";
    const title = (track.title ?? "Untitled").toUpperCase();
    wrapText(ctx, title, W / 2, H * 0.83, W - 160, 92, 2);

    ctx.font = "500 44px 'DM Sans', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const sub = [track.artist, track.version].filter(Boolean).join(" — ");
    if (sub) ctx.fillText(sub, W / 2, H * 0.9);

    // Meta chips
    const chips: string[] = [];
    if (track.bpm) chips.push(`${track.bpm} BPM`);
    if (track.musical_key) chips.push(track.musical_key);
    if (track.genre) chips.push(track.genre);
    if (track.label) chips.push(track.label);
    drawChips(ctx, chips, W / 2, H * 0.94);
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
        if (lines.length >= maxLines) break;
      } else line = test;
    }
    if (lines.length < maxLines) lines.push(line);
    const startY = y - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lh));
  }

  function drawChips(ctx: CanvasRenderingContext2D, chips: string[], cx: number, cy: number) {
    if (!chips.length) return;
    ctx.font = "600 32px 'DM Sans', system-ui, sans-serif";
    const pad = 24;
    const gap = 16;
    const widths = chips.map(c => ctx.measureText(c).width + pad * 2);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (chips.length - 1);
    let x = cx - total / 2;
    const h = 60;
    chips.forEach((c, i) => {
      const w = widths[i];
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, cy - h / 2, w, h, 30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(c, x + w / 2, cy + 11);
      ctx.textAlign = "center";
      x += w + gap;
    });
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(t: number) {
    drawFrame(t, analyserRef.current ? readFreq() : null);
  }

  function readFreq(): Uint8Array | null {
    if (!analyserRef.current) return null;
    const arr = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(arr);
    return arr;
  }

  async function setupAudio(): Promise<MediaStream | null> {
    if (!track?.preview_url || !audioRef.current) return null;
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.src = track.preview_url;
    audioRef.current.loop = true;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const dest = ctx.createMediaStreamDestination();
      destRef.current = dest;
      src.connect(analyser);
      src.connect(ctx.destination); // playback
      src.connect(dest); // for recording
      return dest.stream;
    } catch (e) {
      console.warn("Audio setup failed (CORS?). Recording will be silent.", e);
      return null;
    }
  }

  async function startPreview() {
    if (previewing || recording) return;
    setPreviewing(true);
    const stream = await setupAudio();
    if (audioRef.current && stream) {
      try { await audioRef.current.play(); } catch {}
    }
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      draw(t);
      if (previewingRef.current) rafRef.current = requestAnimationFrame(loop);
    };
    previewingRef.current = true;
    loop();
  }

  const previewingRef = useRef(false);
  useEffect(() => { previewingRef.current = previewing; }, [previewing]);

  function stopPreview() {
    previewingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioRef.current) audioRef.current.pause();
    setPreviewing(false);
  }

  async function startRecording() {
    if (recording || !canvasRef.current) return;
    setResultUrl(null);
    setRecording(true);

    const audioStream = await setupAudio();
    const canvasStream = canvasRef.current.captureStream(30);
    if (audioStream) {
      audioStream.getAudioTracks().forEach(tr => canvasStream.addTrack(tr));
    }
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const rec = new MediaRecorder(canvasStream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    recorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setResultUrl(URL.createObjectURL(blob));
      setRecording(false);
      if (audioRef.current) audioRef.current.pause();
      previewingRef.current = false;
    };

    if (audioRef.current) {
      try { audioRef.current.currentTime = 0; await audioRef.current.play(); } catch {}
    }
    rec.start();
    previewingRef.current = true;
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      draw(t);
      if (t >= duration) {
        rec.stop();
        return;
      }
      if (previewingRef.current) rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    toast({ title: "Enregistrement en cours…", description: `${duration}s à 9:16` });
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    previewingRef.current = false;
  }

  function downloadResult() {
    if (!resultUrl || !track) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const safe = (track.title || "short").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
    a.download = `frp_short_${safe}.webm`;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopAll(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Générer un Short DJ — {track?.title}</DialogTitle>
          <DialogDescription>
            Format 9:16 (1080×1920), métadonnées auto, vinyle animé + waveform sur la preview.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden border border-border">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full h-full block"
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Durée : {duration}s</label>
              <Slider
                min={5} max={30} step={1}
                value={[duration]}
                onValueChange={(v) => setDuration(v[0])}
                disabled={recording}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {!previewing ? (
                <Button variant="outline" onClick={startPreview} disabled={recording || !coverReady}>
                  <Play className="h-4 w-4 mr-2" /> Aperçu
                </Button>
              ) : (
                <Button variant="outline" onClick={stopPreview}>
                  <Square className="h-4 w-4 mr-2" /> Stop aperçu
                </Button>
              )}

              {!recording ? (
                <Button onClick={startRecording} disabled={!coverReady || !track?.preview_url}>
                  <Play className="h-4 w-4 mr-2 fill-current" /> Enregistrer
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopRecording}>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Arrêter
                </Button>
              )}

              {resultUrl && (
                <Button variant="secondary" onClick={downloadResult}>
                  <Download className="h-4 w-4 mr-2" /> Télécharger .webm
                </Button>
              )}
            </div>

            {!track?.preview_url && (
              <p className="text-xs text-amber-500">Aucune preview audio — la vidéo sera muette.</p>
            )}
            {resultUrl && (
              <video src={resultUrl} controls className="w-full rounded-md border border-border" />
            )}
            <audio ref={audioRef} hidden />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Astuce : le rendu se fait en local dans le navigateur. Si le cover ou l'audio est sur un domaine sans CORS, l'image peut être ignorée et l'audio muet. Préférer les URLs hébergées sur Lovable Cloud.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
