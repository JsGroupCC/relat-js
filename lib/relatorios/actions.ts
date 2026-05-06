"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { getHandlerOrNull } from "@/lib/documents/registry"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

import type {
  Debito,
  RelatorioSituacaoFiscal,
} from "@/lib/documents/handlers/relatorio-situacao-fiscal"

interface ConfirmReviewArgs {
  relatorioId: string
  verifiedData: unknown
}

/**
 * Confirma a revisão humana:
 *  - valida verifiedData contra o schema do handler
 *  - salva extracoes.verified_json
 *  - garante que existe empresa (cnpj+org) e linka relatório
 *  - popula tabela debitos (SIEF / suspensos / PGFN) idempotentemente
 *  - atualiza relatorios.status='verified' + verified_at
 *
 * O handler usado é determinado pelo relatorio.document_type. Esta função
 * é genérica, mas hoje o único handler é o "relatorio-situacao-fiscal" e
 * a normalização de débitos é específica dele. Quando adicionarmos handlers
 * que também tenham débitos, mover o "como popular débitos" para o handler.
 */
export async function confirmReviewAction(args: ConfirmReviewArgs) {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: relatorio, error: relError } = await supabase
    .from("relatorios")
    .select("id, organization_id, document_type, status, empresa_id, data_emissao_documento")
    .eq("id", args.relatorioId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()
  if (relError) throw relError
  if (!relatorio) throw new Error("Relatório não encontrado.")
  if (relatorio.status !== "reviewing" && relatorio.status !== "verified") {
    throw new Error(
      `Status atual (${relatorio.status}) não permite confirmar a revisão.`,
    )
  }

  const handler = getHandlerOrNull(relatorio.document_type)
  if (!handler) {
    throw new Error(
      `Handler não encontrado para o tipo ${relatorio.document_type}.`,
    )
  }

  const validated = handler.schema.safeParse(args.verifiedData)
  if (!validated.success) {
    throw new Error(
      `Dados inválidos: ${validated.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    )
  }

  const data = validated.data as RelatorioSituacaoFiscal

  // Empresa (idempotente por org+cnpj)
  let empresaId = relatorio.empresa_id
  if (!empresaId && data.empresa?.cnpj) {
    empresaId = await ensureEmpresa(
      supabase,
      ctx.organizationId,
      data.empresa.cnpj,
      data.empresa.razao_social,
    )
  }

  // Salva verified_json
  const { error: extError } = await supabase
    .from("extracoes")
    .update({ verified_json: data as unknown as Json })
    .eq("relatorio_id", args.relatorioId)
  if (extError) throw extError

  // Popula tabela debitos — recria do zero (delete + insert) para idempotência
  if (empresaId) {
    await supabase.from("debitos").delete().eq("relatorio_id", args.relatorioId)
    await insertDebitos(
      supabase,
      ctx.organizationId,
      empresaId,
      args.relatorioId,
      data,
    )
  }

  // Atualiza relatorio
  const { error: finalError } = await supabase
    .from("relatorios")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      empresa_id: empresaId,
    })
    .eq("id", args.relatorioId)
  if (finalError) throw finalError

  revalidatePath(`/relatorios/${args.relatorioId}`)
  revalidatePath(`/relatorios/${args.relatorioId}/revisar`)
  revalidatePath("/dashboard")

  redirect(`/relatorios/${args.relatorioId}`)
}

async function ensureEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  cnpj: string,
  razaoSocial: string | null,
): Promise<string> {
  const cnpjNormalized = cnpj.replace(/[^\d]/g, "")

  const { data: existing } = await supabase
    .from("empresas")
    .select("id")
    .eq("organization_id", orgId)
    .eq("cnpj", cnpjNormalized)
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from("empresas")
    .insert({
      organization_id: orgId,
      cnpj: cnpjNormalized,
      razao_social: razaoSocial,
    })
    .select("id")
    .single()
  if (error || !created) {
    throw error ?? new Error("Falha ao criar empresa.")
  }
  return created.id
}

async function insertDebitos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  empresaId: string,
  relatorioId: string,
  data: RelatorioSituacaoFiscal,
) {
  const rows: Array<{
    organization_id: string
    empresa_id: string
    relatorio_id: string
    tipo: string
    receita_codigo: string | null
    receita_descricao: string | null
    periodo_apuracao: string | null
    data_vencimento: string | null
    valor_original: number | null
    saldo_devedor: number | null
    multa: number | null
    juros: number | null
    saldo_consolidado: number | null
    situacao: string | null
  }> = []

  const push = (tipo: "sief" | "suspenso" | "pgfn", debito: Debito) => {
    rows.push({
      organization_id: orgId,
      empresa_id: empresaId,
      relatorio_id: relatorioId,
      tipo,
      receita_codigo: debito.receita_codigo ?? null,
      receita_descricao: debito.receita_descricao ?? null,
      periodo_apuracao: debito.periodo_apuracao ?? null,
      data_vencimento: debito.data_vencimento || null,
      valor_original: debito.valor_original ?? null,
      saldo_devedor: debito.saldo_devedor ?? null,
      multa: debito.multa,
      juros: debito.juros,
      saldo_consolidado: debito.saldo_consolidado,
      situacao: debito.situacao ?? null,
    })
  }

  for (const d of data.pendencias_sief) push("sief", d)
  for (const d of data.debitos_exigibilidade_suspensa) push("suspenso", d)
  for (const d of data.pgfn.debitos) push("pgfn", d)

  if (rows.length === 0) return

  const { error } = await supabase.from("debitos").insert(rows)
  if (error) throw error
}
