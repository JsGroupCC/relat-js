import "server-only"

import Anthropic from "@anthropic-ai/sdk"

import type {
  LLMExtractionRequest,
  LLMExtractionResult,
  LLMProvider,
} from "./provider"

// Pricing per 1M tokens (input / output) — claude-sonnet-4-5.
// Mantemos uma tabela local para conseguir estimar custo sem chamada extra.
const PRICING_PER_M = {
  input: 3,
  output: 15,
} as const

const DEFAULT_MODEL = "claude-sonnet-4-5"

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async extract<T = unknown>(
    req: LLMExtractionRequest,
  ): Promise<LLMExtractionResult<T>> {
    const model = req.model ?? DEFAULT_MODEL

    const pdfBase64 = Buffer.from(req.pdfBytes).toString("base64")

    const response = await this.client.messages.create({
      model,
      max_tokens: 16000,
      system: req.prompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: "Extraia o JSON estruturado do documento conforme o schema solicitado.",
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          // O JSON Schema é construído a partir do Zod do handler.
          schema: req.jsonSchema as Record<string, unknown>,
        },
      },
    })

    const data = extractJson<T>(response.content)
    const tokensInput = response.usage.input_tokens
    const tokensOutput = response.usage.output_tokens
    const costUsd =
      (tokensInput / 1_000_000) * PRICING_PER_M.input +
      (tokensOutput / 1_000_000) * PRICING_PER_M.output

    return {
      data,
      raw: response,
      provider: "anthropic",
      model,
      tokensInput,
      tokensOutput,
      costUsd,
    }
  }
}

function extractJson<T>(content: Anthropic.ContentBlock[]): T {
  for (const block of content) {
    if (block.type === "text") {
      const text = block.text.trim()
      try {
        return JSON.parse(text) as T
      } catch {
        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
          return JSON.parse(match[0]) as T
        }
      }
    }
  }
  throw new Error("Anthropic provider: no JSON content returned by the model.")
}
