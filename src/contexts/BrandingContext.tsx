import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Branding {
  id: string;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  font_display: string;
  font_body: string;
  radius: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  footer_text: string | null;
  light_background: string;
  light_foreground: string;
  light_primary: string;
  light_accent: string;
  light_card: string;
  light_muted: string;
  light_border: string;
  dark_background: string;
  dark_foreground: string;
  dark_primary: string;
  dark_accent: string;
  dark_card: string;
  dark_muted: string;
  dark_border: string;
}

interface Ctx {
  branding: Branding | null;
  loading: boolean;
  refresh: () => Promise<void>;
  applyPreview: (b: Partial<Branding>) => void;
}

const BrandingContext = createContext<Ctx>({ branding: null, loading: true, refresh: async () => {}, applyPreview: () => {} });

const FONTS_LOADED = new Set<string>();
function loadGoogleFont(family: string) {
  if (!family || FONTS_LOADED.has(family)) return;
  FONTS_LOADED.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function applyBrandingToDom(b: Branding) {
  // Clean any legacy inline vars that would override the dark class (previous bug)
  const root = document.documentElement;
  ["--background","--foreground","--primary","--ring","--accent","--card","--popover","--muted","--secondary","--border","--input","--radius"].forEach((k) => root.style.removeProperty(k));

  // Inject a single style block with both :root (light) and .dark themes so the cascade works.
  let themeStyle = document.getElementById("branding-theme-vars") as HTMLStyleElement | null;
  if (!themeStyle) {
    themeStyle = document.createElement("style");
    themeStyle.id = "branding-theme-vars";
    document.head.appendChild(themeStyle);
  }
  themeStyle.textContent = `
    :root{
      --background:${b.light_background};
      --foreground:${b.light_foreground};
      --primary:${b.light_primary};
      --ring:${b.light_primary};
      --accent:${b.light_accent};
      --card:${b.light_card};
      --popover:${b.light_card};
      --muted:${b.light_muted};
      --secondary:${b.light_muted};
      --border:${b.light_border};
      --input:${b.light_border};
      --radius:${b.radius};
    }
    .dark{
      --background:${b.dark_background};
      --foreground:${b.dark_foreground};
      --primary:${b.dark_primary};
      --ring:${b.dark_primary};
      --accent:${b.dark_accent};
      --card:${b.dark_card};
      --popover:${b.dark_card};
      --muted:${b.dark_muted};
      --secondary:${b.dark_muted};
      --border:${b.dark_border};
      --input:${b.dark_border};
    }
  `;

  // Fonts
  loadGoogleFont(b.font_display);
  loadGoogleFont(b.font_body);
  let fontStyle = document.getElementById("branding-fonts") as HTMLStyleElement | null;
  if (!fontStyle) {
    fontStyle = document.createElement("style");
    fontStyle.id = "branding-fonts";
    document.head.appendChild(fontStyle);
  }
  fontStyle.textContent = `
    .font-display,h1,h2,h3,h4,h5,h6{font-family:"${b.font_display}",ui-sans-serif,system-ui,sans-serif !important;}
    body,.font-body{font-family:"${b.font_body}",ui-sans-serif,system-ui,sans-serif !important;}
  `;

  // Title + favicon
  if (b.site_name) document.title = b.site_name;
  if (b.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = b.favicon_url;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("site_branding").select("*").eq("id", "global").maybeSingle();
    if (data) {
      setBranding(data as Branding);
      applyBrandingToDom(data as Branding);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("site_branding_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_branding" }, (payload) => {
        if (payload.new) {
          setBranding(payload.new as Branding);
          applyBrandingToDom(payload.new as Branding);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const applyPreview = useCallback((patch: Partial<Branding>) => {
    setBranding((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch } as Branding;
      applyBrandingToDom(merged);
      return merged;
    });
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh, applyPreview }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
