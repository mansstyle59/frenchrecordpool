import { Link } from "react-router-dom";
import { BarChart3, Disc3, Users, Download, Music, Settings } from "lucide-react";
import { mockTracks } from "@/data/mockTracks";

const stats = [
  { label: "Tracks", value: mockTracks.length, icon: Music, color: "text-primary" },
  { label: "Téléchargements", value: "15 234", icon: Download, color: "text-accent" },
  { label: "Clients actifs", value: "847", icon: Users, color: "text-green-400" },
];

const adminLinks = [
  { to: "/admin/tracks", label: "Gérer les tracks", icon: Music },
  { to: "/admin/users", label: "Gérer les utilisateurs", icon: Users },
  { to: "/admin/subscriptions", label: "Abonnements", icon: Settings },
];

export default function Admin() {
  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border glass">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Disc3 className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">Admin</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Retour au site</Link>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-8">Dashboard Admin</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {adminLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:glow-primary transition-all group"
            >
              <link.icon className="h-6 w-6 text-primary mb-3" />
              <p className="font-display font-semibold group-hover:text-primary transition-colors">{link.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
