import Link from "next/link"
import {
  Building2Icon,
  HomeIcon,
  LogOutIcon,
  Settings2Icon,
  UploadCloudIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { signoutAction } from "@/lib/auth/actions"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/upload", label: "Upload", icon: UploadCloudIcon },
  { href: "/empresas", label: "Empresas", icon: Building2Icon },
  { href: "/configuracoes", label: "Configurações", icon: Settings2Icon },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-base font-semibold">relat-js</span>
          <span className="text-xs text-muted-foreground">MVP</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-4 space-y-2 border-t pt-4">
          {user?.email && (
            <p className="truncate text-xs text-muted-foreground" title={user.email}>
              {user.email}
            </p>
          )}
          <form action={signoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <LogOutIcon className="mr-2 size-4" />
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  )
}
