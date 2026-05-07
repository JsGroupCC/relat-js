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
  extratoFiscalIcmsRnSchema,
  type DebitoIcms,
  type ExtratoFiscalIcmsRn,
  type ObrigacaoAcessoria,
} from "./schema"
import { generateText } from "./text"

const HANDLER_ID = "extrato-fiscal-icms-rn"

function debitoToRow(
  d: DebitoIcms,
  categoria: "vencido" | "a_vencer",
): DebitoRowInput {
  const desc =
    [d.origem_descricao, d.razao_social].filter(Boolean).join(" — ") ||
    d.origem_descricao
  return {
    tipo: `${HANDLER_ID}:${d.origem_tipo}_${categoria}`,
    receita_codigo: d.documento ?? null,
    receita_descricao: desc || null,
    periodo_apuracao: d.data_vencimento.slice(0, 7) || null,
    data_vencimento: d.data_vencimento || null,
    valor_original: d.valor,
    saldo_devedor: d.valor,
    multa: null,
    juros: null,
    saldo_consolidado: null,
    situacao: d.cobranca === true ? "em cobrança" : null,
  }
}

function obrigacaoToRow(o: ObrigacaoAcessoria): DebitoRowInput {
  const valor = o.valor_diferenca ?? o.valor_total ?? 0
  return {
    tipo: `${HANDLER_ID}:obrigacao_${o.tipo}`,
    receita_codigo: null,
    receita_descricao: o.descricao || null,
    periodo_apuracao: o.referencia || null,
    data_vencimento: null,
    valor_original: valor,
    saldo_devedor: valor,
    multa: null,
    juros: null,
    saldo_consolidado: null,
    situacao: o.tipo,
  }
}

export const extratoFiscalIcmsRnHandler: DocumentHandler<ExtratoFiscalIcmsRn> = {
  id: HANDLER_ID,
  displayName: "Extrato Fiscal ICMS (SEFAZ-RN)",
  category: "tributario",

  detect: (text: string) => {
    if (!text) return 0
    const sample = text.slice(0, 4000).toLowerCase()
    let score = 0
    if (/extrato\s+fiscal\s+do\s+contribuinte/i.test(sample)) score += 0.4
    if (/unidade\s+virtual\s+de\s+tributa[çc][ãa]o|uvt/i.test(sample))
      score += 0.3
    if (/secretaria\s+da\s+fazenda\s+do\s+rn|sefaz[\/\-]rn/i.test(sample))
      score += 0.2
    if (/icms\s+no\s+das\s+n[ãa]o\s+pago|d[ée]bitos\s+vencidos/i.test(sample))
      score += 0.1
    return Math.min(1, score)
  },

  schema: extratoFiscalIcmsRnSchema,
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
    for (const d of data.debitos_vencidos) rows.push(debitoToRow(d, "vencido"))
    for (const d of data.debitos_a_vencer) rows.push(debitoToRow(d, "a_vencer"))
    for (const o of data.obrigacoes_acessorias) rows.push(obrigacaoToRow(o))
    return {
      data_emissao: data.metadados_relatorio?.data_emissao
        ? data.metadados_relatorio.data_emissao.slice(0, 10)
        : null,
      rows,
    }
  },
}

export type {
  DebitoIcms,
  DebitoOrigemTipo,
  ExtratoFiscalIcmsRn,
  ObrigacaoAcessoria,
  ObrigacaoAcessoriaTipo,
} from "./schema"
export type { ExtratoFiscalIcmsRnSummary } from "./compute"
