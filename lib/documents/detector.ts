import { handlers, type DocumentTypeId } from "@/lib/documents/registry"
import type { AnyDocumentHandler } from "@/lib/documents/types"

export interface DetectionResult {
  typeId: DocumentTypeId | null
  confidence: number
}

export function detectDocumentType(pdfText: string): DetectionResult {
  let best: DetectionResult = { typeId: null, confidence: 0 }
  const entries = Object.entries(handlers) as Array<[DocumentTypeId, AnyDocumentHandler]>
  for (const [id, handler] of entries) {
    const score = handler.detect(pdfText)
    if (score > best.confidence) {
      best = { typeId: id, confidence: score }
    }
  }
  return best
}
