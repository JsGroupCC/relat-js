import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { handlers, type DocumentTypeId } from "@/lib/documents/registry"
import type {
  AnyDocumentHandler,
  DocumentSummary,
} from "@/lib/documents/types"
import { createClient } from "@/lib/supabase/server"
import type { RelatorioRow } from "@/types/database"

export interface SourceSnapshot {
  documentType: DocumentTypeId
  handler: AnyDocumentHandler
  relatorio: RelatorioRow
  summary: DocumentSummary
}

/**
 * Para cada tipo de documento registrado, encontra o relatório verificado
 * mais recente da empresa e calcula o summary daquele tipo. Permite
 * /empresas/[cnpj] mostrar lado a lado os 3 (ou N) cards de saúde fiscal.
 *
 * Retorna apenas os tipos que TÊM um relatório verified — categorias sem
 * dados ficam fora do array.
 */
export async function loadEmpresaSnapshot(
  empresaId: string,
): Promise<SourceSnapshot[]> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  // Pega todos os relatórios verified, ordenados, e extrai o mais recente
  // de cada document_type.
  const { data: relatorios, error: relErr } = await supabase
    .from("relatorios")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("empresa_id", empresaId)
    .eq("status", "verified")
    .order("data_emissao_documento", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (relErr) throw relErr
  if (!relatorios || relatorios.length === 0) return []

  // Mantém só o primeiro de cada document_type (já vem ordenado mais
  // recente primeiro).
  const latestByType = new Map<string, RelatorioRow>()
  for (const r of relatorios) {
    if (!latestByType.has(r.document_type)) {
      latestByType.set(r.document_type, r)
    }
  }

  if (latestByType.size === 0) return []

  const ids = Array.from(latestByType.values()).map((r) => r.id)
  const { data: extracoes, error: extErr } = await supabase
    .from("extracoes")
    .select("relatorio_id, verified_json, raw_json")
    .in("relatorio_id", ids)
  if (extErr) throw extErr

  const byRelatorio = new Map<string, unknown>()
  for (const e of extracoes ?? []) {
    byRelatorio.set(e.relatorio_id, e.verified_json ?? e.raw_json)
  }

  const result: SourceSnapshot[] = []
  for (const [docType, relatorio] of latestByType.entries()) {
    if (!(docType in handlers)) continue
    // Cast para AnyDocumentHandler — TypeScript não consegue inferir que
    // schema.parse() devolve o T do mesmo handler quando o registry é
    // heterogêneo (cada chave do mapa tem T diferente).
    const handler = handlers[docType as DocumentTypeId] as AnyDocumentHandler
    const raw = byRelatorio.get(relatorio.id)
    if (!raw) continue
    const parsed = handler.schema.safeParse(raw)
    if (!parsed.success) continue
    const summary = handler.computeSummary(parsed.data)
    result.push({
      documentType: docType as DocumentTypeId,
      handler,
      relatorio,
      summary,
    })
  }

  return result.sort((a, b) =>
    a.handler.displayName.localeCompare(b.handler.displayName),
  )
}
