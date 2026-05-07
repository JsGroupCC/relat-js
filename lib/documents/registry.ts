import { extratoFiscalIcmsRnHandler } from "@/lib/documents/handlers/extrato-fiscal-icms-rn"
import { pendenciasIssNatalHandler } from "@/lib/documents/handlers/pendencias-iss-natal"
import { relatorioSituacaoFiscalHandler } from "@/lib/documents/handlers/relatorio-situacao-fiscal"
import type { AnyDocumentHandler } from "@/lib/documents/types"

export const handlers = {
  "relatorio-situacao-fiscal": relatorioSituacaoFiscalHandler,
  "pendencias-iss-natal": pendenciasIssNatalHandler,
  "extrato-fiscal-icms-rn": extratoFiscalIcmsRnHandler,
} as const satisfies Record<string, AnyDocumentHandler>

export type DocumentTypeId = keyof typeof handlers

/**
 * Default type quando o classifier não consegue decidir e há mais de um
 * handler. Mantemos o federal RFB como fallback porque é o mais comum hoje.
 * Em produção, /api/extract usa o classifier LLM e marca como `failed`
 * casos ambíguos — esse default só é usado quando classifier está
 * desabilitado ou em testes.
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
