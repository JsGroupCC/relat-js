import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import type { DocumentTypeId } from "@/lib/documents/registry"
import { createClient } from "@/lib/supabase/server"

/**
 * "Fonte fiscal": agrupa débitos pela esfera de origem (federal / estadual /
 * municipal / outros). Mais útil pra contador que `category` (que é a
 * natureza do tributo) — o contador quer saber pra QUEM cada empresa deve.
 *
 * Mapeamento por prefixo do handler — não tem campo no schema do handler
 * porque só faz sentido pro consolidado.
 */
export type FonteFiscal = "federal" | "estadual" | "municipal" | "outros"

export const FONTE_LABEL: Record<FonteFiscal, string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
  outros: "Outros",
}

export interface CarteiraRow {
  empresa_id: string
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  /** soma de saldo_devedor de débitos por fonte */
  por_fonte: Record<FonteFiscal, number>
  total_geral: number
  qtd_debitos: number
  /** data do relatório verified mais recente (qualquer fonte) */
  ultimo_relatorio_at: string | null
}

export interface CarteiraSnapshot {
  rows: CarteiraRow[]
  total_geral: number
  total_por_fonte: Record<FonteFiscal, number>
  qtd_empresas_com_debito: number
}

const HANDLER_FONTE: Record<string, FonteFiscal> = {
  "relatorio-situacao-fiscal": "federal",
  "extrato-fiscal-icms-rn": "estadual",
  "pendencias-iss-natal": "municipal",
}

/**
 * Devolve a "carteira" da org: cada empresa com seus totais consolidados
 * por fonte fiscal (federal / estadual / municipal), somando débitos de
 * todos os relatórios verified.
 *
 * Por convenção, `debitos.tipo` carrega o `handlerId` como prefixo
 * (ex.: "relatorio-situacao-fiscal:pgfn"). Fazemos o lookup do handler a
 * partir do prefixo e mapeamos pra fonte fiscal.
 */
export async function loadCarteira(): Promise<CarteiraSnapshot> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: empresas, error: empError } = await supabase
    .from("empresas")
    .select("id, cnpj, razao_social, nome_fantasia")
    .eq("organization_id", ctx.organizationId)
    .order("razao_social", { ascending: true, nullsFirst: false })
  if (empError) throw empError
  if (!empresas || empresas.length === 0) {
    return {
      rows: [],
      total_geral: 0,
      total_por_fonte: emptyFonteAcc(),
      qtd_empresas_com_debito: 0,
    }
  }

  const empresaIds = empresas.map((e) => e.id)

  const { data: debitos, error: debError } = await supabase
    .from("debitos")
    .select("empresa_id, tipo, saldo_devedor, saldo_consolidado")
    .in("empresa_id", empresaIds)
  if (debError) throw debError

  const { data: relatorios } = await supabase
    .from("relatorios")
    .select("empresa_id, verified_at, data_emissao_documento")
    .in("empresa_id", empresaIds)
    .eq("status", "verified")
    .eq("organization_id", ctx.organizationId)

  const ultimoByEmpresa = new Map<string, string>()
  for (const r of relatorios ?? []) {
    if (!r.empresa_id) continue
    const candidate = r.data_emissao_documento ?? r.verified_at
    if (!candidate) continue
    const cur = ultimoByEmpresa.get(r.empresa_id)
    if (!cur || candidate > cur) ultimoByEmpresa.set(r.empresa_id, candidate)
  }

  const totalPorFonte: Record<FonteFiscal, number> = emptyFonteAcc()
  const rows: CarteiraRow[] = empresas.map((e) => ({
    empresa_id: e.id,
    cnpj: e.cnpj,
    razao_social: e.razao_social,
    nome_fantasia: e.nome_fantasia,
    por_fonte: emptyFonteAcc(),
    total_geral: 0,
    qtd_debitos: 0,
    ultimo_relatorio_at: ultimoByEmpresa.get(e.id) ?? null,
  }))
  const rowByEmpresaId = new Map(rows.map((r) => [r.empresa_id, r]))

  for (const d of debitos ?? []) {
    if (!d.empresa_id) continue
    const row = rowByEmpresaId.get(d.empresa_id)
    if (!row) continue

    const valor = d.saldo_devedor ?? d.saldo_consolidado ?? 0
    if (valor <= 0) continue

    const fonte = fonteFromTipo(d.tipo)
    row.por_fonte[fonte] += valor
    row.total_geral += valor
    row.qtd_debitos += 1
    totalPorFonte[fonte] += valor
  }

  const totalGeral = rows.reduce((acc, r) => acc + r.total_geral, 0)
  const qtdEmpresasComDebito = rows.filter((r) => r.total_geral > 0).length

  rows.sort((a, b) => b.total_geral - a.total_geral)

  return {
    rows,
    total_geral: totalGeral,
    total_por_fonte: totalPorFonte,
    qtd_empresas_com_debito: qtdEmpresasComDebito,
  }
}

function emptyFonteAcc(): Record<FonteFiscal, number> {
  return { federal: 0, estadual: 0, municipal: 0, outros: 0 }
}

function fonteFromTipo(tipo: string): FonteFiscal {
  const prefix = tipo.split(":", 1)[0] as DocumentTypeId
  return HANDLER_FONTE[prefix] ?? "outros"
}
