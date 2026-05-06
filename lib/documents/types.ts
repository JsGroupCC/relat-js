import type { ComponentType } from "react"
import type { ZodSchema } from "zod"

export type DocumentCategory = "fiscal" | "tributario" | "previdenciario" | "outros"

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
