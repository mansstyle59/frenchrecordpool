import { ReactNode } from "react";

type Stat = { icon?: ReactNode; label: string };

interface PageHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  highlight?: ReactNode;
  description?: ReactNode;
  stats?: Stat[];
  children?: ReactNode;
}

export default function PageHero({ eyebrow, title, highlight, description, stats, children }: PageHeroProps) {
  return (
    <section className="relative border-b border-border/50 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
      <div className="relative container py-10 md:py-14">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {eyebrow}
          </span>
        )}
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mt-4">
          {title} {highlight && <span className="gradient-text">{highlight}</span>}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-2xl">{description}</p>
        )}
        {stats && stats.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-xs text-muted-foreground font-mono">
            {stats.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
