import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Inbox, type LucideIcon } from "lucide-react";

interface Props {
  /** Icon shown in the framed badge (defaults to Inbox). */
  icon?: LucideIcon;
  /** Short bold title — what's empty. */
  title: string;
  /** One-line context explaining why & what to do. */
  message?: string;
  /** Optional CTA. */
  ctaLabel?: string;
  ctaUrl?: string;
  onCta?: () => void;
  /** Inline custom slot under the message (e.g. period switch hint). */
  children?: ReactNode;
}

/**
 * Shared editorial empty-state for HomePage widgets.
 * Visual language: dashed border, framed icon badge, accent corner tag,
 * dot-grid texture — matches EditorialFrame / hero direction.
 */
export default function WidgetEmptyState({
  icon: Icon = Inbox,
  title,
  message,
  ctaLabel,
  ctaUrl,
  onCta,
  children,
}: Props) {
  const cta = ctaLabel && (ctaUrl || onCta) ? (
    ctaUrl ? (
      <Link
        to={ctaUrl}
        className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.2em] hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    ) : (
      <button
        type="button"
        onClick={onCta}
        className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.2em] hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    )
  ) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card/30 px-6 py-12 text-center">
      {/* Dot grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Accent corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 right-3 h-1.5 w-1.5 bg-accent"
      />

      <div className="relative flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl border border-border/60 bg-background/60 backdrop-blur flex items-center justify-center text-foreground/70">
            <Icon className="h-6 w-6" strokeWidth={1.6} />
          </div>
          <span
            aria-hidden
            className="absolute -top-1 -right-1 h-2 w-2 bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.7)]"
          />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="font-display text-xl md:text-2xl tracking-tight">{title}</h3>
          {message && (
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          )}
        </div>
        {children}
        {cta && <div className="pt-2">{cta}</div>}
      </div>
    </div>
  );
}
