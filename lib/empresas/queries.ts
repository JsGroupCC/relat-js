import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import type { EmpresaRow, RelatorioRow } from "@/types/database"

export interface EmpresaWithStats extends EmpresaRow {
  relatorios_count: number
  ultimo_relatorio_at: string | null
}

export async function listEmpresas(): Promise<EmpresaWithStats[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: empresas, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("razao_social", { ascending: true })
  if (error) throw error
  if (!empresas || empresas.length === 0) return []

  const ids = empresas.map((e) => e.id)
  const { data: rels } = await supabase
    .from("relatorios")
    .select("empresa_id, created_at")
    .eq("organization_id", ctx.organizationId)
    .in("empresa_id", ids)
    .order("created_at", { ascending: false })

  const stats = new Map<string, { count: number; last: string | null }>()
  for (const r of rels ?? []) {
    if (!r.empresa_id) continue
    const cur = stats.get(r.empresa_id) ?? { count: 0, last: null }
    cur.count += 1
    if (!cur.last) cur.last = r.created_at
    stats.set(r.empresa_id, cur)
  }

  return empresas.map((e) => ({
    ...e,
    relatorios_count: stats.get(e.id)?.count ?? 0,
    ultimo_relatorio_at: stats.get(e.id)?.last ?? null,
  }))
}

export interface EmpresaDetail {
  empresa: EmpresaRow
  relatorios: RelatorioRow[]
}

export async function loadEmpresaByCnpj(cnpj: string): Promise<EmpresaDetail | null> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("cnpj", cnpj)
    .maybeSingle()
  if (error) throw error
  if (!empresa) return null

  const { data: relatorios, error: relErr } = await supabase
    .from("relatorios")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("empresa_id", empresa.id)
    .order("data_emissao_documento", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (relErr) throw relErr

  return { empresa, relatorios: relatorios ?? [] }
}
