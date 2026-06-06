import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

/**
 * Shared building blocks for the `right` slot of WidgetHeader so every widget
 * exposes its filters & actions with the same height, radius and alignment.
 *
 * Reference height for any control: h-8 (32px) — matches the small ghost CTA
 * used for "Tout voir" in WidgetHeader, keeping the editorial baseline.
 */

export function HeaderActions({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 flex-wrap h-8">
      {children}
    </div>
  );
}

interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
}

export function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center h-8 rounded-full border border-border bg-card/60 p-0.5"
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`px-3 h-7 text-[11px] font-bold uppercase tracking-wider rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface ActionPillProps {
  icon?: LucideIcon;
  onClick?: () => void;
  children: ReactNode;
  tone?: "default" | "danger";
  ariaLabel?: string;
}

export function ActionPill({
  icon: Icon, onClick, children, tone = "default", ariaLabel,
}: ActionPillProps) {
  const toneCls =
    tone === "danger"
      ? "text-muted-foreground hover:text-destructive hover:border-destructive/40"
      : "text-muted-foreground hover:text-foreground hover:border-foreground/30";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card/60 text-[11px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${toneCls}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
