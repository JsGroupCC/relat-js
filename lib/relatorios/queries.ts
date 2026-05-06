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
