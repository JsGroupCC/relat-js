"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Hook que retorna `false` no SSR e `true` após mount no cliente —
 * sem usar setState em useEffect (evita warning do React/Next 16).
 */
function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()

  if (!isClient) {
    return (
      <div
        aria-hidden
        className="size-7 rounded-md border border-border bg-background"
      />
    )
  }

  const Icon =
    theme === "system" ? MonitorIcon : theme === "dark" ? MoonIcon : SunIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Alternar tema"
        className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted"
      >
        <Icon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={() => setTheme("light")}>
          <SunIcon className="mr-2 size-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>
          <MoonIcon className="mr-2 size-4" />
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>
          <MonitorIcon className="mr-2 size-4" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
