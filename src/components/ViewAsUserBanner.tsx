import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function ViewAsUserBanner() {
  const { realIsAdmin, viewAsUser, setViewAsUser } = useAuth();
  if (!realIsAdmin || !viewAsUser) return null;

  return (
    <div className="sticky top-16 z-40 bg-accent text-accent-foreground border-b border-border">
      <div className="container flex items-center justify-between gap-3 py-2 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Eye className="h-4 w-4" />
          Mode aperçu utilisateur — tu vois le site comme un membre standard.
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setViewAsUser(false)}
        >
          Quitter l'aperçu
        </Button>
      </div>
    </div>
  );
}
