import { User, CreditCard, Download, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import TrackRow from "@/components/TrackRow";
import { mockTracks } from "@/data/mockTracks";

const recentDownloads = mockTracks.slice(0, 4);

export default function Dashboard() {
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Mon Compte</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="profile" className="gap-1"><User className="h-4 w-4" /> Profil</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1"><CreditCard className="h-4 w-4" /> Abonnement</TabsTrigger>
            <TabsTrigger value="downloads" className="gap-1"><Download className="h-4 w-4" /> Téléchargements</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="max-w-lg space-y-4 bg-card border border-border rounded-xl p-6">
              <div className="space-y-2">
                <Label>Nom DJ</Label>
                <Input defaultValue="DJ Demo" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue="demo@frenchrecordpool.com" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input type="password" placeholder="••••••••" className="bg-secondary border-border" />
              </div>
              <Button variant="hero">Enregistrer</Button>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="max-w-lg bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-lg">Plan Premium</p>
                  <p className="text-sm text-muted-foreground">Accès illimité au catalogue</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">Actif</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Prochain renouvellement : 15 mars 2026</p>
                <p>29,99 €/mois</p>
              </div>
              <Button variant="outline">Gérer l'abonnement</Button>
            </div>
          </TabsContent>

          <TabsContent value="downloads">
            <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
              {recentDownloads.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{recentDownloads.length} téléchargement(s) récent(s)</p>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
