import { notFound } from "next/navigation"

import { Logo } from "@/components/brand/Logo"
import { DownloadPdfButton } from "@/components/share/DownloadPdfButton"
import { loadSharedRelatorio } from "@/lib/share/queries"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const shared = await loadSharedRelatorio(token)
  if (!shared) notFound()

  // Validar shape do JSON contra o schema do handler resolvido pelo registry.
  // Cada handler tem seu próprio schema + ClientView. Se vier malformado
  // (ex: handler atualizou o schema depois do verified_json antigo), trata
  // como notFound em vez de exibir lixo.
  const parsed = shared.handler.schema.safeParse(shared.data)
  if (!parsed.success) notFound()

  const { ClientView } = shared.handler

  return (
    <main className="bg-background py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <header className="no-print mb-8 flex items-center justify-between gap-4">
          <Logo variant="auto" size={40} priority />
          <DownloadPdfButton />
        </header>
        <ClientView data={parsed.data} empresa={shared.empresa} />
        <footer className="no-print mt-12 flex items-center justify-center gap-2 border-t pt-6 text-xs text-muted-foreground">
          <Logo variant="auto" size={16} />
          <span>
            Análise gerada por <strong>JsGroup</strong>
          </span>
        </footer>
      </div>
    </main>
  )
}
