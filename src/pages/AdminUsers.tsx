import { Link } from "react-router-dom";
import { ArrowLeft, Disc3, Shield, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockUsers = [
  { id: "1", djName: "DJ Laurent", email: "laurent@example.com", role: "client", status: "active", plan: "Premium", joined: "2025-11-01" },
  { id: "2", djName: "MC Blaze", email: "blaze@example.com", role: "client", status: "active", plan: "Premium", joined: "2025-12-15" },
  { id: "3", djName: "Soleil Noir", email: "soleil@example.com", role: "client", status: "expired", plan: "Basic", joined: "2025-09-20" },
  { id: "4", djName: "Funk Mafia", email: "funk@example.com", role: "client", status: "active", plan: "Premium", joined: "2026-01-03" },
  { id: "5", djName: "Nina Soulful", email: "nina@example.com", role: "client", status: "active", plan: "Basic", joined: "2026-01-20" },
];

export default function AdminUsers() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">Admin</span>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="font-display text-2xl font-bold mb-6">Gestion des Utilisateurs</h1>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Nom DJ</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{user.djName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{user.plan}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                        {user.status === "active" ? "Actif" : "Expiré"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(user.joined).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Changer rôle"><Shield className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Désactiver"><UserX className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
