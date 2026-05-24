import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { titleStyle } from "@/lib/widgetTypography";

interface Props {
  icon?: LucideIcon;
  title: string;
  eyebrow?: string;
  seeAllUrl?: string;
  seeAllLabel?: string;
  typo?: any;
  right?: ReactNode;
  preview?: boolean;
}

/**
 * Shared header used by all home widgets to keep visual coherence:
 * - vertical gradient bar (primary → accent)
 * - optional icon + eyebrow
 * - Bebas-style display title
 * - right slot for tabs / filters
 * - optional "Tout voir" CTA
 */
export default function WidgetHeader({
  icon: Icon, title, eyebrow, seeAllUrl, seeAllLabel = "Tout voir", typo, right, preview,
}: Props) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary to-accent shrink-0" />
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-0.5">
              {eyebrow}
            </div>
          )}
          <h2
            className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 truncate leading-none"
            style={titleStyle(typo)}
          >
            {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
            {title}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {right}
        {seeAllUrl && !preview && (
          <Button asChild variant="ghost" size="sm">
            <Link to={seeAllUrl}>
              {seeAllLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
