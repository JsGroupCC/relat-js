import type {
  DebitoRowInput,
  DocumentHandler,
} from "@/lib/documents/types"

import { ClientView } from "./ClientView"
import { Dashboard } from "./Dashboard"
import { ReviewForm } from "./ReviewForm"
import { computeSaldo, computeSummary } from "./compute"
import { extractionJsonSchema, extractionPrompt } from "./prompt"
import {
  pendenciasIssNatalSchema,
  type PendenciasIssNatal,
} from "./schema"
import { generateText } from "./text"

const HANDLER_ID = "pendencias-iss-natal"

export const pendenciasIssNatalHandler: DocumentHandler<PendenciasIssNatal> = {
  id: HANDLER_ID,
  displayName: "Pendências Municipais (Natal/RN)",
  category: "tributario",

  // Detector roda apenas como fallback quando o classifier não está
  // disponível. Marcadores típicos: cabeçalho da SEFIN/Natal.
  detect: (text: string) => {
    if (!text) return 0
    const sample = text.slice(0, 4000).toLowerCase()
    let score = 0
    if (/prefeitura\s+municipal\s+do\s+natal/i.test(sample)) score += 0.5
    if (/sefin\s*-\s*secretaria\s+municipal\s+de\s+finan/i.test(sample))
      score += 0.3
    if (/lista\s+de\s+pend[êe]ncias\s+do\s+contribuinte/i.test(sample))
      score += 0.2
    if (/iss\s+(simples\s+nacional|homologado)/i.test(sample)) score += 0.1
    return Math.min(1, score)
  },

  schema: pendenciasIssNatalSchema,
  extractionPrompt,
  extractionSchema: extractionJsonSchema,

  ReviewForm,
  Dashboard,
  ClientView,

  generateText,
  computeSummary,

  extractContribuinte: (data) => ({
    cnpj: data.contribuinte?.cnpj ?? null,
    razao_social: data.contribuinte?.razao_social ?? null,
  }),

  extractDebitos: (data) => {
    const rows: DebitoRowInput[] = data.pendencias.map((p) => ({
      tipo: `${HANDLER_ID}:${p.tipo}`,
      receita_codigo: p.origem || null,
      receita_descricao: p.tipo_descricao || null,
      periodo_apuracao: p.referencia || null,
      data_vencimento: p.data_vencimento || null,
      valor_original: p.valor_original ?? null,
      saldo_devedor: computeSaldo(p),
      multa: null,
      juros: null,
      saldo_consolidado: null,
      situacao:
        p.parcela && p.parcela > 0 ? `parcela ${p.parcela}` : null,
    }))
    return {
      data_emissao: data.metadados_relatorio?.data_emissao ?? null,
      rows,
    }
  },
}

export type { PendenciaIss, PendenciasIssNatal, PendenciaTipo } from "./schema"
export type { PendenciasIssNatalSummary } from "./compute"
