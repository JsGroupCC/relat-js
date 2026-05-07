"use client"

import { LogOutIcon, MenuIcon } from "lucide-react"
import { useState } from "react"

import { OrganizationSwitcher } from "@/components/auth/OrganizationSwitcher"
import { Logo } from "@/components/brand/Logo"
import { NavLinks } from "@/components/shared/SidebarNav"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { signoutAction } from "@/lib/auth/actions"
import type { OrgListItem } from "@/lib/auth/current-org"

interface Props {
  email: string | null
  orgs: OrgListItem[]
  activeOrgId: string
}

export function MobileSidebar({ email, orgs, activeOrgId }: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Abrir menu"
          className="inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
        >
          <MenuIcon className="size-5" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-full flex-col p-4">
            <div className="mb-5 flex items-center gap-2">
              <Logo variant="white" size={28} />
              <span className="text-base font-semibold tracking-tight">
                JsGroup
              </span>
            </div>
            <div className="mb-4">
              <OrganizationSwitcher orgs={orgs} activeOrgId={activeOrgId} />
            </div>
            <nav className="flex-1 space-y-1" onClick={close}>
              <NavLinks onNavigate={close} />
            </nav>
            <div className="mt-4 space-y-2 border-t border-sidebar-border pt-4">
              {email && (
                <p
                  className="truncate text-xs text-sidebar-foreground/60"
                  title={email}
                >
                  {email}
                </p>
              )}
              <form action={signoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <LogOutIcon className="mr-2 size-4" />
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Logo variant="auto" size={24} />
      <ThemeToggle />
    </header>
  )
}
