"use client"

import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Dispara o diálogo de impressão do navegador. O usuário escolhe
 * "Salvar como PDF" no destino. CSS @media print em globals.css cuida
 * de esconder elementos com .no-print e ajustar paleta.
 */
export function DownloadPdfButton() {
  const onClick = () => {
    if (typeof window === "undefined") return
    window.print()
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <DownloadIcon className="size-4" />
      Baixar PDF
    </Button>
  )
}
