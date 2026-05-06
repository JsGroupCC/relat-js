import { relatorioSituacaoFiscalHandler } from "@/lib/documents/handlers/relatorio-situacao-fiscal"
import type { AnyDocumentHandler } from "@/lib/documents/types"

export const handlers = {
  "relatorio-situacao-fiscal": relatorioSituacaoFiscalHandler,
} as const satisfies Record<string, AnyDocumentHandler>

export type DocumentTypeId = keyof typeof handlers

export function getHandler(id: DocumentTypeId): AnyDocumentHandler {
  return handlers[id]
}

export function getHandlerOrNull(id: string): AnyDocumentHandler | null {
  if (id in handlers) {
    return handlers[id as DocumentTypeId]
  }
  return null
}
