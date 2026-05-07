import { EyeIcon } from "lucide-react"

import type { ActiveShareInfo } from "@/lib/share/queries"

interface Props {
  share: ActiveShareInfo | null
}

/**
 * Mostra "X visualizações · último acesso há Y" quando o relatório tem share
 * ativo e foi aberto pelo menos uma vez. Sem share ou sem views, não renderiza.
 */
export function ShareViewsBadge({ share }: Props) {
  if (!share || share.view_count === 0) return null

  const viewWord = share.view_count === 1 ? "visualização" : "visualizações"
  const lastSeen = share.last_viewed_at
    ? formatRelative(share.last_viewed_at)
    : null

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300"
      title={
        share.last_viewed_at
          ? `Último acesso em ${new Date(share.last_viewed_at).toLocaleString("pt-BR")}`
          : undefined
      }
    >
      <EyeIcon className="size-3" />
      {share.view_count} {viewWord}
      {lastSeen ? ` · ${lastSeen}` : ""}
    </span>
  )
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `há ${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `há ${diffD}d`
  return d.toLocaleDateString("pt-BR")
}
