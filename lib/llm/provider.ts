// Provider-agnostic interface. Concrete implementations (anthropic.ts, openai.ts)
// arrive in Sprint 1.

export interface LLMExtractionRequest {
  pdfBytes: Uint8Array
  pdfFilename: string
  prompt: string
  jsonSchema: object
  model?: string
}

export interface LLMExtractionResult<T = unknown> {
  data: T
  raw: unknown
  provider: "anthropic" | "openai"
  model: string
  tokensInput: number
  tokensOutput: number
  costUsd: number
}

export interface LLMProvider {
  readonly name: "anthropic" | "openai"
  extract<T = unknown>(req: LLMExtractionRequest): Promise<LLMExtractionResult<T>>
}
