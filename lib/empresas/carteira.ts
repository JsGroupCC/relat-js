import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import {
  fonteFromHandlerId,
  type CarteiraRow,
  type CarteiraSnapshot,
  type FonteFiscal,
} from "@/lib/empresas/carteira-types"
import { createClient } from "@/lib/supabase/server"

// Re-exports pra que callers não precisem trocar import (compatibilidade
// com código que já consome de "@/lib/empresas/carteira").
export {
  FONTE_LABEL,
  type CarteiraRow,
  type CarteiraSnapshot,
  type FonteFiscal,
} from "@/lib/empresas/carteira-types"

/**
 * Devolve a "carteira" da org ATIVA (cookie). Resolve a org via getCurrentOrg
 * e delega pra loadCarteiraForOrg. Use isto em RSC/páginas — snapshots e
 * código que já tem o orgId devem chamar loadCarteiraForOrg direto.
 */
export async function loadCarteira(): Promise<CarteiraSnapshot> {
  const ctx = await getCurrentOrg()
  return loadCarteiraForOrg(ctx.organizationId)
}

/**
 * Versão "pure" do carregamento de carteira: recebe orgId em vez de resolver
 * via cookie. Usada por code paths fora de uma request do usuário (snapshot
 * jobs, server actions já com ctx em mãos).
 *
 * Por convenção, `debitos.tipo` carrega o `handlerId` como prefixo
 * (ex.: "relatorio-situacao-fiscal:pgfn"). Fazemos o lookup do handler a
 * partir do prefixo e mapeamos pra fonte fiscal.
 */
export async function loadCarteiraForOrg(
  organizationId: string,
): Promise<CarteiraSnapshot> {
  const supabase = await createClient()

  const { data: empresas, error: empError } = await supabase
    .from("empresas")
    .select("id, cnpj, razao_social, nome_fantasia")
    .eq("organization_id", organizationId)
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
    .eq("organization_id", organizationId)

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
  const prefix = tipo.split(":", 1)[0]
  return fonteFromHandlerId(prefix)
}
