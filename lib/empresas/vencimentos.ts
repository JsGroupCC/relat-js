import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import type { DocumentTypeId } from "@/lib/documents/registry"
import { createClient } from "@/lib/supabase/server"

export type FonteFiscalVenc = "federal" | "estadual" | "municipal" | "outros"

export interface VencimentoItem {
  id: string
  empresa_id: string
  empresa_cnpj: string
  empresa_razao_social: string | null
  data_vencimento: string // YYYY-MM-DD
  fonte: FonteFiscalVenc
  receita_descricao: string | null
  receita_codigo: string | null
  periodo_apuracao: string | null
  saldo_devedor: number | null
  /** dias até vencer (negativo = atrasado) */
  diff_days: number
}

export interface VencimentosBucket {
  /** key humano: "atrasado", "hoje", "7d", "30d", "60d+" */
  key: "atrasado" | "hoje" | "7d" | "30d" | "60d+"
  label: string
  total: number
  itens: VencimentoItem[]
}

export interface VencimentosSnapshot {
  buckets: VencimentosBucket[]
  total_geral: number
  total_atrasado: number
  total_proximos_7d: number
  total_proximos_30d: number
}

const HANDLER_FONTE: Record<string, FonteFiscalVenc> = {
  "relatorio-situacao-fiscal": "federal",
  "extrato-fiscal-icms-rn": "estadual",
  "pendencias-iss-natal": "municipal",
}

/**
 * Carrega débitos com `data_vencimento` definida, agrupados em buckets:
 * atrasado / hoje / próximos 7d / próximos 30d / 60d+. Cada bucket
 * carrega total + lista ordenada por data crescente.
 *
 * Filtra silenciosamente débitos com saldo_devedor <= 0 (já pagos).
 *
 * `windowDays` define o teto da janela: tudo acima cai no bucket "60d+".
 */
export async function loadProximosVencimentos(
  windowDays = 90,
): Promise<VencimentosSnapshot> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, cnpj, razao_social")
    .eq("organization_id", ctx.organizationId)
  const empresaById = new Map(
    (empresas ?? []).map((e) => [e.id, e]),
  )

  const todayUtc = new Date()
  todayUtc.setUTCHours(0, 0, 0, 0)
  const cutoff = new Date(
    todayUtc.getTime() + windowDays * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)

  const { data: debitos, error } = await supabase
    .from("debitos")
    .select(
      "id, empresa_id, tipo, data_vencimento, receita_codigo, receita_descricao, periodo_apuracao, saldo_devedor",
    )
    .eq("organization_id", ctx.organizationId)
    .not("data_vencimento", "is", null)
    .lte("data_vencimento", cutoff)
  if (error) throw error
  if (!debitos) {
    return emptySnapshot()
  }

  const itens: VencimentoItem[] = []
  for (const d of debitos) {
    if (!d.empresa_id) continue
    if ((d.saldo_devedor ?? 0) <= 0) continue
    const emp = empresaById.get(d.empresa_id)
    if (!emp) continue
    const handlerId = d.tipo.split(":", 1)[0] as DocumentTypeId
    const fonte = HANDLER_FONTE[handlerId] ?? "outros"
    const venc = d.data_vencimento as string

    // Diferença em dias (UTC) — positivo = futuro, negativo = atrasado
    const vencDate = new Date(`${venc}T00:00:00Z`)
    const diffMs = vencDate.getTime() - todayUtc.getTime()
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

    itens.push({
      id: d.id,
      empresa_id: d.empresa_id,
      empresa_cnpj: emp.cnpj,
      empresa_razao_social: emp.razao_social,
      data_vencimento: venc,
      fonte,
      receita_codigo: d.receita_codigo,
      receita_descricao: d.receita_descricao,
      periodo_apuracao: d.periodo_apuracao,
      saldo_devedor: d.saldo_devedor,
      diff_days: diffDays,
    })
  }

  itens.sort((a, b) => (a.data_vencimento < b.data_vencimento ? -1 : 1))

  const buckets: Record<VencimentosBucket["key"], VencimentoItem[]> = {
    atrasado: [],
    hoje: [],
    "7d": [],
    "30d": [],
    "60d+": [],
  }
  for (const i of itens) {
    if (i.diff_days < 0) buckets.atrasado.push(i)
    else if (i.diff_days === 0) buckets.hoje.push(i)
    else if (i.diff_days <= 7) buckets["7d"].push(i)
    else if (i.diff_days <= 30) buckets["30d"].push(i)
    else buckets["60d+"].push(i)
  }

  const formattedBuckets: VencimentosBucket[] = (
    [
      { key: "atrasado" as const, label: "Em atraso" },
      { key: "hoje" as const, label: "Vence hoje" },
      { key: "7d" as const, label: "Próximos 7 dias" },
      { key: "30d" as const, label: "Próximos 30 dias" },
      { key: "60d+" as const, label: `${windowDays - 30}+ dias à frente` },
    ]
  ).map((b) => ({
    key: b.key,
    label: b.label,
    total: buckets[b.key].reduce((acc, i) => acc + (i.saldo_devedor ?? 0), 0),
    itens: buckets[b.key],
  }))

  const totalGeral = itens.reduce(
    (acc, i) => acc + (i.saldo_devedor ?? 0),
    0,
  )

  return {
    buckets: formattedBuckets,
    total_geral: totalGeral,
    total_atrasado: formattedBuckets[0].total,
    total_proximos_7d:
      formattedBuckets[1].total + formattedBuckets[2].total,
    total_proximos_30d:
      formattedBuckets[1].total +
      formattedBuckets[2].total +
      formattedBuckets[3].total,
  }
}

function emptySnapshot(): VencimentosSnapshot {
  return {
    buckets: [],
    total_geral: 0,
    total_atrasado: 0,
    total_proximos_7d: 0,
    total_proximos_30d: 0,
  }
}
