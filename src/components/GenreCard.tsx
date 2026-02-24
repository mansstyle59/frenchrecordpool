import { Link } from "react-router-dom";

interface GenreCardProps {
  genre: string;
  trackCount: number;
}

const genreGradients: Record<string, string> = {
  "House": "from-primary/30 to-primary/5",
  "Tech House": "from-primary/40 to-secondary",
  "Deep House": "from-blue-900/40 to-secondary",
  "Afro House": "from-orange-900/30 to-secondary",
  "Hip-Hop": "from-red-900/30 to-secondary",
  "R&B": "from-purple-900/30 to-secondary",
  "Dancehall": "from-green-900/30 to-secondary",
  "Amapiano": "from-yellow-900/30 to-secondary",
  "Disco/Funk": "from-pink-900/30 to-secondary",
  "Electro": "from-cyan-900/30 to-secondary",
  "Drum & Bass": "from-slate-700/30 to-secondary",
  "Reggaeton": "from-rose-900/30 to-secondary",
};

export default function GenreCard({ genre, trackCount }: GenreCardProps) {
  const gradient = genreGradients[genre] || "from-primary/20 to-secondary";

  return (
    <Link
      to={`/genres?g=${encodeURIComponent(genre)}`}
      className={`block rounded-xl bg-gradient-to-br ${gradient} border border-border p-5 hover:border-primary/40 hover:glow-primary transition-all group`}
    >
      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
        {genre}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">{trackCount} tracks</p>
    </Link>
  );
}
