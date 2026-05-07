"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface Props {
  /** texto custom; default "Imprimir / PDF" */
  label?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default"
}

/**
 * Botão genérico que dispara window.print(). O usuário escolhe "Salvar como
 * PDF" no diálogo do navegador. Estilos @media print em globals.css cuidam
 * de esconder elementos com `.no-print` e flatten paleta com `.print-clean`.
 */
export function PrintButton({
  label = "Imprimir / PDF",
  variant = "outline",
  size = "sm",
}: Props) {
  const onClick = () => {
    if (typeof window === "undefined") return
    window.print()
  }
  return (
    <Button type="button" variant={variant} size={size} onClick={onClick}>
      <PrinterIcon className="mr-2 size-4" />
      {label}
    </Button>
  )
}
