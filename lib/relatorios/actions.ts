"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { recordAudit } from "@/lib/audit/log"
import { getCurrentOrg } from "@/lib/auth/current-org"
import { getHandlerOrNull } from "@/lib/documents/registry"
import { createClient } from "@/lib/supabase/server"
import { stripCnpj } from "@/lib/utils/cnpj"
import type { DebitoInsert, Json } from "@/types/database"

interface ConfirmReviewArgs {
  relatorioId: string
  verifiedData: unknown
}

/**
 * Confirma a revisão humana. Genérico para qualquer handler:
 *  - valida verifiedData via handler.schema
 *  - extrai contribuinte (cnpj+razão social) via handler.extractContribuinte
 *  - cria/encontra empresa por CNPJ
 *  - extrai linhas de débitos via handler.extractDebitos (com data_emissao)
 *  - salva extracoes.verified_json
 *  - delete-then-insert em debitos (idempotência)
 *  - status='verified' + verified_at + redirect pro dashboard
 *
 * Cada handler é responsável por mapear seu schema próprio para a forma
 * comum de débitos. Esta função não conhece detalhes de RFB, SEFIN, etc.
 */
export async function confirmReviewAction(args: ConfirmReviewArgs) {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: relatorio, error: relError } = await supabase
    .from("relatorios")
    .select(
      "id, organization_id, document_type, status, empresa_id, data_emissao_documento",
    )
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

  const data = validated.data

  // Empresa (idempotente por org+cnpj) — handler diz onde achar a identificação.
  const contribuinte = handler.extractContribuinte(data)
  let empresaId = relatorio.empresa_id
  if (!empresaId && contribuinte.cnpj) {
    empresaId = await ensureEmpresa(
      supabase,
      ctx.organizationId,
      contribuinte.cnpj,
      contribuinte.razao_social,
    )
  }

  // Salva verified_json
  const { error: extError } = await supabase
    .from("extracoes")
    .update({ verified_json: data as unknown as Json })
    .eq("relatorio_id", args.relatorioId)
  if (extError) throw extError

  // Popula tabela debitos via mapper do handler — recria do zero pra idempotência
  const { rows: debitoRows, data_emissao } = handler.extractDebitos(data)
  if (empresaId) {
    await supabase.from("debitos").delete().eq("relatorio_id", args.relatorioId)

    if (debitoRows.length > 0) {
      const inserts: DebitoInsert[] = debitoRows.map((r) => ({
        organization_id: ctx.organizationId,
        empresa_id: empresaId,
        relatorio_id: args.relatorioId,
        tipo: r.tipo,
        receita_codigo: r.receita_codigo,
        receita_descricao: r.receita_descricao,
        periodo_apuracao: r.periodo_apuracao,
        data_vencimento: r.data_vencimento,
        valor_original: r.valor_original,
        saldo_devedor: r.saldo_devedor,
        multa: r.multa,
        juros: r.juros,
        saldo_consolidado: r.saldo_consolidado,
        situacao: r.situacao,
      }))
      const { error: insertError } = await supabase
        .from("debitos")
        .insert(inserts)
      if (insertError) throw insertError
    }
  }

  // Atualiza relatorio
  const { error: finalError } = await supabase
    .from("relatorios")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      empresa_id: empresaId,
      data_emissao_documento:
        data_emissao ?? relatorio.data_emissao_documento ?? null,
    })
    .eq("id", args.relatorioId)
  if (finalError) throw finalError

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "relatorio.verify",
    resourceType: "relatorio",
    resourceId: args.relatorioId,
    metadata: {
      document_type: relatorio.document_type,
      empresa_id: empresaId,
      debitos_count: debitoRows.length,
    },
  })

  revalidatePath(`/relatorios/${args.relatorioId}`)
  revalidatePath(`/relatorios/${args.relatorioId}/revisar`)
  revalidatePath("/dashboard")
  revalidatePath("/empresas")

  redirect(`/relatorios/${args.relatorioId}`)
}

async function ensureEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  cnpj: string,
  razaoSocial: string | null,
): Promise<string> {
  const cnpjNormalized = stripCnpj(cnpj)

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

/**
 * Deleta permanentemente um relatório, incluindo:
 * - linha em `relatorios` (CASCADE apaga `extracoes`, `debitos`, `relatorio_shares`)
 * - PDF do Storage `fiscal-documents` (best-effort; falha aqui não bloqueia o delete da linha)
 *
 * RLS já garante que só membros da org conseguem apagar.
 */
export async function deleteRelatorioAction(relatorioId: string): Promise<void> {
  const ctx = await getCurrentOrg()
  const supabase = await createClient()

  const { data: relatorio, error: fetchError } = await supabase
    .from("relatorios")
    .select("id, organization_id, pdf_path, pdf_filename, document_type")
    .eq("id", relatorioId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!relatorio) throw new Error("Relatório não encontrado.")

  if (relatorio.pdf_path && relatorio.pdf_path !== "pending") {
    await supabase.storage
      .from("fiscal-documents")
      .remove([relatorio.pdf_path])
      .catch((err) => {
        console.warn("Falha ao apagar PDF do Storage:", err)
      })
  }

  const { error: deleteError } = await supabase
    .from("relatorios")
    .delete()
    .eq("id", relatorioId)
    .eq("organization_id", ctx.organizationId)
  if (deleteError) throw deleteError

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "relatorio.delete",
    resourceType: "relatorio",
    resourceId: relatorioId,
    metadata: {
      pdf_filename: relatorio.pdf_filename,
      document_type: relatorio.document_type,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/empresas")
  redirect("/dashboard")
}
