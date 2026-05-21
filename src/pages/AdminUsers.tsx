import { useState, useMemo } from "react";
import { KeyRound, Search, Shield, ShieldOff, UserCheck, X, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
import AdminLayout from "@/components/admin/AdminLayout";

interface ProfileRow {
  id: string;
  user_id: string;
  dj_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_blocked: boolean | null;
  created_at: string;
}

export default function AdminUsers() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "client">("all");
  const [subFilter, setSubFilter] = useState<"all" | "active" | "none">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as ProfileRow[];
    },
    enabled: isAdmin,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: subs = [] } = useQuery({
    queryKey: ["admin-all-subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions").select("user_id, status, plan, current_period_end");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, string[]>();
    roles.forEach((r: any) => {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role);
      m.set(r.user_id, arr);
    });
    return m;
  }, [roles]);

  const subsByUser = useMemo(() => {
    const m = new Map<string, any>();
    subs.forEach((s: any) => m.set(s.user_id, s));
    return m;
  }, [subs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return profiles.filter((p) => {
      if (q) {
        const hay = `${p.dj_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const userRoles = rolesByUser.get(p.user_id) ?? [];
      if (roleFilter === "admin" && !userRoles.includes("admin")) return false;
      if (roleFilter === "client" && userRoles.includes("admin")) return false;

      const sub = subsByUser.get(p.user_id);
      const active = sub && sub.status === "active" &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      if (subFilter === "active" && !active) return false;
      if (subFilter === "none" && active) return false;

      if (statusFilter === "blocked" && !p.is_blocked) return false;
      if (statusFilter === "active" && p.is_blocked) return false;
      return true;
    });
  }, [profiles, search, roleFilter, subFilter, statusFilter, rolesByUser, subsByUser]);

  const hasFilters = search || roleFilter !== "all" || subFilter !== "all" || statusFilter !== "all";

  const handlePasswordReset = async (p: ProfileRow) => {
    if (!p.email) return;
    if (!confirm(`Envoyer un email de réinitialisation à ${p.email} ?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(p.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminAction({
      actorId: user!.id, action: "user.password_reset",
      entityType: "user", entityId: p.user_id, entityLabel: p.email,
    });
    toast({ title: "Email envoyé", description: `Réinitialisation envoyée à ${p.email}` });
  };

  const promoteAdmin = async (p: ProfileRow) => {
    if (!confirm(`Promouvoir ${p.email} en administrateur ?`)) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: p.user_id, role: "admin" as any,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminAction({
      actorId: user!.id, action: "user.role_promote",
      entityType: "user", entityId: p.user_id, entityLabel: p.email ?? p.user_id,
    });
    toast({ title: "Promu admin" });
    queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
  };

  const demoteAdmin = async (p: ProfileRow) => {
    if (p.user_id === user?.id) {
      toast({ title: "Action interdite", description: "Tu ne peux pas te retirer toi-même.", variant: "destructive" });
      return;
    }
    if (!confirm(`Retirer les droits admin de ${p.email} ?`)) return;
    const { error } = await supabase.from("user_roles").delete()
      .eq("user_id", p.user_id).eq("role", "admin" as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminAction({
      actorId: user!.id, action: "user.role_demote",
      entityType: "user", entityId: p.user_id, entityLabel: p.email ?? p.user_id,
    });
    toast({ title: "Droits admin retirés" });
    queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
  };

  const toggleBlock = async (p: ProfileRow) => {
    if (p.user_id === user?.id) {
      toast({ title: "Action interdite", description: "Tu ne peux pas te bloquer toi-même.", variant: "destructive" });
      return;
    }
    const next = !p.is_blocked;
    if (!confirm(next ? `Bloquer ${p.email} ?` : `Débloquer ${p.email} ?`)) return;
    const { error } = await supabase.rpc("admin_set_user_blocked" as any, { _user_id: p.user_id, _blocked: next });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminAction({
      actorId: user!.id, action: next ? "user.block" : "user.unblock",
      entityType: "user", entityId: p.user_id, entityLabel: p.email ?? p.user_id,
    });
    toast({ title: next ? "Utilisateur bloqué" : "Utilisateur débloqué" });
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-all-subs"] });
  };

  const deleteUser = async (p: ProfileRow) => {
    setConfirmDelete(null);
    if (p.user_id === user?.id) {
      toast({ title: "Action interdite", description: "Tu ne peux pas te supprimer toi-même.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc("admin_delete_user" as any, { _user_id: p.user_id });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminAction({
      actorId: user!.id, action: "user.delete",
      entityType: "user", entityId: p.user_id, entityLabel: p.email ?? p.user_id,
    });
    toast({ title: "Utilisateur supprimé" });
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-all-subs"] });
  };

  const resetFilters = () => { setSearch(""); setRoleFilter("all"); setSubFilter("all"); setStatusFilter("all"); };

  return (
    <AdminLayout
      wide
      title="Gestion des Utilisateurs"
      subtitle={`${filtered.length} utilisateur${filtered.length > 1 ? "s" : ""} ${hasFilters ? "filtré(s)" : ""}`}
    >
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom DJ ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="w-full lg:w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Admins seulement</SelectItem>
              <SelectItem value="client">Clients seulement</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subFilter} onValueChange={(v) => setSubFilter(v as any)}>
            <SelectTrigger className="w-full lg:w-52 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout abonnement</SelectItem>
              <SelectItem value="active">Abonnement actif</SelectItem>
              <SelectItem value="none">Sans abonnement actif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full lg:w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Comptes actifs</SelectItem>
              <SelectItem value="blocked">Comptes bloqués</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" onClick={resetFilters} className="gap-1">
              <X className="h-4 w-4" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">DJ</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Abonnement</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun utilisateur.</td></tr>
              ) : filtered.map((p) => {
                const userRoles = rolesByUser.get(p.user_id) ?? [];
                const isAdminRole = userRoles.includes("admin");
                const sub = subsByUser.get(p.user_id);
                const active = sub && sub.status === "active" &&
                  (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
                return (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold">
                          {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> :
                            (p.dj_name || p.email || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium">{p.dj_name || "Sans nom"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3">
                      {isAdminRole ? (
                        <Badge className="bg-accent/15 text-accent border-accent/30 gap-1"><Shield className="h-3 w-3" /> Admin</Badge>
                      ) : (
              <Badge variant="outline" className="text-xs">Client</Badge>
                      )}
                      {p.is_blocked && (
                        <Badge className="ml-1 bg-destructive/15 text-destructive border-destructive/30 gap-1">
                          <Ban className="h-3 w-3" /> Bloqué
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                          <UserCheck className="h-3 w-3" /> {sub.plan ?? "actif"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {isAdminRole ? (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => demoteAdmin(p)} title="Retirer admin">
                            <ShieldOff className="h-3 w-3" /> Retirer admin
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => promoteAdmin(p)} title="Promouvoir admin">
                            <Shield className="h-3 w-3" /> Promouvoir
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => handlePasswordReset(p)}>
                          <KeyRound className="h-3 w-3" /> Mdp
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1 ${p.is_blocked ? "text-primary" : "text-amber-500 hover:text-amber-600"}`}
                          onClick={() => toggleBlock(p)}
                          disabled={p.user_id === user?.id}
                          title={p.is_blocked ? "Débloquer" : "Bloquer"}
                        >
                          {p.is_blocked ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {p.is_blocked ? "Débloquer" : "Bloquer"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDelete(p)}
                          disabled={p.user_id === user?.id}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" /> Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.email ?? confirmDelete?.dj_name} sera supprimé : profil,
              abonnements, favoris, téléchargements et accès. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteUser(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
