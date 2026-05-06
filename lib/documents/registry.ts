import type { DocumentHandler } from "@/lib/documents/types"

export const handlers = {} as const satisfies Record<string, DocumentHandler>

export type DocumentTypeId = keyof typeof handlers

export function getHandler(id: DocumentTypeId): DocumentHandler {
  return handlers[id]
}
