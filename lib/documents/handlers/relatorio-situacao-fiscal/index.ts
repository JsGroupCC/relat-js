import type { DocumentHandler } from "@/lib/documents/types"

import { Dashboard } from "./Dashboard"
import { ReviewForm } from "./ReviewForm"
import { computeSummary } from "./compute"
import { extractionJsonSchema, extractionPrompt } from "./prompt"
import { relatorioSituacaoFiscalSchema, type RelatorioSituacaoFiscal } from "./schema"
import { generateText } from "./text"

export const relatorioSituacaoFiscalHandler: DocumentHandler<RelatorioSituacaoFiscal> = {
  id: "relatorio-situacao-fiscal",
  displayName: "Relatório de Situação Fiscal",
  category: "fiscal",

  // Sprint 1: detector real virá quando tivermos 2+ handlers (classificação
  // por LLM, sem pdfjs-dist).
  detect: () => 1,

  schema: relatorioSituacaoFiscalSchema,
  extractionPrompt,
  extractionSchema: extractionJsonSchema,

  ReviewForm,
  Dashboard,

  generateText,
  computeSummary,
}

export type { RelatorioSituacaoFiscal } from "./schema"
export type { Debito } from "./schema"
export type { RelatorioSituacaoFiscalSummary } from "./compute"
