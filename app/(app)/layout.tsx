import type { ReactNode } from "react"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r p-4 md:block">
        <div className="text-sm font-medium">relat-js</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Sidebar — placeholder (Sprint 0)
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  )
}
