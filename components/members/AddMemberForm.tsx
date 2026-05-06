"use client"

import { Loader2, UserPlusIcon } from "lucide-react"
import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"

import { addMemberAction, type MembersActionResult } from "@/lib/members/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const initial: MembersActionResult = { ok: false }

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(addMemberAction, initial)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) {
      toast.success("Membro adicionado.")
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-1">
        <Label htmlFor="email">Convidar por e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          required
          placeholder="pessoa@exemplo.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="role">Papel</Label>
        <Select name="role" defaultValue="member">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Membro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <UserPlusIcon className="mr-2 size-4" />
        )}
        Adicionar
      </Button>
    </form>
  )
}
