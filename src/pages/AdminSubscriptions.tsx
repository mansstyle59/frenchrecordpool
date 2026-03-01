import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Disc3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSubscriptions() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*, profiles!subscriptions_user_id_fkey(dj_name, email)");
      return data ?? [];
    },
    enabled: isAdmin,
  });

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
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Fin période</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun abonnement.</td></tr>
                ) : subs.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{sub.profiles?.dj_name || sub.profiles?.email || "-"}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{sub.plan}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">
                        {sub.status === "active" ? "Actif" : "Expiré"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("fr-FR") : "-"}
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
