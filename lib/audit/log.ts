import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

/**
 * Ações auditadas. Strings curtas no formato `recurso.verbo`.
 *
 * Mantenha o conjunto fechado para que o filtro/UI da página de atividade
 * possa traduzir cada uma para um label amigável sem cair em fallback genérico.
 */
export type AuditAction =
  | "empresa.create"
  | "empresa.update"
  | "empresa.delete"
  | "relatorio.delete"
  | "relatorio.verify"
  | "share.create"
  | "share.revoke"
  | "member.add"
  | "member.remove"
  | "member.role_change"
  | "org.create"
  | "user.signup"

interface RecordAuditArgs {
  organizationId: string | null
  userId: string | null
  action: AuditAction
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Grava uma entrada em audit_log via service role.
 *
 * audit_log tem policy só de SELECT para membros (nenhum INSERT/UPDATE/DELETE)
 * — escritas só acontecem por código server-side confiável. Por isso aqui
 * usamos o cliente admin: o audit é um sistema de bordo que não pode ser
 * forjado pelo usuário.
 *
 * Nunca propaga erro: auditoria não pode quebrar a action principal. Falha
 * vira console.warn, e o caller continua.
 */
export async function recordAudit(args: RecordAuditArgs): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("audit_log").insert({
      organization_id: args.organizationId,
      user_id: args.userId,
      action: args.action,
      resource_type: args.resourceType ?? null,
      resource_id: args.resourceId ?? null,
      metadata: (args.metadata ?? null) as Json | null,
    })
    if (error) {
      console.warn("[audit] insert failed:", error.message, args.action)
    }
  } catch (err) {
    console.warn("[audit] unexpected:", err, args.action)
  }
}
