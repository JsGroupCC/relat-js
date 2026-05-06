import "server-only"

import { AnthropicProvider } from "./anthropic"
import { OpenAIProvider } from "./openai"
import type {
  LLMExtractionRequest,
  LLMExtractionResult,
  LLMProvider,
} from "./provider"

export type { LLMProvider, LLMExtractionRequest, LLMExtractionResult } from "./provider"

type ProviderId = "anthropic" | "openai"

function buildProvider(id: ProviderId): LLMProvider {
  if (id === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY não configurada.")
    }
    return new AnthropicProvider(key)
  }
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error("OPENAI_API_KEY não configurada.")
  }
  return new OpenAIProvider(key)
}

function getPrimaryProvider(): ProviderId {
  const value = process.env.LLM_PRIMARY_PROVIDER?.toLowerCase()
  if (value === "openai") return "openai"
  return "anthropic"
}

function getFallbackProvider(primary: ProviderId): ProviderId | null {
  const fallback: ProviderId = primary === "anthropic" ? "openai" : "anthropic"
  const key =
    fallback === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY
  return key ? fallback : null
}

/**
 * Tenta extrair com o provider primário; se falhar (rede, rate limit, schema
 * inválido devolvido pela LLM), tenta o fallback automaticamente.
 */
export async function extractWithFallback<T = unknown>(
  req: LLMExtractionRequest,
): Promise<LLMExtractionResult<T>> {
  const primary = getPrimaryProvider()
  try {
    const provider = buildProvider(primary)
    return await provider.extract<T>(req)
  } catch (primaryError) {
    const fallback = getFallbackProvider(primary)
    if (!fallback) {
      throw primaryError
    }
    try {
      const provider = buildProvider(fallback)
      return await provider.extract<T>(req)
    } catch (fallbackError) {
      const primaryMessage =
        primaryError instanceof Error ? primaryError.message : String(primaryError)
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      throw new Error(
        `Ambos os providers falharam. Primário (${primary}): ${primaryMessage}. Fallback (${fallback}): ${fallbackMessage}.`,
      )
    }
  }
}
