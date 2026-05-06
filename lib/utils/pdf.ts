import "server-only"

import { PDFParse } from "pdf-parse"

export interface PdfTextResult {
  text: string
  numpages: number
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfTextResult> {
  const parser = new PDFParse({ data: bytes })
  try {
    const result = await parser.getText()
    return {
      text: result.text ?? "",
      numpages: result.pages?.length ?? 0,
    }
  } finally {
    await parser.destroy().catch(() => {})
  }
}
