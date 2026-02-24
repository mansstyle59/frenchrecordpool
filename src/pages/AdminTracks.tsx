import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowLeft, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTracks } from "@/data/mockTracks";

export default function AdminTracks() {
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">Gestion des Tracks</h1>
          <Button variant="hero" className="gap-1"><Plus className="h-4 w-4" /> Ajouter</Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Cover</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Artiste</th>
                  <th className="px-4 py-3">Genre</th>
                  <th className="px-4 py-3">BPM</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <img src={track.coverUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    </td>
                    <td className="px-4 py-3 font-medium">{track.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.artist}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{track.genre}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{track.bpm}</td>
                    <td className="px-4 py-3 text-muted-foreground">{track.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(track.releaseDate).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
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
