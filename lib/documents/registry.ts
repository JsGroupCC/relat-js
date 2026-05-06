import { relatorioSituacaoFiscalHandler } from "@/lib/documents/handlers/relatorio-situacao-fiscal"
import type { AnyDocumentHandler } from "@/lib/documents/types"

export const handlers = {
  "relatorio-situacao-fiscal": relatorioSituacaoFiscalHandler,
} as const satisfies Record<string, AnyDocumentHandler>

export type DocumentTypeId = keyof typeof handlers

/**
 * Default type usado pelo upload pipeline enquanto só temos um handler.
 * Quando suportarmos 2+ tipos, troque para uma classificação por LLM barata
 * (Claude Haiku vendo a primeira página do PDF).
 */
export const DEFAULT_DOCUMENT_TYPE: DocumentTypeId = "relatorio-situacao-fiscal"

export function getHandler(id: DocumentTypeId): AnyDocumentHandler {
  return handlers[id]
}

export function getHandlerOrNull(id: string): AnyDocumentHandler | null {
  if (id in handlers) {
    return handlers[id as DocumentTypeId]
  }
  return null
}
