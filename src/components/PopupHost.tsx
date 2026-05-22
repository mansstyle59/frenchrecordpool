import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface Popup {
  id: string;
  name: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  bg_color: string;
  text_color: string;
  accent_color: string;
  layout: string;
  trigger_type: string;
  trigger_value: number;
  frequency: string;
  audience: string;
  devices: string;
  pages: string[];
  priority: number;
}

const SEEN_KEY = "frp:popup:seen";

function getSeen(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}
function markSeen(id: string, frequency: string) {
  const seen = getSeen();
  seen[id] = Date.now();
  sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  if (frequency === "once") {
    localStorage.setItem(`${SEEN_KEY}:${id}`, "1");
  }
}
function alreadySeen(id: string, frequency: string) {
  if (frequency === "always") return false;
  if (frequency === "once" && localStorage.getItem(`${SEEN_KEY}:${id}`)) return true;
  if (frequency === "session" && getSeen()[id]) return true;
  return false;
}

function isMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
}

export default function PopupHost() {
  const { user, hasActiveSubscription } = useAuth();
  const { pathname } = useLocation();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [active, setActive] = useState<Popup | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    (supabase as any)
      .from("popups")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .then(({ data }: any) => {
        if (!cancelled && data) setPopups(data as Popup[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const eligible = useMemo(() => {
    const mobile = isMobile();
    return popups.filter((p) => {
      if (dismissed.has(p.id)) return false;
      if (alreadySeen(p.id, p.frequency)) return false;
      if (p.devices === "desktop" && mobile) return false;
      if (p.devices === "mobile" && !mobile) return false;
      if (p.audience === "guests" && user) return false;
      if (p.audience === "subscribers" && !hasActiveSubscription) return false;
      if (p.audience === "users" && !user) return false;
      if (p.pages?.length > 0 && !p.pages.some((pg) => pathname === pg || pathname.startsWith(pg))) {
        return false;
      }
      return true;
    });
  }, [popups, user, hasActiveSubscription, pathname]);

  useEffect(() => {
    if (active || eligible.length === 0) return;
    const next = eligible[0];
    const timers: Array<() => void> = [];

    const show = () => setActive(next);

    if (next.trigger_type === "load") {
      const t = setTimeout(show, 200);
      timers.push(() => clearTimeout(t));
    } else if (next.trigger_type === "delay") {
      const t = setTimeout(show, Math.max(0, next.trigger_value) * 1000);
      timers.push(() => clearTimeout(t));
    } else if (next.trigger_type === "scroll") {
      const onScroll = () => {
        const pct = (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100;
        if (pct >= next.trigger_value) {
          show();
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      timers.push(() => window.removeEventListener("scroll", onScroll));
    } else if (next.trigger_type === "exit") {
      const onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          show();
          document.removeEventListener("mouseleave", onLeave);
        }
      };
      document.addEventListener("mouseleave", onLeave);
      timers.push(() => document.removeEventListener("mouseleave", onLeave));
    }

    return () => timers.forEach((fn) => fn());
  }, [eligible, active]);

  const close = () => {
    if (active) markSeen(active.id, active.frequency);
    setActive(null);
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              background: `hsl(${active.bg_color})`,
              color: `hsl(${active.text_color})`,
              borderColor: `hsl(${active.accent_color} / 0.4)`,
            }}
          >
            <button
              onClick={close}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-black/30 hover:bg-black/50 text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
            {active.image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden">
                <img src={active.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-6 space-y-3">
              {active.title && (
                <h2 className="text-2xl font-display font-bold leading-tight">{active.title}</h2>
              )}
              {active.body && (
                <p className="text-sm opacity-90 whitespace-pre-wrap">{active.body}</p>
              )}
              {active.cta_label && active.cta_url && (
                <Button
                  asChild
                  className="w-full mt-2"
                  style={{
                    background: `hsl(${active.accent_color})`,
                    color: `hsl(${active.text_color})`,
                  }}
                >
                  <a
                    href={active.cta_url}
                    target={active.cta_url.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={() => markSeen(active.id, active.frequency)}
                  >
                    {active.cta_label}
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
