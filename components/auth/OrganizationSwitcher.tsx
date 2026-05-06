"use client"

import { Building2Icon, CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { switchOrganizationAction } from "@/lib/auth/org-actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Props {
  orgs: Array<{ id: string; name: string; slug: string; role: string }>
  activeOrgId: string
}

export function OrganizationSwitcher({ orgs, activeOrgId }: Props) {
  const [pending, startTransition] = useTransition()
  const active = orgs.find((o) => o.id === activeOrgId)

  if (orgs.length === 0) return null

  if (orgs.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
        <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{active?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{active?.role}</p>
        </div>
      </div>
    )
  }

  const onSelect = (orgId: string) => {
    if (orgId === activeOrgId) return
    startTransition(async () => {
      try {
        await switchOrganizationAction(orgId)
        toast.success("Organização ativa alterada.")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao trocar org.")
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-auto w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
        disabled={pending}
      >
        <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{active?.name ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {active?.role ?? ""}
          </p>
        </div>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Organizações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => onSelect(org.id)}
            className="flex items-center gap-2"
          >
            <Building2Icon className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{org.name}</p>
              <p className="truncate text-xs text-muted-foreground">{org.role}</p>
            </div>
            {org.id === activeOrgId && (
              <CheckIcon className="size-4 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
