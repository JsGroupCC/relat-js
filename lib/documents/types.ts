import type { ComponentType } from "react"
import type { ZodSchema } from "zod"

export type DocumentCategory =
  | "fiscal"
  | "tributario"
  | "previdenciario"
  | "outros"

export interface DocumentSummary {
  total_geral: number
  quantidade_debitos: number
  [key: string]: unknown
}

export interface DocumentHandler<T = unknown> {
  id: string
  displayName: string
  category: DocumentCategory

  detect: (pdfText: string) => number

  schema: ZodSchema<T>
  extractionPrompt: string
  extractionSchema: object

  ReviewForm: ComponentType<{ data: T; onChange: (d: T) => void }>
  Dashboard: ComponentType<{ data: T; history?: T[] }>

  generateText: (data: T) => string
  computeSummary: (data: T) => DocumentSummary
}

/**
 * Storage type for the registry. `unknown` em invariant positions cria
 * incompatibilidade com handlers concretos (ReviewForm/onChange é
 * contravariante). Aqui declaramos as assinaturas como `(data: any) =>`
 * para permitir que o registry guarde handlers de tipos heterogêneos —
 * o consumidor reidrata o tipo via `schema` ou via cast explícito.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDocumentHandler = DocumentHandler<any>
