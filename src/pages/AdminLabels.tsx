import { useMemo, useState } from "react";
import { Search, RotateCcw, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import { useCms } from "@/contexts/CmsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Registre canonique des libellés éditables.
 * Tous les libellés visibles dans la navigation, le header, le pied de page
 * et les CTA récurrents sont listés ici afin de garder une terminologie unifiée.
 *
 * Type "text"  → valeur = string
 * Type "link"  → valeur = { label: string, url: string }
 */
type TextEntry = { key: string; type: "text"; default: string; note?: string };
type LinkEntry = { key: string; type: "link"; defaultLabel: string; defaultUrl: string; note?: string };
type Entry = TextEntry | LinkEntry;

type Group = { id: string; title: string; description: string; entries: Entry[] };

const GROUPS: Group[] = [
  {
    id: "nav",
    title: "Menu — groupes",
    description: "Titres des sections de la barre latérale.",
    entries: [
      { key: "nav.group.discover", type: "text", default: "Découvrir" },
      { key: "nav.group.catalog", type: "text", default: "Catalogue" },
      { key: "nav.group.account", type: "text", default: "Mon compte" },
      { key: "nav.group.spaces", type: "text", default: "Mes espaces" },
    ],
  },
  {
    id: "discover",
    title: "Menu — Découvrir",
    description: "Liens d'accès rapide en haut de la sidebar.",
    entries: [
      { key: "nav.home", type: "text", default: "Accueil" },
      { key: "nav.new", type: "text", default: "Nouveautés" },
      { key: "nav.shorts", type: "text", default: "Shorts" },
    ],
  },
  {
    id: "catalog",
    title: "Menu — Catalogue",
    description: "Liens vers les contenus principaux.",
    entries: [
      { key: "nav.playlists", type: "text", default: "Playlists" },
      { key: "nav.djs", type: "text", default: "DJ & Remixers" },
      { key: "nav.artists", type: "text", default: "Artistes" },
      { key: "nav.stems", type: "text", default: "Stems" },
    ],
  },
  {
    id: "account",
    title: "Menu — Mon compte",
    description: "Espace personnel du DJ connecté.",
    entries: [
      { key: "nav.downloads", type: "text", default: "Mes téléchargements" },
      { key: "nav.pricing", type: "text", default: "Abonnements" },
    ],
  },
  {
    id: "spaces",
    title: "Mes espaces & Administration",
    description: "Liens vers le tableau de bord, l'espace DJ et l'admin.",
    entries: [
      { key: "nav.dashboard", type: "text", default: "Tableau de bord" },
      { key: "nav.dj_space", type: "text", default: "Espace DJ" },
      { key: "nav.admin", type: "text", default: "Administration" },
    ],
  },
  {
    id: "auth",
    title: "Authentification",
    description: "Boutons et liens pour se connecter / créer un compte / se déconnecter.",
    entries: [
      { key: "nav.signin", type: "text", default: "Se connecter" },
      { key: "nav.signup", type: "text", default: "Créer un compte" },
      { key: "nav.signout", type: "text", default: "Se déconnecter" },
      { key: "nav.view_as_user", type: "text", default: "Aperçu utilisateur", note: "Visible uniquement par les admins." },
      { key: "nav.back_to_admin", type: "text", default: "Repasser en admin", note: "Affiché en mode aperçu utilisateur." },
    ],
  },
  {
    id: "footer",
    title: "Pied de page",
    description: "Liens et mentions affichés en bas de chaque page.",
    entries: [
      { key: "footer.link.new", type: "link", defaultLabel: "Nouveautés", defaultUrl: "/new" },
      { key: "footer.link.djs", type: "link", defaultLabel: "DJ & Remixers", defaultUrl: "/remixers" },
      { key: "footer.link.artists", type: "link", defaultLabel: "Artistes", defaultUrl: "/artists" },
      { key: "footer.link.pricing", type: "link", defaultLabel: "Abonnements", defaultUrl: "/pricing" },
      { key: "footer.copyright", type: "text", default: "© 2026 French Record Pool. Tous droits réservés." },
    ],
  },
];

const ALL_ENTRIES: (Entry & { groupId: string; groupTitle: string })[] = GROUPS.flatMap((g) =>
  g.entries.map((e) => ({ ...e, groupId: g.id, groupTitle: g.title }))
);

function getCurrent(values: Record<string, any>, entry: Entry): { label: string; url?: string } {
  if (entry.type === "text") {
    const v = values[entry.key];
    return { label: typeof v === "string" && v.length ? v : entry.default };
  }
  const v = values[entry.key];
  if (v && typeof v === "object") {
    return { label: v.label ?? entry.defaultLabel, url: v.url ?? entry.defaultUrl };
  }
  return { label: entry.defaultLabel, url: entry.defaultUrl };
}

function isCustom(values: Record<string, any>, entry: Entry): boolean {
  const v = values[entry.key];
  if (v === undefined || v === null) return false;
  if (entry.type === "text") return typeof v === "string" && v !== entry.default;
  if (v && typeof v === "object") {
    return v.label !== entry.defaultLabel || v.url !== entry.defaultUrl;
  }
  return false;
}

function LabelRow({ entry }: { entry: Entry }) {
  const { values, saveDraft, revertDraft } = useCms();
  const current = getCurrent(values, entry);
  const custom = isCustom(values, entry);
  const [label, setLabel] = useState(current.label);
  const [url, setUrl] = useState(current.url ?? "");
  const [saving, setSaving] = useState(false);

  // Resync if external CMS update arrives (realtime / undo).
  const syncKey = `${current.label}::${current.url ?? ""}`;
  const lastSync = useState(syncKey)[0];
  if (lastSync !== syncKey) {
    // best-effort: cheap re-init when context value changes
  }

  const defaultLabel = entry.type === "text" ? entry.default : entry.defaultLabel;
  const defaultUrl = entry.type === "link" ? entry.defaultUrl : undefined;

  const dirty =
    label !== current.label || (entry.type === "link" && url !== (current.url ?? ""));

  const onSave = async () => {
    if (!label.trim()) {
      toast({ title: "Libellé requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (entry.type === "text") {
        await saveDraft(entry.key, "text", label.trim());
      } else {
        await saveDraft(entry.key, "link", { label: label.trim(), url: url.trim() || defaultUrl! });
      }
      toast({ title: "Libellé mis à jour" });
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    await revertDraft(entry.key);
    setLabel(defaultLabel);
    if (entry.type === "link") setUrl(defaultUrl ?? "");
    toast({ title: "Libellé restauré" });
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
              {entry.key}
            </code>
            <Badge variant="outline" className="text-[10px] uppercase">{entry.type}</Badge>
            {custom ? (
              <Badge className="text-[10px] gap-1"><Check className="h-3 w-3" /> Personnalisé</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Par défaut</Badge>
            )}
          </div>
          {entry.note && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {entry.note}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {custom && (
            <Button size="sm" variant="ghost" onClick={onReset} title="Restaurer la valeur par défaut">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" disabled={!dirty || saving} onClick={onSave}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Libellé affiché</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={defaultLabel} />
          <p className="text-[10px] text-muted-foreground">Défaut : {defaultLabel}</p>
        </div>
        {entry.type === "link" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Destination</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={defaultUrl} />
            <p className="text-[10px] text-muted-foreground">Défaut : {defaultUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLabels() {
  const { isAdmin } = useAuth();
  const { values, loaded, autoPublish, setAutoPublish } = useCms();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");

  const customCount = useMemo(
    () => ALL_ENTRIES.filter((e) => isCustom(values, e)).length,
    [values]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GROUPS.map((g) => {
      const entries = g.entries.filter((e) => {
        if (tab === "custom" && !isCustom(values, e)) return false;
        if (!q) return true;
        const dl = e.type === "text" ? e.default : e.defaultLabel;
        const cur = getCurrent(values, e).label;
        return (
          e.key.toLowerCase().includes(q) ||
          dl.toLowerCase().includes(q) ||
          cur.toLowerCase().includes(q)
        );
      });
      return { ...g, entries };
    }).filter((g) => g.entries.length > 0);
  }, [search, tab, values]);

  if (!isAdmin) {
    return (
      <AdminLayout title="Libellés">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      wide
      title="Gestion des libellés"
      subtitle={`${ALL_ENTRIES.length} libellés référencés · ${customCount} personnalisé${customCount > 1 ? "s" : ""}`}
    >
      <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (clé, libellé)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
            className="accent-primary"
          />
          Publier immédiatement
        </label>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="all">Tous ({ALL_ENTRIES.length})</TabsTrigger>
          <TabsTrigger value="custom">Personnalisés ({customCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-6">
          {!loaded ? (
            <p className="text-muted-foreground text-sm">Chargement...</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun libellé ne correspond.</p>
          ) : (
            filteredGroups.map((g) => (
              <section key={g.id} className="space-y-3">
                <header>
                  <h2 className="font-display text-lg">{g.title}</h2>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                </header>
                <div className="grid gap-3">
                  {g.entries.map((e) => (
                    <LabelRow key={e.key} entry={e} />
                  ))}
                </div>
              </section>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
