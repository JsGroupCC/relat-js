import Link from "next/link"
import { LogOutIcon } from "lucide-react"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { OrganizationSwitcher } from "@/components/auth/OrganizationSwitcher"
import { Logo } from "@/components/brand/Logo"
import { MobileSidebar } from "@/components/shared/MobileSidebar"
import { NavLinks } from "@/components/shared/SidebarNav"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { signoutAction } from "@/lib/auth/actions"
import { getCurrentOrg, listMyOrganizations } from "@/lib/auth/current-org"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let activeOrgId: string | null = null
  try {
    const ctx = await getCurrentOrg()
    activeOrgId = ctx.organizationId
  } catch (err) {
    if (err instanceof Error && err.message === "no_organization") {
      redirect("/login")
    }
    throw err
  }

  const orgs = await listMyOrganizations()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile header com hamburger */}
      <MobileSidebar email={user.email ?? null} orgs={orgs} activeOrgId={activeOrgId} />

      {/* Desktop sidebar fixo */}
      <aside className="no-print hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground p-4 md:flex">
        <div className="mb-5 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Logo variant="white" size={28} priority />
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              JsGroup
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="mb-4">
          <OrganizationSwitcher orgs={orgs} activeOrgId={activeOrgId} />
        </div>
        <nav className="flex-1 space-y-1">
          <NavLinks />
        </nav>
        <div className="mt-4 space-y-2 border-t border-sidebar-border pt-4">
          {user.email && (
            <p
              className="truncate text-xs text-sidebar-foreground/60"
              title={user.email}
            >
              {user.email}
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
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
