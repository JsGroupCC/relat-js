"use client"

import { Loader2, Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteRelatorioAction } from "@/lib/relatorios/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  relatorioId: string
  filename?: string
  variant?: "ghost" | "destructive" | "outline"
  size?: "sm" | "default"
  withLabel?: boolean
}

export function DeleteRelatorioButton({
  relatorioId,
  filename,
  variant = "ghost",
  size = "sm",
  withLabel = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const onConfirm = () => {
    startTransition(async () => {
      try {
        await deleteRelatorioAction(relatorioId)
      } catch (err) {
        // redirect() em Server Action lança NEXT_REDIRECT — re-throw para o
        // runtime do Next processar. Erros reais viram toast.
        if (err instanceof Error && /NEXT_REDIRECT/.test(err.message)) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : "Falha ao excluir.")
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label="Excluir relatório"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2Icon className={withLabel ? "mr-1.5 size-4" : "size-4"} />
        )}
        {withLabel && "Excluir"}
      </Button>

      <Dialog open={open} onOpenChange={(o) => (!pending ? setOpen(o) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir relatório?</DialogTitle>
            <DialogDescription>
              {filename ? (
                <>
                  O arquivo <strong>{filename}</strong>, junto com a extração,
                  os débitos e qualquer link de compartilhamento ativo, será{" "}
                  <strong>excluído permanentemente</strong>.
                </>
              ) : (
                <>
                  O relatório, sua extração, débitos e links de
                  compartilhamento serão{" "}
                  <strong>excluídos permanentemente</strong>.
                </>
              )}{" "}
              Não há como desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
