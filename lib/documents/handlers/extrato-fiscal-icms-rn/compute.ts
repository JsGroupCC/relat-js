import type { DocumentSummary } from "@/lib/documents/types"

import type {
  DebitoIcms,
  DebitoOrigemTipo,
  ExtratoFiscalIcmsRn,
  ObrigacaoAcessoriaTipo,
} from "./schema"

export interface ExtratoFiscalIcmsRnSummary extends DocumentSummary {
  total_geral: number
  total_debitos_vencidos: number
  total_debitos_a_vencer: number
  total_cobranca_bancaria: number
  total_obrigacoes_acessorias: number
  total_icms_vencidos: number
  quantidade_debitos: number
  quantidade_vencidos: number
  quantidade_a_vencer: number
  quantidade_obrigacoes_acessorias: number
  esta_criticado: boolean
  esta_inibido: boolean
}

export function computeSummary(
  data: ExtratoFiscalIcmsRn,
): ExtratoFiscalIcmsRnSummary {
  const total_debitos_vencidos =
    data.totais.total_debitos_vencidos ||
    sum(data.debitos_vencidos.map((d) => d.valor))
  const total_debitos_a_vencer =
    data.totais.total_debitos_a_vencer ||
    sum(data.debitos_a_vencer.map((d) => d.valor))
  const total_cobranca_bancaria =
    data.totais.total_cobranca_bancaria ||
    sum(data.cobranca_bancaria.map((c) => c.valor_nominal))

  const total_obrigacoes_acessorias = sum(
    data.obrigacoes_acessorias.map(
      (o) => o.valor_diferenca ?? o.valor_total ?? 0,
    ),
  )

  const total_icms_vencidos = sum(
    data.debitos_vencidos.map((d) => d.icms ?? 0),
  )

  const total_geral = total_debitos_vencidos + total_obrigacoes_acessorias

  const fiscal = data.situacao.fiscal?.toUpperCase() ?? ""
  const cred = data.situacao.credenciamento_icms_antecipado?.toUpperCase() ?? ""

  return {
    total_geral: round2(total_geral),
    total_debitos_vencidos: round2(total_debitos_vencidos),
    total_debitos_a_vencer: round2(total_debitos_a_vencer),
    total_cobranca_bancaria: round2(total_cobranca_bancaria),
    total_obrigacoes_acessorias: round2(total_obrigacoes_acessorias),
    total_icms_vencidos: round2(total_icms_vencidos),
    quantidade_debitos:
      data.debitos_vencidos.length + data.debitos_a_vencer.length,
    quantidade_vencidos: data.debitos_vencidos.length,
    quantidade_a_vencer: data.debitos_a_vencer.length,
    quantidade_obrigacoes_acessorias: data.obrigacoes_acessorias.length,
    esta_criticado: /CRITICADO/.test(fiscal),
    esta_inibido: /INIBIDO/.test(cred),
  }
}

export const ORIGEM_LABEL: Record<DebitoOrigemTipo, string> = {
  nfe: "Nota Fiscal Eletrônica",
  efd: "Apuração EFD",
  rfb: "Receita Federal",
  outros: "Outros",
}

export const OBRIGACAO_LABEL: Record<ObrigacaoAcessoriaTipo, string> = {
  das_nao_pago: "DAS não pago",
  divergencia_das: "Divergência de valor (DAS)",
  arquivo_efd_nao_informado: "EFD não informada",
  outros: "Outros",
}

export function debitoSaldo(d: DebitoIcms): number {
  return d.valor
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
