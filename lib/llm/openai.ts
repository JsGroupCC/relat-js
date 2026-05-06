import "server-only"

import OpenAI from "openai"

import type {
  LLMExtractionRequest,
  LLMExtractionResult,
  LLMProvider,
} from "./provider"

// Pricing per 1M tokens (input / output) — gpt-5.5 (placeholder; valide em platform.openai.com/pricing).
const PRICING_PER_M = {
  input: 5,
  output: 15,
} as const

const DEFAULT_MODEL = "gpt-5.5"

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async extract<T = unknown>(
    req: LLMExtractionRequest,
  ): Promise<LLMExtractionResult<T>> {
    const model = req.model ?? DEFAULT_MODEL

    // Sobe o PDF como Files API para passá-lo como input ao modelo.
    const file = await this.client.files.create({
      file: await OpenAI.toFile(req.pdfBytes, req.pdfFilename, {
        type: "application/pdf",
      }),
      purpose: "user_data",
    })

    try {
      const response = await this.client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: req.prompt,
          },
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_id: file.id,
              },
              {
                type: "input_text",
                text: "Extraia o JSON estruturado do documento conforme o schema solicitado.",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "relatorio_extracao",
            // strict=false: campos opcionais do Zod (.nullable()) e
            // additionalProperties=true em alguns sub-objetos não são aceitos
            // em strict=true. O schema próprio do handler já guia o modelo.
            strict: false,
            schema: req.jsonSchema as Record<string, unknown>,
          },
        },
      })

      const text = response.output_text
      const data = JSON.parse(text) as T

      const tokensInput = response.usage?.input_tokens ?? 0
      const tokensOutput = response.usage?.output_tokens ?? 0
      const costUsd =
        (tokensInput / 1_000_000) * PRICING_PER_M.input +
        (tokensOutput / 1_000_000) * PRICING_PER_M.output

      return {
        data,
        raw: response,
        provider: "openai",
        model,
        tokensInput,
        tokensOutput,
        costUsd,
      }
    } finally {
      // best-effort cleanup do file no OpenAI
      this.client.files.delete(file.id).catch(() => {})
    }
  }
}
