"use client"

import { Loader2 } from "lucide-react"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import {
  createEmpresaAction,
  type EmpresasActionState,
} from "@/lib/empresas/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initial: EmpresasActionState = { ok: false }

export function CreateEmpresaForm() {
  const [state, formAction, pending] = useActionState(createEmpresaAction, initial)

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            name="cnpj"
            placeholder="00.000.000/0000-00"
            required
            aria-invalid={!!state.fieldErrors?.cnpj}
          />
          {state.fieldErrors?.cnpj && (
            <p className="text-xs text-destructive">{state.fieldErrors.cnpj[0]}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="razao_social">Razão social</Label>
          <Input
            id="razao_social"
            name="razao_social"
            required
            aria-invalid={!!state.fieldErrors?.razao_social}
          />
          {state.fieldErrors?.razao_social && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.razao_social[0]}
            </p>
          )}
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="nome_fantasia">Nome fantasia (opcional)</Label>
          <Input id="nome_fantasia" name="nome_fantasia" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Criar empresa
      </Button>
    </form>
  )
}
