import { ReactNode } from "react";

type Stat = {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "primary" | "accent" | "muted";
};

export default function AdminStatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card/40 backdrop-blur-xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            <span>{s.label}</span>
            {s.icon && (
              <span
                className={
                  s.accent === "accent"
                    ? "text-accent"
                    : s.accent === "muted"
                    ? "text-muted-foreground"
                    : "text-primary"
                }
              >
                {s.icon}
              </span>
            )}
          </div>
          <div className="mt-2 font-display text-2xl font-bold tracking-tight">{s.value}</div>
          {s.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}
