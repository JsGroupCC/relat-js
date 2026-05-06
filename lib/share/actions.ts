"use server"

import crypto from "node:crypto"
import { revalidatePath } from "next/cache"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"

export interface ShareLinkResult {
  ok: boolean
  url?: string
  token?: string
  error?: string
}

/**
 * Cria (ou reusa) um link público para o relatório. Idempotente: se já existe
 * share ativo (não revogado, não expirado), devolve o existente em vez de
 * gerar token novo. Isso evita acumular tokens órfãos quando o usuário clica
 * "Compartilhar" várias vezes.
 */
export async function createShareLinkAction(
  relatorioId: string,
): Promise<ShareLinkResult> {
  try {
    const ctx = await getCurrentOrg()
    const supabase = await createClient()

    // Confirma que o relatório é da org do usuário e está verified
    const { data: relatorio, error: relErr } = await supabase
      .from("relatorios")
      .select("id, status")
      .eq("id", relatorioId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle()
    if (relErr) return { ok: false, error: relErr.message }
    if (!relatorio) return { ok: false, error: "Relatório não encontrado." }
    if (relatorio.status !== "verified") {
      return {
        ok: false,
        error: "Confirme a revisão do relatório antes de compartilhar.",
      }
    }

    // Procura share ativo existente
    const { data: existing } = await supabase
      .from("relatorio_shares")
      .select("token, expires_at, revoked_at")
      .eq("relatorio_id", relatorioId)
      .eq("organization_id", ctx.organizationId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const isActive =
      existing &&
      (!existing.expires_at || new Date(existing.expires_at) > new Date())

    let token: string
    if (isActive && existing) {
      token = existing.token
    } else {
      // Token aleatório de 32 chars hex (128 bits) — não-adivinhável
      token = crypto.randomBytes(16).toString("hex")
      const { error: insertErr } = await supabase
        .from("relatorio_shares")
        .insert({
          organization_id: ctx.organizationId,
          relatorio_id: relatorioId,
          token,
          created_by: ctx.userId,
        })
      if (insertErr) return { ok: false, error: insertErr.message }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "https://relat-js.vercel.app"
    const url = `${baseUrl}/share/${token}`

    revalidatePath(`/relatorios/${relatorioId}`)
    return { ok: true, url, token }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao gerar link.",
    }
  }
}

export async function revokeShareLinkAction(
  relatorioId: string,
): Promise<ShareLinkResult> {
  try {
    const ctx = await getCurrentOrg()
    const supabase = await createClient()

    const { error } = await supabase
      .from("relatorio_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("relatorio_id", relatorioId)
      .eq("organization_id", ctx.organizationId)
      .is("revoked_at", null)
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/relatorios/${relatorioId}`)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao revogar link.",
    }
  }
}
