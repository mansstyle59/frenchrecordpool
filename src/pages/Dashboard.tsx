import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, CreditCard, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user, loading, profile, hasActiveSubscription, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading || !user) return <Layout><div className="container py-20 text-center text-muted-foreground">Chargement...</div></Layout>;

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold">Mon Compte</h1>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4 mr-1" /> Déconnexion
          </Button>
        </div>

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
                <Input defaultValue={profile?.dj_name || ""} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={profile?.email || user.email || ""} className="bg-secondary border-border" readOnly />
              </div>
              <Button variant="hero">Enregistrer</Button>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="max-w-lg bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-lg">Abonnement</p>
                  <p className="text-sm text-muted-foreground">Accès au téléchargement du catalogue</p>
                </div>
                <Badge className={hasActiveSubscription ? "bg-primary/20 text-primary border-primary/30" : "bg-destructive/20 text-destructive"}>
                  {hasActiveSubscription ? "Actif" : "Inactif"}
                </Badge>
              </div>
              {!hasActiveSubscription && (
                <p className="text-sm text-muted-foreground">
                  Contactez l'administrateur pour activer votre abonnement.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="downloads">
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-muted-foreground text-sm">Votre historique de téléchargements apparaîtra ici.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
