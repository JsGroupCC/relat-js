import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export interface AdminMetrics {
  /** total de extracoes salvas — inclui cached */
  totalExtracoes: number
  /** custo USD acumulado (cached = 0) */
  totalCostUsd: number
  /** quantas extracoes vieram de cache (cost_usd=0 e model contém 'cached') */
  cachedCount: number
  /** custo médio por extracao NÃO-cached (USD) */
  avgCostPerNonCached: number
  /** janela últimos 7d */
  last7d: {
    extracoes: number
    costUsd: number
    failed: number
  }
  /** janela últimos 30d */
  last30d: {
    extracoes: number
    costUsd: number
    failed: number
  }
  /** top 5 orgs por custo nos últimos 30d */
  topOrgs: Array<{
    organization_id: string
    organization_name: string | null
    extracoes: number
    costUsd: number
  }>
}

interface ExtracaoSlim {
  cost_usd: number | null
  llm_model: string | null
  created_at: string
  relatorios: { organization_id: string } | { organization_id: string }[] | null
}

function flattenOrgId(rel: ExtracaoSlim["relatorios"]): string | null {
  if (!rel) return null
  if (Array.isArray(rel)) return rel[0]?.organization_id ?? null
  return rel.organization_id
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = createAdminClient()

  const now = Date.now()
  const ago7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const ago30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Pega todas as extracoes recentes (30d) com a org via FK — fica completo
  // pra agregação local sem precisar de view nem RPC.
  const { data: ext30, error } = await supabase
    .from("extracoes")
    .select("cost_usd, llm_model, created_at, relatorios!inner(organization_id)")
    .gte("created_at", ago30d)
    .order("created_at", { ascending: false })
    .limit(5000)
  if (error) throw error
  const ext30Rows = (ext30 ?? []) as unknown as ExtracaoSlim[]

  // Totais all-time via count + agregação (cost_usd não tem RPC, então
  // somamos a janela 30d apenas — totalAllTime usa contagem + estimativa).
  const { count: totalExtracoes } = await supabase
    .from("extracoes")
    .select("*", { count: "exact", head: true })

  // All-time cost agregado: a tabela costuma ser pequena (uma org pequena
  // gera 100s, não milhões). Pegamos numa segunda query separada do lookup
  // detalhado e somamos no JS.
  const { data: allCosts } = await supabase
    .from("extracoes")
    .select("cost_usd, llm_model")
    .limit(50_000)
  const totalCostUsd = (allCosts ?? []).reduce(
    (acc, e) => acc + (e.cost_usd ?? 0),
    0,
  )
  const cachedCount = (allCosts ?? []).filter(
    (e) => e.llm_model?.includes("cached") ?? false,
  ).length
  const nonCachedCount = (allCosts ?? []).length - cachedCount
  const avgCostPerNonCached =
    nonCachedCount > 0 ? totalCostUsd / nonCachedCount : 0

  // Janelas 7d/30d
  const ext7Rows = ext30Rows.filter((r) => r.created_at >= ago7d)
  const cost30 = ext30Rows.reduce((a, r) => a + (r.cost_usd ?? 0), 0)
  const cost7 = ext7Rows.reduce((a, r) => a + (r.cost_usd ?? 0), 0)

  const { count: failed7 } = await supabase
    .from("relatorios")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", ago7d)
  const { count: failed30 } = await supabase
    .from("relatorios")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", ago30d)

  // Top orgs por custo nos últimos 30d
  const byOrg = new Map<string, { extracoes: number; costUsd: number }>()
  for (const r of ext30Rows) {
    const orgId = flattenOrgId(r.relatorios)
    if (!orgId) continue
    const cur = byOrg.get(orgId) ?? { extracoes: 0, costUsd: 0 }
    cur.extracoes += 1
    cur.costUsd += r.cost_usd ?? 0
    byOrg.set(orgId, cur)
  }
  const topOrgIds = Array.from(byOrg.entries())
    .sort((a, b) => b[1].costUsd - a[1].costUsd)
    .slice(0, 5)
    .map(([id]) => id)

  let nameByOrgId = new Map<string, string>()
  if (topOrgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", topOrgIds)
    nameByOrgId = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  }

  const topOrgs = topOrgIds.map((id) => {
    const stat = byOrg.get(id)!
    return {
      organization_id: id,
      organization_name: nameByOrgId.get(id) ?? null,
      extracoes: stat.extracoes,
      costUsd: stat.costUsd,
    }
  })

  return {
    totalExtracoes: totalExtracoes ?? 0,
    totalCostUsd,
    cachedCount,
    avgCostPerNonCached,
    last7d: {
      extracoes: ext7Rows.length,
      costUsd: cost7,
      failed: failed7 ?? 0,
    },
    last30d: {
      extracoes: ext30Rows.length,
      costUsd: cost30,
      failed: failed30 ?? 0,
    },
    topOrgs,
  }
}
