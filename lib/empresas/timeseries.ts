import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import { computeSummary } from "@/lib/documents/handlers/relatorio-situacao-fiscal/compute"
import {
  relatorioSituacaoFiscalSchema,
  type RelatorioSituacaoFiscal,
} from "@/lib/documents/handlers/relatorio-situacao-fiscal/schema"

export interface TimePoint {
  relatorioId: string
  date: string // ISO YYYY-MM-DD
  total_geral: number
  total_sief: number
  total_pgfn: number
  total_suspenso: number
  quantidade_debitos: number
}

/**
 * Coleta a série histórica de totais para uma empresa.
 * Inclui apenas relatórios já verified (com verified_json).
 */
export async function loadEmpresaTimeseries(
  empresaId: string,
): Promise<TimePoint[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: relatorios, error: relErr } = await supabase
    .from("relatorios")
    .select("id, data_emissao_documento, created_at")
    .eq("organization_id", ctx.organizationId)
    .eq("empresa_id", empresaId)
    .eq("status", "verified")
    .order("data_emissao_documento", { ascending: true, nullsFirst: false })
  if (relErr) throw relErr
  if (!relatorios || relatorios.length === 0) return []

  const ids = relatorios.map((r) => r.id)
  const { data: extracoes, error: extErr } = await supabase
    .from("extracoes")
    .select("relatorio_id, verified_json")
    .in("relatorio_id", ids)
  if (extErr) throw extErr

  const byRelatorio = new Map(
    (extracoes ?? []).map((e) => [e.relatorio_id, e.verified_json]),
  )

  const points: TimePoint[] = []
  for (const r of relatorios) {
    const raw = byRelatorio.get(r.id)
    if (!raw) continue
    const parsed = relatorioSituacaoFiscalSchema.safeParse(raw)
    if (!parsed.success) continue
    const data: RelatorioSituacaoFiscal = parsed.data
    const s = computeSummary(data)
    points.push({
      relatorioId: r.id,
      date: r.data_emissao_documento ?? r.created_at.slice(0, 10),
      total_geral: s.total_geral,
      total_sief: s.total_pendencias_sief,
      total_pgfn: s.total_pgfn,
      total_suspenso: s.total_exigibilidade_suspensa,
      quantidade_debitos: s.quantidade_debitos,
    })
  }

  return points.sort((a, b) => a.date.localeCompare(b.date))
}
