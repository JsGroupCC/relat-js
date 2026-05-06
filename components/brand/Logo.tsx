import Image from "next/image"

import { cn } from "@/lib/utils"

interface Props {
  /**
   * - `auto` (padrão): escolhe a variante pela cor do background ao redor
   *   (light = mark colorido sobre cinza, dark = white sobre transparente)
   *   via classes Tailwind dark:
   * - `mark`: força a versão colorida (logo-mark.png)
   * - `white`: força a versão branca (logo-white.png)
   */
  variant?: "auto" | "mark" | "white"
  /** Lado em pixels. Default 32. */
  size?: number
  /** Mostra o wordmark "JsGroup" ao lado? Default false (só símbolo). */
  withWordmark?: boolean
  className?: string
  priority?: boolean
}

/**
 * Logo JsGroup. Os PNGs ficam em /public/logo-mark.png e /public/logo-white.png.
 * Se algum dos arquivos não existir, o Next renderiza um broken image — por
 * isso há um fallback CSS com as iniciais "JS" estilizadas, ativável via
 * className="data-[fallback]". Em produção: garanta que os PNGs existam.
 */
export function Logo({
  variant = "auto",
  size = 32,
  withWordmark = false,
  className,
  priority,
}: Props) {
  if (variant === "mark" || variant === "white") {
    const src = variant === "white" ? "/logo-white.png" : "/logo-mark.png"
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Image
          src={src}
          alt="JsGroup"
          width={size}
          height={size}
          priority={priority}
          className="shrink-0 select-none"
        />
        {withWordmark && (
          <span className="text-base font-semibold tracking-tight">
            JsGroup
          </span>
        )}
      </span>
    )
  }

  // variant = "auto": mostra a versão colorida em light, white em dark
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo-mark.png"
        alt="JsGroup"
        width={size}
        height={size}
        priority={priority}
        className="block shrink-0 select-none dark:hidden"
      />
      <Image
        src="/logo-white.png"
        alt="JsGroup"
        width={size}
        height={size}
        priority={priority}
        className="hidden shrink-0 select-none dark:block"
      />
      {withWordmark && (
        <span className="text-base font-semibold tracking-tight">JsGroup</span>
      )}
    </span>
  )
}
