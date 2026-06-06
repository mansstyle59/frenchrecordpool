import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { titleStyle, bodyStyle, eyebrowStyle, accentBarStyle } from "@/lib/widgetTypography";

interface Props {
  icon?: LucideIcon;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  seeAllUrl?: string;
  seeAllLabel?: string;
  typo?: any;
  right?: ReactNode;
  preview?: boolean;
}

/**
 * Shared editorial header for home widgets — fully admin-themable via `typo`.
 * Visual language: massive Bebas heading, accent bar, eyebrow chip, dashed rule
 * underneath that separates header from content (magazine cue).
 */
export default function WidgetHeader({
  icon: Icon, title, eyebrow, subtitle, seeAllUrl, seeAllLabel = "Tout voir", typo = {}, right, preview,
}: Props) {
  const eyebrowText = typo.eyebrow_text ?? eyebrow;
  const showEyebrow = !typo.eyebrow_hidden && eyebrowText;
  const align = typo.align ?? "left";
  const alignWrap =
    align === "center" ? "items-center text-center mx-auto" :
    align === "right"  ? "items-end text-right ml-auto" :
    "items-start text-left";

  return (
    <header className="mb-6 md:mb-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-stretch gap-4 min-w-0 flex-1">
          {!typo.accent_hidden && (
            <div
              className="w-[3px] self-stretch rounded-full bg-gradient-to-b from-primary via-primary to-accent shrink-0 shadow-[0_0_14px_hsl(var(--primary)/0.45)]"
              style={accentBarStyle(typo)}
              aria-hidden
            />
          )}
          <div className={`min-w-0 flex flex-col gap-1.5 ${alignWrap}`}>
            {showEyebrow && (
              <div
                className="inline-flex items-center gap-2 self-start text-[10px] uppercase tracking-[0.28em] text-foreground/60 font-mono"
                style={eyebrowStyle(typo)}
              >
                <span className="h-1 w-1 rounded-full bg-accent animate-pulse" />
                {eyebrowText}
              </div>
            )}
            <h2
              className="font-display text-3xl md:text-5xl font-bold flex items-center gap-3 leading-[0.95] tracking-tight"
              style={titleStyle(typo)}
            >
              {Icon && !typo.title_gradient && <Icon className="h-7 w-7 md:h-9 md:w-9 text-accent shrink-0" />}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && (
              <p
                className="text-sm md:text-base text-muted-foreground max-w-2xl mt-1"
                style={bodyStyle(typo)}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0 min-h-8">
          {right}
          {seeAllUrl && !preview && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="group/cta h-8 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground hover:text-accent hover:bg-transparent"
            >
              <Link to={seeAllUrl}>
                {seeAllLabel}
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Editorial divider */}
      <div className="relative mt-5">
        <div className="h-px w-full bg-foreground/10" />
        <div className="absolute left-0 top-0 h-px w-16 bg-accent" />
      </div>
    </header>
  );
}
