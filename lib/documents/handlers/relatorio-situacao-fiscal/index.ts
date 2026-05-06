import type {
  DebitoRowInput,
  DocumentHandler,
} from "@/lib/documents/types"

import { ClientView } from "./ClientView"
import { Dashboard } from "./Dashboard"
import { ReviewForm } from "./ReviewForm"
import { computeSummary } from "./compute"
import { extractionJsonSchema, extractionPrompt } from "./prompt"
import {
  relatorioSituacaoFiscalSchema,
  type Debito,
  type RelatorioSituacaoFiscal,
} from "./schema"
import { generateText } from "./text"

const HANDLER_ID = "relatorio-situacao-fiscal"

function debitoToRow(
  d: Debito,
  tipo: "sief" | "suspenso" | "pgfn",
): DebitoRowInput {
  return {
    tipo: `${HANDLER_ID}:${tipo}`,
    receita_codigo: d.receita_codigo ?? null,
    receita_descricao: d.receita_descricao ?? null,
    periodo_apuracao: d.periodo_apuracao ?? null,
    data_vencimento: d.data_vencimento || null,
    valor_original: d.valor_original ?? null,
    saldo_devedor: d.saldo_devedor ?? null,
    multa: d.multa,
    juros: d.juros,
    saldo_consolidado: d.saldo_consolidado,
    situacao: d.situacao ?? null,
  }
}

export const relatorioSituacaoFiscalHandler: DocumentHandler<RelatorioSituacaoFiscal> = {
  id: HANDLER_ID,
  displayName: "Relatório de Situação Fiscal (RFB/PGFN)",
  category: "fiscal",

  // Heurística simples — usado apenas se classifier estiver desligado.
  // Em produção o classifier LLM toma a decisão.
  detect: (text: string) => {
    if (!text) return 0
    const sample = text.slice(0, 4000).toLowerCase()
    let score = 0
    if (/relat[óo]rio\s+de\s+situa[çc][ãa]o\s+fiscal/i.test(sample))
      score += 0.4
    if (/secretaria\s+especial\s+da\s+receita\s+federal/i.test(sample))
      score += 0.3
    if (/procuradoria-?geral\s+da\s+fazenda\s+nacional|pgfn/i.test(sample))
      score += 0.2
    if (/sief|exigibilidade\s+suspensa/i.test(sample)) score += 0.1
    return Math.min(1, score)
  },

  schema: relatorioSituacaoFiscalSchema,
  extractionPrompt,
  extractionSchema: extractionJsonSchema,

  ReviewForm,
  Dashboard,
  ClientView,

  generateText,
  computeSummary,

  extractContribuinte: (data) => ({
    cnpj: data.empresa?.cnpj ?? null,
    razao_social: data.empresa?.razao_social ?? null,
  }),

  extractDebitos: (data) => {
    const rows: DebitoRowInput[] = []
    for (const d of data.pendencias_sief) rows.push(debitoToRow(d, "sief"))
    for (const d of data.debitos_exigibilidade_suspensa)
      rows.push(debitoToRow(d, "suspenso"))
    for (const d of data.pgfn.debitos) rows.push(debitoToRow(d, "pgfn"))
    return {
      data_emissao: data.metadados_relatorio?.data_emissao ?? null,
      rows,
    }
  },
}

export type { RelatorioSituacaoFiscal } from "./schema"
export type { Debito } from "./schema"
export type { RelatorioSituacaoFiscalSummary } from "./compute"
