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
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="relative container py-10 md:py-16 prose-stack">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 t-eyebrow text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {eyebrow}
          </span>
        )}
        <h1 className="t-h1 font-bold tracking-tight">
          {title} {highlight && <span className="gradient-text">{highlight}</span>}
        </h1>
        {description && (
          <p className="t-lead text-muted-foreground max-w-2xl">{description}</p>
        )}
        {stats && stats.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 t-mono text-muted-foreground">
            {stats.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>
        )}
        {children && <div>{children}</div>}
      </div>
    </section>
  );
}
