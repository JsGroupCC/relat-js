import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import type { RelatorioRow } from "@/types/database"

export interface RelatorioListItem extends RelatorioRow {
  empresa_razao_social: string | null
  empresa_cnpj: string | null
}

/**
 * Lista global de relatórios da org, com filtro opcional por status.
 * Faz JOIN manual com empresas (mesmo padrão dos demais helpers).
 */
export async function listAllRelatorios(opts?: {
  status?: RelatorioRow["status"][]
  limit?: number
}): Promise<RelatorioListItem[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  let query = supabase
    .from("relatorios")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })

  if (opts?.status && opts.status.length > 0) {
    query = query.in("status", opts.status)
  }
  if (opts?.limit) {
    query = query.limit(opts.limit)
  }

  const { data: relatorios, error } = await query
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
      (empresas ?? []).map((e) => [
        e.id,
        { razao_social: e.razao_social, cnpj: e.cnpj },
      ]),
    )
  }

  return relatorios.map((r) => ({
    ...r,
    empresa_razao_social: r.empresa_id
      ? (empresaById.get(r.empresa_id)?.razao_social ?? null)
      : null,
    empresa_cnpj: r.empresa_id
      ? (empresaById.get(r.empresa_id)?.cnpj ?? null)
      : null,
  }))
}
