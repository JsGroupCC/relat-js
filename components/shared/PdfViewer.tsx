"use client"

import { Card } from "@/components/ui/card"

interface Props {
  url: string | null
  filename?: string
}

/**
 * Visualizador simples de PDF — usa o renderer nativo do browser via iframe.
 * Funciona bem para PDFs com texto nativo (caso do MVP). Para PDFs escaneados
 * pesados, considerar swap por react-pdf no futuro.
 */
export function PdfViewer({ url, filename }: Props) {
  if (!url) {
    return (
      <Card className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        PDF indisponível.
      </Card>
    )
  }

  return (
    <Card className="h-full overflow-hidden">
      <iframe
        src={url}
        title={filename ?? "PDF"}
        className="h-full w-full"
        // Sandbox sem allow-scripts — PDFs nativos não precisam de JS.
        // Permitimos same-origin para o renderer do browser ler o blob.
      />
    </Card>
  )
}
