import "server-only"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { getHandlerOrNull } from "@/lib/documents/registry"
import type { AnyDocumentHandler } from "@/lib/documents/types"
import { createClient } from "@/lib/supabase/server"
import type { ExtracaoRow, RelatorioRow } from "@/types/database"

export interface RelatorioBundle {
  relatorio: RelatorioRow
  extracao: ExtracaoRow | null
  pdfUrl: string | null
  handler: AnyDocumentHandler
}

const SIGNED_URL_TTL_SECONDS = 60 * 30 // 30 min

/**
 * Carrega tudo que a UI de revisão / dashboard precisa de uma vez:
 * relatório, extração mais recente, URL assinada do PDF e handler do tipo
 * de documento. RLS garante que só relatórios da org do usuário aparecem.
 */
export async function loadRelatorioBundle(
  relatorioId: string,
): Promise<RelatorioBundle | null> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: relatorio, error: relError } = await supabase
    .from("relatorios")
    .select("*")
    .eq("id", relatorioId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()

  if (relError) throw relError
  if (!relatorio) return null

  const handler = getHandlerOrNull(relatorio.document_type)
  if (!handler) return null

  const { data: extracao, error: extError } = await supabase
    .from("extracoes")
    .select("*")
    .eq("relatorio_id", relatorioId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (extError) throw extError

  let pdfUrl: string | null = null
  if (relatorio.pdf_path && relatorio.pdf_path !== "pending") {
    const { data: signed } = await supabase.storage
      .from("fiscal-documents")
      .createSignedUrl(relatorio.pdf_path, SIGNED_URL_TTL_SECONDS)
    pdfUrl = signed?.signedUrl ?? null
  }

  return { relatorio, extracao, pdfUrl, handler }
}

export interface ReviewQueueInfo {
  /** total de relatórios em status reviewing na org */
  total: number
  /** posição do relatorioId na fila (1-indexed) — null se não está na fila */
  position: number | null
  /** id do próximo reviewing após este (na ordem de criação ASC) — null se for o último */
  nextId: string | null
}

/**
 * Posição do relatório na fila de revisão da org. Usado pra mostrar
 * "Revisão 2 de 3" no header e pro confirmReviewAction saber pra onde
 * mandar o usuário depois de confirmar.
 *
 * Ordem ASC por created_at — quem foi enviado primeiro aparece primeiro.
 * Faz sentido pra batches de upload: a UI segue na mesma ordem do dropzone.
 */
export async function loadReviewQueueInfo(
  relatorioId: string,
): Promise<ReviewQueueInfo> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: queue } = await supabase
    .from("relatorios")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "reviewing")
    .order("created_at", { ascending: true })

  const ids = (queue ?? []).map((r) => r.id)
  const idx = ids.indexOf(relatorioId)
  return {
    total: ids.length,
    position: idx >= 0 ? idx + 1 : null,
    nextId:
      idx >= 0 && idx + 1 < ids.length ? ids[idx + 1] : null,
  }
}

/**
 * Pega o primeiro relatório reviewing da org. Usado pelo
 * confirmReviewAction quando o relatório atual NÃO está na fila (ex.: já
 * foi confirmado e o usuário voltou) — assim ele acha o próximo da fila
 * mesmo sem indexOf.
 */
export async function getFirstReviewingRelatorioId(): Promise<string | null> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()
  const { data } = await supabase
    .from("relatorios")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "reviewing")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}
