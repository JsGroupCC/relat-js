import { notFound } from "next/navigation"

import { ClientView } from "@/lib/documents/handlers/relatorio-situacao-fiscal/ClientView"
import { loadSharedRelatorio } from "@/lib/share/queries"
import {
  relatorioSituacaoFiscalSchema,
  type RelatorioSituacaoFiscal,
} from "@/lib/documents/handlers/relatorio-situacao-fiscal/schema"

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

  // Validar shape do JSON contra o schema do handler. Se vier malformado
  // (ex: handler atualizou o schema depois do verified_json antigo), trata
  // como notFound em vez de exibir lixo.
  const parsed = relatorioSituacaoFiscalSchema.safeParse(shared.data)
  if (!parsed.success) notFound()
  const data: RelatorioSituacaoFiscal = parsed.data

  return (
    <main className="bg-background py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <ClientView data={data} empresa={shared.empresa} />
      </div>
    </main>
  )
}
