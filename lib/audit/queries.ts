import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { AuditLogRow } from "@/types/database"

export interface AuditLogEntryView extends AuditLogRow {
  user_email: string | null
}

/**
 * Lista as últimas N entradas de auditoria da org ativa.
 *
 * Lê audit_log via cliente do usuário (RLS de SELECT já filtra por org).
 * Para resolver email do user_id usa o admin client (auth.users não é lido
 * pelos clientes normais).
 */
export async function listRecentAudit(
  limit = 100,
): Promise<AuditLogEntryView[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("audit_log")
    .select(
      "id, organization_id, user_id, action, resource_type, resource_id, metadata, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!rows || rows.length === 0) return []

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  )

  const emailByUserId = new Map<string, string | null>()
  if (userIds.length > 0) {
    const admin = createAdminClient()
    const results = await Promise.all(
      userIds.map((id) => admin.auth.admin.getUserById(id)),
    )
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i]
      const r = results[i]
      emailByUserId.set(userId, r.data.user?.email ?? null)
    }
  }

  return rows.map((r) => ({
    ...r,
    user_email: r.user_id ? (emailByUserId.get(r.user_id) ?? null) : null,
  }))
}
