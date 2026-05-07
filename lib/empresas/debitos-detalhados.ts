import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import type { DocumentTypeId } from "@/lib/documents/registry"
import { createClient } from "@/lib/supabase/server"

export interface DebitoDetalhado {
  empresa_cnpj: string
  empresa_razao_social: string | null
  empresa_nome_fantasia: string | null
  fonte: "federal" | "estadual" | "municipal" | "outros"
  fonte_label: string
  handler_id: string
  tipo: string
  /** parte após o ":" do tipo */
  sub_tipo: string
  receita_codigo: string | null
  receita_descricao: string | null
  periodo_apuracao: string | null
  data_vencimento: string | null
  valor_original: number | null
  saldo_devedor: number | null
  multa: number | null
  juros: number | null
  saldo_consolidado: number | null
  situacao: string | null
  relatorio_data_emissao: string | null
  relatorio_pdf: string
}

const HANDLER_FONTE: Record<string, DebitoDetalhado["fonte"]> = {
  "relatorio-situacao-fiscal": "federal",
  "extrato-fiscal-icms-rn": "estadual",
  "pendencias-iss-natal": "municipal",
}

const FONTE_LABEL: Record<DebitoDetalhado["fonte"], string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
  outros: "Outros",
}

/**
 * Carrega TODOS os débitos verified da org, com info da empresa e do
 * relatório de origem. Pesado em principio (uma linha por débito), mas
 * proporcional ao tamanho da carteira — não cresce com tempo.
 *
 * Usado no export CSV detalhado pra contadores que precisam levar a
 * planilha pro escritório.
 */
export async function loadDebitosDetalhados(): Promise<DebitoDetalhado[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, cnpj, razao_social, nome_fantasia")
    .eq("organization_id", ctx.organizationId)
  const empresaById = new Map(
    (empresas ?? []).map((e) => [e.id, e]),
  )

  const { data: relatorios } = await supabase
    .from("relatorios")
    .select("id, document_type, pdf_filename, data_emissao_documento")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "verified")
  const relatorioById = new Map(
    (relatorios ?? []).map((r) => [r.id, r]),
  )

  const { data: debitos, error } = await supabase
    .from("debitos")
    .select(
      "empresa_id, relatorio_id, tipo, receita_codigo, receita_descricao, periodo_apuracao, data_vencimento, valor_original, saldo_devedor, multa, juros, saldo_consolidado, situacao",
    )
    .eq("organization_id", ctx.organizationId)
  if (error) throw error
  if (!debitos) return []

  return debitos
    .map((d) => {
      const empresa = empresaById.get(d.empresa_id ?? "")
      if (!empresa) return null
      const relatorio = d.relatorio_id ? relatorioById.get(d.relatorio_id) : null
      const handlerId = d.tipo.split(":", 1)[0] as DocumentTypeId
      const fonte = HANDLER_FONTE[handlerId] ?? "outros"
      const subTipo = d.tipo.includes(":")
        ? d.tipo.slice(d.tipo.indexOf(":") + 1)
        : ""

      return {
        empresa_cnpj: empresa.cnpj,
        empresa_razao_social: empresa.razao_social,
        empresa_nome_fantasia: empresa.nome_fantasia,
        fonte,
        fonte_label: FONTE_LABEL[fonte],
        handler_id: handlerId,
        tipo: d.tipo,
        sub_tipo: subTipo,
        receita_codigo: d.receita_codigo,
        receita_descricao: d.receita_descricao,
        periodo_apuracao: d.periodo_apuracao,
        data_vencimento: d.data_vencimento,
        valor_original: d.valor_original,
        saldo_devedor: d.saldo_devedor,
        multa: d.multa,
        juros: d.juros,
        saldo_consolidado: d.saldo_consolidado,
        situacao: d.situacao,
        relatorio_data_emissao: relatorio?.data_emissao_documento ?? null,
        relatorio_pdf: relatorio?.pdf_filename ?? "",
      } as DebitoDetalhado
    })
    .filter((r): r is DebitoDetalhado => r !== null)
    .sort((a, b) => {
      // Ordem útil para CSV: por empresa (asc), depois por valor desc
      const cmp = (a.empresa_razao_social ?? "ㅤ").localeCompare(
        b.empresa_razao_social ?? "ㅤ",
      )
      if (cmp !== 0) return cmp
      return (b.saldo_devedor ?? 0) - (a.saldo_devedor ?? 0)
    })
}

