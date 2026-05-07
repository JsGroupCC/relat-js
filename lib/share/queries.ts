import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { getHandlerOrNull } from "@/lib/documents/registry"
import type { AnyDocumentHandler } from "@/lib/documents/types"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export interface SharedRelatorio {
  relatorio: {
    id: string
    document_type: string
    pdf_filename: string
    data_emissao_documento: string | null
  }
  data: unknown // validated by handler.schema downstream
  handler: AnyDocumentHandler
  empresa: { cnpj: string; razao_social: string | null; nome_fantasia: string | null } | null
}

/**
 * Cliente Supabase com a chave PUBLIC ANON. Não autenticado, não persiste
 * sessão. Usado para chamar RPCs `get_shared_relatorio` e `increment_share_view`,
 * ambas SECURITY DEFINER (validam o token internamente antes de retornar dados).
 *
 * Não exige SUPABASE_SERVICE_ROLE_KEY — toda autorização vive no SQL.
 */
function publicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

interface RpcShape {
  relatorio: {
    id: string
    document_type: string
    pdf_filename: string
    data_emissao_documento: string | null
    status: string
  }
  extracao: unknown
  empresa: {
    cnpj: string
    razao_social: string | null
    nome_fantasia: string | null
  } | null
}

export async function loadSharedRelatorio(
  token: string,
): Promise<SharedRelatorio | null> {
  if (!token || token.length < 16 || token.length > 128) return null

  const pub = publicClient()
  const { data, error } = await pub.rpc(
    "get_shared_relatorio" as never,
    { p_token: token } as never,
  )
  if (error) {
    console.error("get_shared_relatorio failed:", error)
    return null
  }
  if (!data) return null

  const payload = data as RpcShape
  if (!payload.relatorio || !payload.extracao) return null
  if (payload.relatorio.status !== "verified") return null

  const handler = getHandlerOrNull(payload.relatorio.document_type)
  if (!handler) return null

  // Incrementa view_count (best-effort, não bloqueia a renderização)
  pub
    .rpc("increment_share_view" as never, { p_token: token } as never)
    .then(() => {})

  return {
    relatorio: {
      id: payload.relatorio.id,
      document_type: payload.relatorio.document_type,
      pdf_filename: payload.relatorio.pdf_filename,
      data_emissao_documento: payload.relatorio.data_emissao_documento,
    },
    data: payload.extracao,
    handler,
    empresa: payload.empresa,
  }
}

export interface ActiveShareInfo {
  token: string
  created_at: string
  expires_at: string | null
  view_count: number
  last_viewed_at: string | null
}

/**
 * Para a página interna do relatório: devolve o share ativo (não revogado,
 * não expirado) com contadores de visualização. null se não tem share.
 */
export async function loadActiveShareForRelatorio(
  relatorioId: string,
): Promise<ActiveShareInfo | null> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("relatorio_shares")
    .select("token, created_at, expires_at, view_count, last_viewed_at")
    .eq("relatorio_id", relatorioId)
    .eq("organization_id", ctx.organizationId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return null

  return data
}
