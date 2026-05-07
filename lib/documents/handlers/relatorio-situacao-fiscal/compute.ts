import type { DocumentSummary } from "@/lib/documents/types"

import type { Debito, RelatorioSituacaoFiscal } from "./schema"

export interface RelatorioSituacaoFiscalSummary extends DocumentSummary {
  total_pendencias_sief: number
  total_exigibilidade_suspensa: number
  total_pgfn: number
  total_geral: number
  quantidade_debitos: number
  quantidade_sief: number
  quantidade_suspensa: number
  quantidade_pgfn: number
  pode_emitir_cnd: boolean
  pode_emitir_cpd_en: boolean
}

function saldoConsolidadoOrDevedor(d: Debito): number {
  return d.saldo_consolidado ?? d.saldo_devedor ?? 0
}

export function computeSummary(
  data: RelatorioSituacaoFiscal,
): RelatorioSituacaoFiscalSummary {
  const totalSief = data.pendencias_sief.reduce(
    (sum, d) => sum + saldoConsolidadoOrDevedor(d),
    0,
  )
  const totalSuspenso = data.debitos_exigibilidade_suspensa.reduce(
    (sum, d) => sum + (d.saldo_devedor ?? 0),
    0,
  )
  const totalPgfn = data.pgfn.debitos.reduce(
    (sum, d) => sum + (d.saldo_devedor ?? 0),
    0,
  )

  return {
    total_pendencias_sief: round2(totalSief),
    total_exigibilidade_suspensa: round2(totalSuspenso),
    total_pgfn: round2(totalPgfn),
    total_geral: round2(totalSief + totalPgfn),
    quantidade_sief: data.pendencias_sief.length,
    quantidade_suspensa: data.debitos_exigibilidade_suspensa.length,
    quantidade_pgfn: data.pgfn.debitos.length,
    quantidade_debitos:
      data.pendencias_sief.length +
      data.debitos_exigibilidade_suspensa.length +
      data.pgfn.debitos.length,
    pode_emitir_cnd: totalSief === 0 && totalPgfn === 0,
    pode_emitir_cpd_en:
      totalSief === 0 &&
      totalPgfn === 0 &&
      data.debitos_exigibilidade_suspensa.length === 0,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
