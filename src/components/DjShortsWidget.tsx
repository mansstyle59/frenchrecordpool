import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, ArrowRight, Disc3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { youtubeThumb } from "@/lib/youtube";

interface Props {
  config?: { title?: string; limit?: number; see_all_url?: string };
}

export default function DjShortsWidget({ config = {} }: Props) {
  const { title = "Shorts DJ", limit = 8, see_all_url = "/shorts" } = config;

  const { data: shorts = [] } = useQuery({
    queryKey: ["widget-dj-shorts", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("dj_shorts")
        .select("id,title,youtube_id,thumbnail_url")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .limit(limit);
      return data ?? [];
    },
  });

  if (!shorts.length) return null;

  return (
    <section className="container">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
            <Disc3 className="h-3 w-3" /> Mode short
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-black">{title}</h2>
        </div>
        <Link to={see_all_url}>
          <Button size="sm" variant="ghost" className="gap-1">
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-3 w-max pb-2">
          {shorts.map((s: any) => (
            <Link
              key={s.id}
              to={see_all_url}
              className="group relative w-40 sm:w-44 shrink-0 rounded-2xl overflow-hidden border border-border bg-card aspect-[9/16]"
            >
              <img
                src={s.thumbnail_url || youtubeThumb(s.youtube_id)}
                alt={s.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </div>
              <p className="absolute bottom-2 inset-x-2 text-xs font-bold text-white line-clamp-2">
                {s.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
