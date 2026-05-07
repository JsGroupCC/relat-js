"use client"

import { Loader2Icon, RotateCwIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { resetRelatorioForRetryAction } from "@/lib/relatorios/actions"
import { Button } from "@/components/ui/button"

interface Props {
  relatorioId: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default"
  /** label customizado; default "Tentar novamente" */
  label?: string
  /** rótulo enquanto roda; default "Reextraindo…" */
  loadingLabel?: string
}

/**
 * Botão genérico pra retry/reextração. Server action reseta o status,
 * cliente chama /api/extract, navega pra revisar quando termina.
 */
export function RetryRelatorioButton({
  relatorioId,
  variant = "outline",
  size = "sm",
  label = "Tentar novamente",
  loadingLabel = "Reextraindo…",
}: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const onClick = () => {
    startTransition(async () => {
      const reset = await resetRelatorioForRetryAction(relatorioId)
      if (!reset.ok) {
        toast.error(reset.error)
        return
      }

      try {
        const r = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ relatorioId }),
        })
        const body = (await r.json().catch(() => ({}))) as {
          error?: string
          message?: string
        }
        if (!r.ok) {
          throw new Error(body.message || body.error || "Falha na extração.")
        }
        toast.success("Pronto para revisão.")
        router.push(`/relatorios/${relatorioId}/revisar`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha na extração.")
        router.refresh()
      }
    })
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2Icon className="mr-2 size-4 animate-spin" />
      ) : (
        <RotateCwIcon className="mr-2 size-4" />
      )}
      {pending ? loadingLabel : label}
    </Button>
  )
}
