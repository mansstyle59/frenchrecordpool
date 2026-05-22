import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Download, Copy, RotateCcw, Filter, CheckCircle2, Clock as ClockIcon,
  FileAudio, Calendar, Music, Headphones, Disc3, X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveCover } from "@/lib/trackCover";
import { downloadTrack } from "@/lib/downloadTrack";
import { toast } from "sonner";

interface DownloadRow {
  download_id: string;
  downloaded_at: string;
  track_id: string;
  title: string;
  artist: string;
  genre: string | null;
  bpm: number | null;
  musical_key: string | null;
  version: string | null;
  cover_url: string | null;
  audio_url: string | null;
  download_url: string | null;
  duration: string | null;
  audio_format: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function inferFormat(row: DownloadRow): string {
  if (row.audio_format) return row.audio_format.toUpperCase();
  const url = row.audio_url || row.download_url || "";
  const m = url.match(/\.(mp3|wav|flac|aiff|m4a|ogg|aac)(?:\?|$)/i);
  return m ? m[1].toUpperCase() : "—";
}

export default function Downloads() {
  const { user, hasActiveSubscription } = useAuth();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");
  const [bpmRange, setBpmRange] = useState<string>("all");
  const [reDownloading, setReDownloading] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-download-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_download_history");
      if (error) throw error;
      return (data ?? []) as DownloadRow[];
    },
  });

  const genres = useMemo(
    () => Array.from(new Set(rows.map((r) => r.genre).filter(Boolean))).sort() as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.artist.toLowerCase().includes(q)) return false;
      }
      if (genre !== "all" && r.genre !== genre) return false;
      if (period !== "all") {
        const ts = new Date(r.downloaded_at).getTime();
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        if (now - ts > days * 86_400_000) return false;
      }
      if (bpmRange !== "all" && r.bpm) {
        const [lo, hi] = bpmRange.split("-").map(Number);
        if (r.bpm < lo || r.bpm > hi) return false;
      }
      return true;
    });
  }, [rows, search, genre, period, bpmRange]);

  const stats = useMemo(() => {
    const totalSize = rows.reduce((s, r) => s + (r.file_size_bytes ?? 0), 0);
    return { total: rows.length, filtered: filtered.length, totalSize };
  }, [rows, filtered]);

  const clearFilters = () => { setSearch(""); setGenre("all"); setPeriod("all"); setBpmRange("all"); };
  const hasFilters = search || genre !== "all" || period !== "all" || bpmRange !== "all";

  const handleReDownload = async (trackId: string) => {
    setReDownloading(trackId);
    try {
      await downloadTrack(trackId, user, hasActiveSubscription);
    } finally {
      setReDownloading(null);
    }
  };

  const handleCopyLink = async (trackId: string) => {
    const url = `${window.location.origin}/tracks/${trackId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">Connectez-vous pour voir votre historique.</p>
          <Link to="/login"><Button variant="hero">Se connecter</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHero
        eyebrow="Espace DJ"
        title=""
        highlight="Mes téléchargements"
        description="Historique complet, recherche, filtres et retéléchargements rapides."
        stats={[
          { icon: <Download className="h-3.5 w-3.5 text-primary" />, label: `${stats.total} téléchargements` },
          { icon: <FileAudio className="h-3.5 w-3.5 text-accent" />, label: formatSize(stats.totalSize) },
        ]}
      />

      <div className="container py-6 space-y-5">
        {/* Toolbar */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-3 md:p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par titre ou artiste…"
                className="pl-10 bg-background/40"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 lg:flex lg:gap-2">
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-background/40 lg:w-36"><SelectValue placeholder="Genre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous genres</SelectItem>
                  {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="bg-background/40 lg:w-32"><SelectValue placeholder="Période" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute période</SelectItem>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="90d">90 derniers jours</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bpmRange} onValueChange={setBpmRange}>
                <SelectTrigger className="bg-background/40 lg:w-32"><SelectValue placeholder="BPM" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous BPM</SelectItem>
                  <SelectItem value="0-99">&lt; 100</SelectItem>
                  <SelectItem value="100-119">100–119</SelectItem>
                  <SelectItem value="120-129">120–129</SelectItem>
                  <SelectItem value="130-139">130–139</SelectItem>
                  <SelectItem value="140-200">≥ 140</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 shrink-0">
                <X className="h-3.5 w-3.5" /> Effacer
              </Button>
            )}
          </div>
          {hasFilters && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> {stats.filtered} résultat{stats.filtered > 1 ? "s" : ""} sur {stats.total}
            </p>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <Download className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">{rows.length === 0 ? "Aucun téléchargement pour le moment." : "Aucun résultat avec ces filtres."}</p>
            {rows.length === 0 && (
              <Link to="/new"><Button variant="hero" size="sm" className="mt-3">Découvrir les nouveautés</Button></Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_90px_70px_90px_110px_140px] gap-3 px-4 py-2 border-b border-border bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <div>Morceau</div>
                <div>Genre</div>
                <div className="text-center">BPM / Key</div>
                <div className="text-center">Format</div>
                <div className="text-right">Taille</div>
                <div>Téléchargé</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y divide-border/60">
                {filtered.map((r) => (
                  <DownloadRowDesktop
                    key={r.download_id}
                    row={r}
                    isReDownloading={reDownloading === r.track_id}
                    onReDownload={() => handleReDownload(r.track_id)}
                    onCopyLink={() => handleCopyLink(r.track_id)}
                  />
                ))}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((r) => (
                <DownloadCardMobile
                  key={r.download_id}
                  row={r}
                  isReDownloading={reDownloading === r.track_id}
                  onReDownload={() => handleReDownload(r.track_id)}
                  onCopyLink={() => handleCopyLink(r.track_id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function DownloadRowDesktop({
  row, isReDownloading, onReDownload, onCopyLink,
}: { row: DownloadRow; isReDownloading: boolean; onReDownload: () => void; onCopyLink: () => void }) {
  const fmt = inferFormat(row);
  const cover = resolveCover(row as any);
  return (
    <div className="grid grid-cols-[1fr_120px_90px_70px_90px_110px_140px] gap-3 px-4 py-2.5 items-center hover:bg-secondary/30 transition-colors">
      <Link to={`/tracks/${row.track_id}`} className="flex items-center gap-3 min-w-0 group">
        <img src={cover} alt="" loading="lazy" className="h-11 w-11 rounded object-cover ring-1 ring-border shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{row.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {row.artist}{row.version && row.version !== "Original" ? ` · ${row.version}` : ""}
          </p>
        </div>
      </Link>
      <div className="text-xs text-muted-foreground truncate">{row.genre || "—"}</div>
      <div className="text-center text-[11px] font-mono tabular-nums">
        <span className="text-foreground/90">{row.bpm ?? "—"}</span>
        {row.musical_key && <span className="text-accent ml-1">{row.musical_key}</span>}
      </div>
      <div className="text-center">
        <Badge variant="outline" className="text-[10px] font-mono">{fmt}</Badge>
      </div>
      <div className="text-right text-xs text-muted-foreground tabular-nums">{formatSize(row.file_size_bytes)}</div>
      <div className="text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {formatDistanceToNow(new Date(row.downloaded_at), { addSuffix: true, locale: fr })}
        </p>
        <p className="text-[10px] text-muted-foreground/60">{format(new Date(row.downloaded_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopyLink} title="Copier le lien">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
          onClick={onReDownload} disabled={isReDownloading}
        >
          <RotateCcw className={`h-3 w-3 ${isReDownloading ? "animate-spin" : ""}`} />
          Retélécharger
        </Button>
      </div>
    </div>
  );
}

function DownloadCardMobile({
  row, isReDownloading, onReDownload, onCopyLink,
}: { row: DownloadRow; isReDownloading: boolean; onReDownload: () => void; onCopyLink: () => void }) {
  const fmt = inferFormat(row);
  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur-xl p-3">
      <div className="flex items-center gap-3">
        <Link to={`/tracks/${row.track_id}`} className="shrink-0">
          <img src={resolveCover(row as any)} alt="" loading="lazy" className="h-14 w-14 rounded object-cover ring-1 ring-border" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/tracks/${row.track_id}`}>
            <p className="text-sm font-semibold truncate">{row.title}</p>
          </Link>
          <p className="text-xs text-muted-foreground truncate">{row.artist}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px] text-muted-foreground/90 font-mono">
            {row.bpm && <span className="bg-secondary/60 px-1.5 py-0.5 rounded">{row.bpm} BPM</span>}
            {row.musical_key && <span className="text-accent">{row.musical_key}</span>}
            <Badge variant="outline" className="text-[9px] font-mono">{fmt}</Badge>
            <span>{formatSize(row.file_size_bytes)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {formatDistanceToNow(new Date(row.downloaded_at), { addSuffix: true, locale: fr })}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopyLink}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={onReDownload} disabled={isReDownloading}>
            <RotateCcw className={`h-3 w-3 ${isReDownloading ? "animate-spin" : ""}`} />
            Retélécharger
          </Button>
        </div>
      </div>
    </div>
  );
}
