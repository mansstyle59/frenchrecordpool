import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Disc3, Play, Headphones, Download, Layers, ListMusic, Mic2,
  Sparkles, Smartphone, Tablet, Monitor, ArrowRight, Music2, Radio,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CmsText from "@/components/cms/CmsText";

/* Mini equalizer décoratif inspiré Fuvi (waveform animée CSS) */
function Equalizer({ bars = 24 }: { bars?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-10 select-none" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] bg-gradient-to-t from-primary via-primary to-accent rounded-full"
          style={{
            height: `${30 + ((i * 37) % 70)}%`,
            animation: `eq-bounce 1.2s ease-in-out ${(i * 80) % 1200}ms infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes eq-bounce { from { transform: scaleY(0.4);} to { transform: scaleY(1);} }`}</style>
    </div>
  );
}

const FEATURES = [
  { icon: Layers, key: "landing.feat.stems.title", title: "Stems exclusifs",
    desc: "Acapellas, instrumentaux et stems prêts à mixer pour libérer votre créativité.",
    descKey: "landing.feat.stems.desc" },
  { icon: Music2, key: "landing.feat.extended.title", title: "Extended & Remix",
    desc: "Des milliers de versions extended et remixes pensés pour la piste.",
    descKey: "landing.feat.extended.desc" },
  { icon: ListMusic, key: "landing.feat.packs.title", title: "Packs & Playlists",
    desc: "Sélections éditoriales mises à jour chaque semaine par notre équipe.",
    descKey: "landing.feat.packs.desc" },
];

const TAGS = ["Moods", "Camelot wheel", "WAV / MP3", "BPM", "Waveform", "Top DJ Charts ©", "Stems", "Shorts"];

export default function PublicLanding() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    navigate(trimmed ? `/signup?email=${encodeURIComponent(trimmed)}` : "/signup");
  };

  return (
    <Layout>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        {/* Decorative gradients */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-accent/20 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--background))_0%,transparent_70%)]" />
        </div>

        <div className="container py-20 sm:py-28 lg:py-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-8 ring-1 ring-primary/30"
          >
            <Sparkles className="h-3 w-3" />
            <CmsText editKey="landing.eyebrow">Pool DJ français · Premium</CmsText>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[0.9] mb-6 max-w-5xl mx-auto"
          >
            <CmsText editKey="landing.hero.line1">Des milliers d'extended,</CmsText>{" "}
            <span className="gradient-text">
              <CmsText editKey="landing.hero.line2">remixes & stems</CmsText>
            </span>
            <br />
            <CmsText editKey="landing.hero.line3">pour les DJs.</CmsText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="t-lead text-muted-foreground max-w-2xl mx-auto mb-12"
          >
            <CmsText editKey="landing.hero.sub">
              Abonnez-vous dès maintenant. Annulez à tout moment.
            </CmsText>
          </motion.p>

          {/* Email capture card */}
          <motion.form
            onSubmit={handleStart}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="relative max-w-xl mx-auto"
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent opacity-60 blur-md" aria-hidden />
            <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl border-2 border-primary/40 p-6 sm:p-8 shadow-2xl">
              <p className="text-sm font-semibold text-primary mb-1">
                <CmsText editKey="landing.cta.title">Prêt à rejoindre French Record Pool ?</CmsText>
              </p>
              <p className="text-xs text-muted-foreground mb-5">
                <CmsText editKey="landing.cta.sub">
                  Saisissez votre adresse e-mail pour créer votre compte DJ.
                </CmsText>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="h-12 text-base bg-background/80 border-border focus-visible:ring-primary"
                  aria-label="Adresse e-mail"
                />
                <Button type="submit" size="lg" variant="hero" className="h-12 px-6 gap-2 shrink-0">
                  <CmsText editKey="landing.cta.button">Commencer</CmsText>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.form>

          {/* Waveform décoratif */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-16 flex justify-center"
          >
            <Equalizer bars={32} />
          </motion.div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section className="container py-20 sm:py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 mb-6 ring-1 ring-primary/30">
            <Disc3 className="h-8 w-8 text-primary animate-pulse-glow" />
          </div>
          <h2 className="t-h2 font-display font-black mb-4">
            <CmsText editKey="landing.features.title">
              Profitez pleinement de tous les services
            </CmsText>
          </h2>
          <p className="t-lead text-muted-foreground max-w-2xl mx-auto">
            <CmsText editKey="landing.features.sub">
              Des centaines de nouveaux morceaux ajoutés chaque mois, sélectionnés par notre équipe éditoriale.
            </CmsText>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-2xl bg-card border border-border p-8 hover:border-primary/50 hover:shadow-glow transition-all"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground mb-6 group-hover:scale-110 transition-transform">
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">
                <CmsText editKey={f.key}>{f.title}</CmsText>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                <CmsText editKey={f.descKey}>{f.desc}</CmsText>
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── TAGS RIBBON ───────── */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-10">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border text-sm font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Radio className="h-3 w-3 text-accent" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── MULTI-DEVICE ───────── */}
      <section className="container py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider mb-6">
              <Headphones className="h-3 w-3" />
              <CmsText editKey="landing.devices.eyebrow">Partout avec vous</CmsText>
            </div>
            <h2 className="t-h2 font-display font-black mb-6">
              <CmsText editKey="landing.devices.title">Où que vous soyez</CmsText>
            </h2>
            <p className="t-lead text-muted-foreground mb-8">
              <CmsText editKey="landing.devices.desc">
                Téléchargez vos MP3 et WAV sur smartphone, tablette et ordinateur.
                Lecture en streaming pour prévisualiser, téléchargement sans DRM pour mixer.
              </CmsText>
            </p>
            <div className="flex flex-wrap gap-6 text-muted-foreground">
              <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> Mobile</div>
              <div className="flex items-center gap-2"><Tablet className="h-5 w-5 text-primary" /> Tablette</div>
              <div className="flex items-center gap-2"><Monitor className="h-5 w-5 text-primary" /> Desktop</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative aspect-square max-w-md mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl rounded-full" aria-hidden />
            <div className="relative h-full w-full rounded-3xl bg-card border-2 border-border flex items-center justify-center p-12">
              <Disc3 className="h-full w-full text-primary opacity-90 animate-[spin_8s_linear_infinite]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-12 sm:p-16 text-center">
          <div aria-hidden className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white_0%,transparent_50%)]" />
          </div>
          <div className="relative">
            <h2 className="t-h2 font-display font-black text-primary-foreground mb-4">
              <CmsText editKey="landing.final.title">Lancez votre premier set</CmsText>
            </h2>
            <p className="text-primary-foreground/90 text-lg mb-8 max-w-xl mx-auto">
              <CmsText editKey="landing.final.sub">
                Rejoignez la communauté des DJs francophones et accédez à toute la bibliothèque.
              </CmsText>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" variant="secondary" className="gap-2 h-12 px-8">
                <a href="/signup">
                  <Play className="h-4 w-4 fill-current" />
                  <CmsText editKey="landing.final.cta_primary">Créer un compte</CmsText>
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 h-12 px-8 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <a href="/pricing">
                  <Download className="h-4 w-4" />
                  <CmsText editKey="landing.final.cta_secondary">Voir les abonnements</CmsText>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
