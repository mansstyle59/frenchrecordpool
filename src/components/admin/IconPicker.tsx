import { useState, useMemo } from "react";
import {
  Download, Music, Music2, Play, Pause, ListMusic, Mic2, Volume2, Volume1, VolumeX,
  Star, Headphones, Sparkles, Radio, Disc, Disc3, DiscAlbum, Mail, Clock, Check, CheckCircle, CheckCircle2,
  Heart, TrendingUp, BarChart3, Globe, Lock, Unlock, User, Users, Calendar, Tag, Search, Filter,
  Settings, Bell, MessageCircle, Share2, Link, ExternalLink, FileAudio, Video, Camera, Image as ImageIcon,
  Layers, LayoutGrid, Columns3, LayoutTemplate, Monitor, Smartphone, Wifi, Award, Crown, ThumbsUp, Eye,
  Shield, ShieldCheck, Zap, AlertCircle, Info, HelpCircle, Minus, Plus, ArrowRight, ArrowLeft,
  X, Trash2, Pencil, Copy, Save, RefreshCw, SlidersHorizontal, Hash, Bookmark, Flag, MapPin,
  Phone, ShoppingCart, CreditCard, Truck, Package, Gift, Percent, DollarSign, Euro, ArrowUpRight,
  Briefcase, Building2, Headset, Keyboard, MousePointerClick, Palette, Wand2, Code2, Terminal,
  Fingerprint, ScanFace, Cloud, CloudDownload, Database, Server, HardDrive, Cpu, WifiOff,
  Globe2, Landmark, Megaphone, Newspaper, Tv, Film, Clapperboard, CirclePlay, Aperture, Sun,
  Moon, Flame, Snowflake, Leaf, TreePine, Mountain, Anchor, Compass, Anchor as AnchorIcon,
  Sailboat, Ship, Plane, Car, Bike, Bus, TrainFront, Ticket, Map, Pin, Navigation,
  BookOpen, BookMarked, Library, GraduationCap, School, PenTool, Ruler, Calculator,
  Scissors, Paintbrush, PencilRuler, Drum, Guitar, Piano, Mic, Headset as HeadsetIcon,
  Speaker, SpeakerIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const ICONS: Record<string, LucideIcon> = {
  Download, Music, Music2, Play, Pause, ListMusic, Mic2, Volume2, Volume1, VolumeX,
  Star, Headphones, Sparkles, Radio, Disc, Disc3, DiscAlbum, Mail, Clock, Check, CheckCircle, CheckCircle2,
  Heart, TrendingUp, BarChart3, Globe, Lock, Unlock, User, Users, Calendar, Tag, Search, Filter,
  Settings, Bell, MessageCircle, Share2, Link, ExternalLink, FileAudio, Video, Camera, ImageIcon,
  Layers, LayoutGrid, Columns3, LayoutTemplate, Monitor, Smartphone, Wifi, Award, Crown, ThumbsUp, Eye,
  Shield, ShieldCheck, Zap, AlertCircle, Info, HelpCircle, Minus, Plus, ArrowRight, ArrowLeft,
  X, Trash2, Pencil, Copy, Save, RefreshCw, SlidersHorizontal, Hash, Bookmark, Flag, MapPin,
  Phone, ShoppingCart, CreditCard, Truck, Package, Gift, Percent, DollarSign, Euro, ArrowUpRight,
  Briefcase, Building2, Headset, Keyboard, MousePointerClick, Palette, Wand2, Code2, Terminal,
  Fingerprint, ScanFace, Cloud, CloudDownload, Database, Server, HardDrive, Cpu, WifiOff,
  Globe2, Landmark, Megaphone, Newspaper, Tv, Film, Clapperboard, CirclePlay, Aperture, Sun,
  Moon, Flame, Snowflake, Leaf, TreePine, Mountain, Anchor, Compass, Sailboat, Ship, Plane,
  Car, Bike, Bus, TrainFront, Ticket, Map, Pin, Navigation, BookOpen, BookMarked, Library,
  GraduationCap, School, PenTool, Ruler, Calculator, Scissors, Paintbrush, PencilRuler, Drum,
  Guitar, Piano, Mic, Speaker,
};

const ICON_NAMES = Object.keys(ICONS);

interface IconPickerProps {
  value?: string;
  onChange: (name: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  const SelectedIcon = value ? (ICONS[value] || Icons.Star) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between gap-2">
          {SelectedIcon ? (
            <span className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4" />
              <span className="text-sm">{value}</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">Choisir une icône…</span>
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Rechercher une icône…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-64 p-2">
          {filtered.length === 1 ? (
            <div className="flex justify-center items-center h-full text-sm text-muted-foreground">
              Aucune icône trouvée
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-1">
              {filtered.map((name) => {
                const Icon = ICONS[name];
                const isActive = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex items-center justify-center rounded-md p-2 transition hover:bg-accent ${
                      isActive ? "bg-primary/15 ring-1 ring-primary" : ""
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="px-2 py-1.5 border-t border-border text-[10px] text-muted-foreground text-center">
          {filtered.length} icône{filtered.length > 1 ? "s" : ""}
        </div>
      </PopoverContent>
    </Popover>
  );
}
