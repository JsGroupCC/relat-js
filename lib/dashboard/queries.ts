import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import type { RelatorioRow, RelatorioStatus } from "@/types/database"

export interface DashboardStats {
  total_empresas: number
  total_relatorios: number
  por_status: Record<RelatorioStatus, number>
}

export interface RecentRelatorio extends RelatorioRow {
  empresa_razao_social: string | null
  empresa_cnpj: string | null
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const [empresasCount, relatoriosCount, byStatus] = await Promise.all([
    supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    supabase
      .from("relatorios")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
    supabase
      .from("relatorios")
      .select("status")
      .eq("organization_id", ctx.organizationId),
  ])

  const status: Record<RelatorioStatus, number> = {
    pending: 0,
    extracting: 0,
    reviewing: 0,
    verified: 0,
    failed: 0,
  }
  for (const row of byStatus.data ?? []) {
    const s = row.status as RelatorioStatus
    if (s in status) status[s] += 1
  }

  return {
    total_empresas: empresasCount.count ?? 0,
    total_relatorios: relatoriosCount.count ?? 0,
    por_status: status,
  }
}

export async function loadRecentRelatorios(limit = 5): Promise<RecentRelatorio[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: relatorios, error } = await supabase
    .from("relatorios")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!relatorios || relatorios.length === 0) return []

  const empresaIds = Array.from(
    new Set(relatorios.map((r) => r.empresa_id).filter(Boolean) as string[]),
  )

  let empresaById = new Map<string, { razao_social: string | null; cnpj: string }>()
  if (empresaIds.length > 0) {
    const { data: empresas } = await supabase
      .from("empresas")
      .select("id, razao_social, cnpj")
      .in("id", empresaIds)
    empresaById = new Map(
      (empresas ?? []).map((e) => [e.id, { razao_social: e.razao_social, cnpj: e.cnpj }]),
    )
  }

  return relatorios.map((r) => ({
    ...r,
    empresa_razao_social: r.empresa_id
      ? (empresaById.get(r.empresa_id)?.razao_social ?? null)
      : null,
    empresa_cnpj: r.empresa_id ? (empresaById.get(r.empresa_id)?.cnpj ?? null) : null,
  }))
}
