import crypto from "node:crypto"

import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentOrg } from "@/lib/auth/current-org"
import {
  DEFAULT_DOCUMENT_TYPE,
  getHandlerOrNull,
  handlers,
  type DocumentTypeId,
} from "@/lib/documents/registry"
import { classifyDocument } from "@/lib/llm/classifier"
import { extractWithFallback } from "@/lib/llm"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
// Vercel Hobby permite até 300s. Necessário para PDFs grandes (UVT 10 páginas
// pode demorar 30-50s no gpt-5.5).
export const maxDuration = 300

const bodySchema = z.object({
  relatorioId: z.string().uuid(),
})

const MIN_CONFIDENCE = 0.5

export async function POST(request: Request) {
  let relatorioId: string | null = null

  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", details: z.flattenError(parsed.error) },
        { status: 400 },
      )
    }
    relatorioId = parsed.data.relatorioId

    const ctx = await getCurrentOrg()
    const supabase = await createClient()

    const { data: relatorio, error: relError } = await supabase
      .from("relatorios")
      .select(
        "id, organization_id, document_type, pdf_path, pdf_filename, status",
      )
      .eq("id", relatorioId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle()

    if (relError) throw relError
    if (!relatorio) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    if (relatorio.status !== "pending" && relatorio.status !== "failed") {
      return NextResponse.json(
        { error: "invalid_status", status: relatorio.status },
        { status: 409 },
      )
    }

    await supabase
      .from("relatorios")
      .update({ status: "extracting", error_message: null })
      .eq("id", relatorioId)

    const { data: blob, error: dlError } = await supabase.storage
      .from("fiscal-documents")
      .download(relatorio.pdf_path)
    if (dlError || !blob) throw dlError ?? new Error("download_failed")
    const pdfBytes = new Uint8Array(await blob.arrayBuffer())

    // ---- A.2: Cache por hash do PDF -----------------------------------
    // SHA-256 dos bytes; lookup em (organization_id, pdf_sha256) para um
    // relatório verified anterior. Se achar, copia a extracao em vez de
    // re-chamar a LLM. Custo: zero (vs $0.10-0.30 da extração nova).
    const pdfSha256 = crypto.createHash("sha256").update(pdfBytes).digest("hex")

    await supabase
      .from("relatorios")
      .update({ pdf_sha256: pdfSha256 })
      .eq("id", relatorioId)

    const { data: cachedRelatorio } = await supabase
      .from("relatorios")
      .select("id, document_type, data_emissao_documento")
      .eq("organization_id", ctx.organizationId)
      .eq("pdf_sha256", pdfSha256)
      .eq("status", "verified")
      .neq("id", relatorioId)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cachedRelatorio) {
      const { data: cachedExtracao } = await supabase
        .from("extracoes")
        .select("raw_json, verified_json, llm_provider, llm_model, tokens_input, tokens_output, cost_usd")
        .eq("relatorio_id", cachedRelatorio.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cachedExtracao) {
        const dataToUse = cachedExtracao.verified_json ?? cachedExtracao.raw_json
        await supabase.from("extracoes").insert({
          relatorio_id: relatorioId,
          raw_json: dataToUse as never,
          llm_provider: cachedExtracao.llm_provider,
          llm_model: cachedExtracao.llm_model
            ? `${cachedExtracao.llm_model} (cached)`
            : "cached",
          tokens_input: 0,
          tokens_output: 0,
          cost_usd: 0,
        })

        await supabase
          .from("relatorios")
          .update({
            status: "reviewing",
            document_type: cachedRelatorio.document_type,
            data_emissao_documento: cachedRelatorio.data_emissao_documento,
          })
          .eq("id", relatorioId)

        return NextResponse.json({
          relatorioId,
          documentType: cachedRelatorio.document_type,
          provider: "cache",
          model: "cache",
          cached: true,
        })
      }
    }

    // ---- A.3: Detecção do tipo via LLM classifier ---------------------
    let documentType: DocumentTypeId
    if (Object.keys(handlers).length === 1) {
      // Só existe um handler — pula classifier (economia).
      documentType = DEFAULT_DOCUMENT_TYPE
    } else {
      const classification = await classifyDocument(pdfBytes, relatorio.pdf_filename)
      if (!classification.typeId || classification.confidence < MIN_CONFIDENCE) {
        return await failRelatorio(
          supabase,
          relatorioId,
          classification.reason
            ? `Tipo de documento não reconhecido (${classification.reason}). Suportamos hoje: ${describeHandlers()}.`
            : `Tipo de documento não reconhecido. Suportamos hoje: ${describeHandlers()}.`,
        )
      }
      documentType = classification.typeId
    }

    const handler = getHandlerOrNull(documentType)
    if (!handler) {
      return await failRelatorio(
        supabase,
        relatorioId,
        `Handler não disponível para tipo ${documentType}.`,
      )
    }

    const result = await extractWithFallback({
      pdfBytes,
      pdfFilename: relatorio.pdf_filename,
      prompt: handler.extractionPrompt,
      jsonSchema: handler.extractionSchema,
    })

    const validated = handler.schema.safeParse(result.data)
    if (!validated.success) {
      return await failRelatorio(
        supabase,
        relatorioId,
        `Schema inválido após extração: ${formatZodError(validated.error)}`,
      )
    }

    const { error: extracaoError } = await supabase.from("extracoes").insert({
      relatorio_id: relatorioId,
      raw_json: validated.data as never,
      llm_provider: result.provider,
      llm_model: result.model,
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      cost_usd: result.costUsd,
    })
    if (extracaoError) throw extracaoError

    const dataEmissao = readDataEmissao(validated.data)

    const { error: finalError } = await supabase
      .from("relatorios")
      .update({
        status: "reviewing",
        document_type: documentType,
        data_emissao_documento: dataEmissao,
      })
      .eq("id", relatorioId)
    if (finalError) throw finalError

    return NextResponse.json({
      relatorioId,
      documentType,
      provider: result.provider,
      model: result.model,
      cached: false,
    })
  } catch (err) {
    console.error("/api/extract error:", err)
    if (relatorioId) {
      const supabase = await createClient()
      await failRelatorio(
        supabase,
        relatorioId,
        err instanceof Error ? err.message : "Erro desconhecido na extração.",
      ).catch(() => {})
    }
    return NextResponse.json(
      { error: "extraction_failed", message: errorMessage(err) },
      { status: 500 },
    )
  }
}

async function failRelatorio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  message: string,
) {
  await supabase
    .from("relatorios")
    .update({ status: "failed", error_message: message })
    .eq("id", id)
  return NextResponse.json({ error: "extraction_failed", message }, { status: 422 })
}

function describeHandlers(): string {
  return Object.values(handlers)
    .map((h) => h.displayName)
    .join(", ")
}

function readDataEmissao(data: unknown): string | null {
  if (data && typeof data === "object" && "metadados_relatorio" in data) {
    const meta = (data as { metadados_relatorio?: { data_emissao?: unknown } })
      .metadados_relatorio
    if (meta && typeof meta.data_emissao === "string") {
      return meta.data_emissao
    }
  }
  return null
}

function formatZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ")
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
