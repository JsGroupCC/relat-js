import "server-only"

import OpenAI from "openai"

import { handlers, type DocumentTypeId } from "@/lib/documents/registry"

export interface ClassificationResult {
  typeId: DocumentTypeId | null
  confidence: number // 0..1
  reason?: string
  /**
   * O modelo identificou que o PDF é uma imagem digitalizada sem camada de
   * texto (scan/foto). Nesses casos, a extração estruturada por LLM falha:
   * o PDF precisa passar por OCR ou ser exportado de novo a partir do site.
   */
  looksScanned: boolean
  tokensInput: number
  tokensOutput: number
  costUsd: number
}

// gpt-4o-mini é bem mais barato que gpt-5.5 e suficiente pra classificação
// (vê só a primeira página do PDF). Pricing: ~$0.15/M input, $0.60/M output.
const CLASSIFIER_MODEL = "gpt-4o-mini"
const PRICING_PER_M = { input: 0.15, output: 0.6 } as const

/**
 * Classifica o tipo de documento fiscal usando GPT-4o-mini sobre a primeira
 * página do PDF. Custa centavos; leva ~2s.
 *
 * Retorna typeId=null + confidence baixa quando o documento não casa com
 * nenhum dos handlers registrados — caller marca o relatório como `failed`
 * com mensagem clara.
 *
 * Por design: se só existe 1 handler registrado, pula o classifier e
 * retorna direto esse tipo (economia em ambientes com handler único).
 */
export async function classifyDocument(
  pdfBytes: Uint8Array,
  pdfFilename: string,
): Promise<ClassificationResult> {
  const handlerEntries = Object.entries(handlers) as Array<
    [DocumentTypeId, (typeof handlers)[DocumentTypeId]]
  >

  if (handlerEntries.length === 0) {
    return {
      typeId: null,
      confidence: 0,
      reason: "Nenhum handler registrado.",
      looksScanned: false,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
    }
  }

  if (handlerEntries.length === 1) {
    const [onlyId] = handlerEntries[0]
    return {
      typeId: onlyId,
      confidence: 1,
      reason: "single_handler_default",
      looksScanned: false,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada — classifier requer OpenAI.")
  }
  const client = new OpenAI({ apiKey })

  const optionsText = handlerEntries
    .map(
      ([id, h]) =>
        `- "${id}": ${h.displayName} — categoria ${h.category}`,
    )
    .join("\n")

  // Sobe o PDF como Files API; gpt-4o-mini só vê a primeira página por
  // design da nossa instrução (ainda assim mais barato que mandar todas).
  const file = await client.files.create({
    file: await OpenAI.toFile(pdfBytes, pdfFilename, {
      type: "application/pdf",
    }),
    purpose: "user_data",
  })

  try {
    const response = await client.responses.create({
      model: CLASSIFIER_MODEL,
      input: [
        {
          role: "system",
          content:
            "Você classifica documentos fiscais brasileiros. Olhe APENAS o cabeçalho/primeira página do PDF para identificar a origem. Devolva exatamente um dos IDs listados ou 'unknown' se não bater com nenhum. Se o PDF parecer ser uma imagem digitalizada/escaneada (sem camada de texto selecionável — letras pixeladas, alinhamento torto, marcas de scanner), marque looksScanned=true; caso contrário, false.",
        },
        {
          role: "user",
          content: [
            { type: "input_file", file_id: file.id },
            {
              type: "input_text",
              text: `Tipos disponíveis:\n${optionsText}\n\nResponda em JSON: {"typeId": "<id ou 'unknown'>", "confidence": 0..1, "reason": "frase curta", "looksScanned": true|false}.`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["typeId", "confidence", "reason", "looksScanned"],
            properties: {
              typeId: { type: "string" },
              confidence: { type: "number" },
              reason: { type: "string" },
              looksScanned: { type: "boolean" },
            },
          },
        },
      },
    })

    const parsed = JSON.parse(response.output_text) as {
      typeId: string
      confidence: number
      reason: string
      looksScanned: boolean
    }

    const tokensInput = response.usage?.input_tokens ?? 0
    const tokensOutput = response.usage?.output_tokens ?? 0
    const costUsd =
      (tokensInput / 1_000_000) * PRICING_PER_M.input +
      (tokensOutput / 1_000_000) * PRICING_PER_M.output

    const validIds = new Set(handlerEntries.map(([id]) => id))
    const typeId =
      parsed.typeId && validIds.has(parsed.typeId as DocumentTypeId)
        ? (parsed.typeId as DocumentTypeId)
        : null

    return {
      typeId,
      confidence: parsed.confidence ?? 0,
      reason: parsed.reason,
      looksScanned: parsed.looksScanned ?? false,
      tokensInput,
      tokensOutput,
      costUsd,
    }
  } finally {
    client.files.delete(file.id).catch(() => {})
  }
}
