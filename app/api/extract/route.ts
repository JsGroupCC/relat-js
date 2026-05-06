import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentOrg } from "@/lib/auth/current-org"
import { DEFAULT_DOCUMENT_TYPE, handlers } from "@/lib/documents/registry"
import { extractWithFallback } from "@/lib/llm"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

const bodySchema = z.object({
  relatorioId: z.string().uuid(),
})

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

    // Sprint 1: único handler — assumimos relatorio-situacao-fiscal por padrão.
    // Quando suportarmos múltiplos tipos, classificamos via LLM aqui.
    const documentType = DEFAULT_DOCUMENT_TYPE
    const handler = handlers[documentType]

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
