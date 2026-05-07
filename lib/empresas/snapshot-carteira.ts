import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

import { loadCarteiraForOrg } from "@/lib/empresas/carteira"

/**
 * Grava um snapshot diário da carteira da organização. Idempotente por
 * (organization_id, snapshot_date) — chamadas múltiplas no mesmo dia
 * fazem upsert (atualizam totais).
 *
 * Best-effort: nunca propaga erro pra não quebrar a action principal.
 *
 * O service role bypassa a policy só-de-SELECT da tabela.
 */
export async function recordCarteiraSnapshot(
  organizationId: string,
): Promise<void> {
  try {
    const snapshot = await loadCarteiraForOrg(organizationId)
    const supabase = createAdminClient()

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC

    const { error } = await supabase
      .from("carteira_snapshots")
      .upsert(
        {
          organization_id: organizationId,
          snapshot_date: today,
          total_geral: snapshot.total_geral,
          total_federal: snapshot.total_por_fonte.federal,
          total_estadual: snapshot.total_por_fonte.estadual,
          total_municipal: snapshot.total_por_fonte.municipal,
          total_outros: snapshot.total_por_fonte.outros,
          qtd_empresas_com_debito: snapshot.qtd_empresas_com_debito,
          qtd_empresas_total: snapshot.rows.length,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,snapshot_date" },
      )
    if (error) {
      console.warn("[carteira-snapshot] upsert failed:", error.message)
    }
  } catch (err) {
    console.warn("[carteira-snapshot] unexpected:", err)
  }
}
