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

export interface ReviewFormProps<T = unknown> {
  relatorioId: string
  data: T
}

export interface DashboardProps<T = unknown> {
  relatorioId: string
  data: T
  history?: T[]
}

export interface DocumentHandler<T = unknown> {
  id: string
  displayName: string
  category: DocumentCategory

  detect: (pdfText: string) => number

  schema: ZodSchema<T>
  extractionPrompt: string
  extractionSchema: object

  ReviewForm: ComponentType<ReviewFormProps<T>>
  Dashboard: ComponentType<DashboardProps<T>>

  generateText: (data: T) => string
  computeSummary: (data: T) => DocumentSummary
}

/**
 * Storage type for the registry. Handlers concretos têm `T` em posições
 * invariantes (ReviewForm.data é covariante, mas o registry precisa aceitar
 * handlers de tipos heterogêneos). Usamos `any` aqui — consumidores reidratam
 * o tipo via `schema` ou cast explícito.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDocumentHandler = DocumentHandler<any>
