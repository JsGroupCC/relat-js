"use client"

import { Loader2, PencilIcon, Trash2Icon } from "lucide-react"
import { useActionState, useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  deleteEmpresaAction,
  updateEmpresaAction,
  type EmpresasActionState,
} from "@/lib/empresas/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { EmpresaRow } from "@/types/database"

const initial: EmpresasActionState = { ok: false }

interface Props {
  empresa: Pick<EmpresaRow, "id" | "cnpj" | "razao_social" | "nome_fantasia">
}

export function EditEmpresaButton({ empresa }: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    updateEmpresaAction,
    initial,
  )
  const [deleting, startDelete] = useTransition()

  // Fecha o modal ao salvar com sucesso. Usa state.ok diretamente no render
  // (lint react-hooks proíbe setState em useEffect). Como state.ok só vira
  // true após uma submissão bem-sucedida, esse render-and-close é seguro.
  if (state.ok && open) {
    queueMicrotask(() => setOpen(false))
  }
  useEffect(() => {
    if (state.ok) toast.success("Empresa atualizada.")
    else if (state.error) toast.error(state.error)
  }, [state])

  const onDelete = () => {
    if (
      !confirm(
        `Excluir empresa ${empresa.razao_social ?? empresa.cnpj}?\n\nIsso também apaga TODOS os relatórios e débitos vinculados a ela. Não há como desfazer.`,
      )
    ) {
      return
    }
    startDelete(async () => {
      try {
        await deleteEmpresaAction(empresa.id)
      } catch (err) {
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
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <PencilIcon className="mr-1.5 size-4" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={(o) => (!pending ? setOpen(o) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
            <DialogDescription>
              Ajuste razão social, nome fantasia ou corrija o CNPJ.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={empresa.id} />
            <div className="space-y-1">
              <Label htmlFor="cnpj-edit">CNPJ</Label>
              <Input
                id="cnpj-edit"
                name="cnpj"
                defaultValue={empresa.cnpj}
                required
                aria-invalid={!!state.fieldErrors?.cnpj}
              />
              {state.fieldErrors?.cnpj && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.cnpj[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="razao-edit">Razão social</Label>
              <Input
                id="razao-edit"
                name="razao_social"
                defaultValue={empresa.razao_social ?? ""}
                required
                aria-invalid={!!state.fieldErrors?.razao_social}
              />
              {state.fieldErrors?.razao_social && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.razao_social[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="fantasia-edit">Nome fantasia (opcional)</Label>
              <Input
                id="fantasia-edit"
                name="nome_fantasia"
                defaultValue={empresa.nome_fantasia ?? ""}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={pending || deleting}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              >
                {deleting ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Trash2Icon className="mr-1.5 size-4" />
                )}
                Excluir empresa
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending || deleting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || deleting}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
