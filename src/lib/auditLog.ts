import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "track.create" | "track.update" | "track.delete"
  | "user.password_reset"
  | "subscription.create" | "subscription.update" | "subscription.delete";

interface LogParams {
  actorId: string;
  action: AuditAction;
  entityType: "track" | "user" | "subscription";
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
}

export async function logAdminAction(p: LogParams) {
  try {
    await supabase.from("admin_audit_logs").insert({
      actor_id: p.actorId,
      action: p.action,
      entity_type: p.entityType,
      entity_id: p.entityId ?? null,
      entity_label: p.entityLabel ?? null,
      details: (p.details ?? {}) as any,
    });
  } catch (e) {
    // Silencieux : ne jamais bloquer une action admin si le log échoue
    console.warn("[audit] log failed", e);
  }
}
