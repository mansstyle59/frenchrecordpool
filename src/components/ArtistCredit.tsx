import { Link } from "react-router-dom";
import { slugify } from "@/lib/slug";

interface ArtistCreditProps {
  name?: string | null;
  artistId?: string | null;
  artistSlug?: string | null;
  className?: string;
  /** Render text only (no link), useful when no resolvable target. */
  plainIfUnknown?: boolean;
}

/**
 * Clickable artist credit. Prefers an explicit slug, falls back to slugified
 * name. Routes to /artists/:slug (unified profile page).
 */
export default function ArtistCredit({
  name,
  artistSlug,
  className,
  plainIfUnknown = false,
}: ArtistCreditProps) {
  const display = (name ?? "").trim();
  if (!display) return null;
  const slug = (artistSlug || slugify(display)).trim();
  if (!slug || plainIfUnknown) {
    return <span className={className}>{display}</span>;
  }
  return (
    <Link
      to={`/artists/${slug}`}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={className ?? "hover:text-primary transition-colors"}
    >
      {display}
    </Link>
  );
}
