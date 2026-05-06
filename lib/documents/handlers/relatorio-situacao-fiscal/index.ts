import type { DocumentHandler } from "@/lib/documents/types"

import { Dashboard } from "./Dashboard"
import { ReviewForm } from "./ReviewForm"
import { computeSummary } from "./compute"
import { detect } from "./detect"
import { extractionJsonSchema, extractionPrompt } from "./prompt"
import { relatorioSituacaoFiscalSchema, type RelatorioSituacaoFiscal } from "./schema"
import { generateText } from "./text"

export const relatorioSituacaoFiscalHandler: DocumentHandler<RelatorioSituacaoFiscal> = {
  id: "relatorio-situacao-fiscal",
  displayName: "Relatório de Situação Fiscal",
  category: "fiscal",

  detect,

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
