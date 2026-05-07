import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"

export interface CarteiraEvolucaoPoint {
  date: string // YYYY-MM-DD
  total_geral: number
  total_federal: number
  total_estadual: number
  total_municipal: number
}

/**
 * Carrega snapshots dos últimos N dias da org ativa, ordenados ASC por data.
 * Usado pra plotar evolução do total da carteira.
 *
 * Sem snapshot pra um dado dia → o ponto não aparece no array (não interpola).
 * O gráfico decide se conecta os pontos ou usa step.
 */
export async function loadCarteiraEvolucao(
  daysWindow = 90,
): Promise<CarteiraEvolucaoPoint[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const cutoff = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data, error } = await supabase
    .from("carteira_snapshots")
    .select(
      "snapshot_date, total_geral, total_federal, total_estadual, total_municipal",
    )
    .eq("organization_id", ctx.organizationId)
    .gte("snapshot_date", cutoff)
    .order("snapshot_date", { ascending: true })

  // Tabela pode ainda não existir (migration 20260506000400 não aplicada).
  // Tratar como "sem histórico ainda" em vez de quebrar a página.
  if (error) {
    if (
      error.code === "42P01" || // undefined_table
      error.message?.toLowerCase().includes("does not exist")
    ) {
      console.warn(
        "[carteira-evolucao] carteira_snapshots não existe — aplique a migration.",
      )
      return []
    }
    throw error
  }
  if (!data) return []

  return data.map((r) => ({
    date: r.snapshot_date,
    total_geral: Number(r.total_geral),
    total_federal: Number(r.total_federal),
    total_estadual: Number(r.total_estadual),
    total_municipal: Number(r.total_municipal),
  }))
}
