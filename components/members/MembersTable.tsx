"use client"

import { Loader2, Trash2Icon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import {
  changeMemberRoleAction,
  removeMemberAction,
} from "@/lib/members/actions"
import type { MemberRow } from "@/lib/members/queries"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Props {
  members: MemberRow[]
  currentUserId: string
  currentRole: "owner" | "admin" | "member"
}

export function MembersTable({ members, currentUserId, currentRole }: Props) {
  const canManage = currentRole === "owner" || currentRole === "admin"
  const [pending, startTransition] = useTransition()

  const onChangeRole = (userId: string, role: "owner" | "admin" | "member") => {
    startTransition(async () => {
      const res = await changeMemberRoleAction(userId, role)
      if (!res.ok) toast.error(res.error ?? "Falha ao alterar papel.")
      else toast.success("Papel atualizado.")
    })
  }

  const onRemove = (userId: string, email: string) => {
    if (!confirm(`Remover ${email} desta organização?`)) return
    startTransition(async () => {
      const res = await removeMemberAction(userId)
      if (!res.ok) toast.error(res.error ?? "Falha ao remover.")
      else toast.success("Membro removido.")
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>E-mail</TableHead>
          <TableHead className="w-40">Papel</TableHead>
          <TableHead className="w-40">Adicionado</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId
          const canTouchThis = canManage && !isSelf
          return (
            <TableRow key={m.user_id}>
              <TableCell className="font-medium">
                {m.email}
                {isSelf && (
                  <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                )}
              </TableCell>
              <TableCell>
                {canTouchThis ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) => onChangeRole(m.user_id, v as MemberRow["role"])}
                    disabled={pending}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentRole === "owner" && <SelectItem value="owner">Owner</SelectItem>}
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm capitalize">{m.role}</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell>
                {canTouchThis && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(m.user_id, m.email)}
                    disabled={pending}
                    aria-label="Remover membro"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-4" />
                    )}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
