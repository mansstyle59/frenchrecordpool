import { Link } from "react-router-dom";
import { ArrowLeft, Disc3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockSubs = [
  { id: "1", djName: "DJ Laurent", plan: "Premium", status: "active", renewal: "2026-03-15", amount: "29,99 €" },
  { id: "2", djName: "MC Blaze", plan: "Premium", status: "active", renewal: "2026-04-01", amount: "29,99 €" },
  { id: "3", djName: "Soleil Noir", plan: "Basic", status: "expired", renewal: "2026-01-20", amount: "14,99 €" },
  { id: "4", djName: "Funk Mafia", plan: "Premium", status: "active", renewal: "2026-03-28", amount: "29,99 €" },
  { id: "5", djName: "Nina Soulful", plan: "Basic", status: "active", renewal: "2026-04-10", amount: "14,99 €" },
];

export default function AdminSubscriptions() {
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
        <h1 className="font-display text-2xl font-bold mb-6">Gestion des Abonnements</h1>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Renouvellement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{sub.djName}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{sub.plan}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.amount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">
                        {sub.status === "active" ? "Actif" : "Expiré"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(sub.renewal).toLocaleDateString("fr-FR")}</td>
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
