import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { DeleteRelatorioButton } from "@/components/relatorios/DeleteRelatorioButton"
import { ShareButton } from "@/components/share/ShareButton"
import { buttonVariants } from "@/components/ui/button"
import { loadRelatorioBundle } from "@/lib/relatorios/queries"

export default async function RelatorioDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bundle = await loadRelatorioBundle(id)
  if (!bundle) notFound()

  const { relatorio, extracao, handler } = bundle

  if (relatorio.status !== "verified") {
    redirect(`/relatorios/${id}/revisar`)
  }

  const data = extracao?.verified_json ?? extracao?.raw_json
  const validated = data ? handler.schema.safeParse(data) : null
  if (!validated?.success) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Sem dados para exibir</h1>
        <p className="text-sm text-muted-foreground">
          Este relatório está marcado como verificado, mas não tem dados
          revisados. Tente reextrair o arquivo.
        </p>
      </main>
    )
  }

  const { Dashboard } = handler

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← Voltar
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton relatorioId={relatorio.id} />
          <Link
            href={`/relatorios/${id}/revisar`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Editar dados
          </Link>
          <DeleteRelatorioButton
            relatorioId={relatorio.id}
            filename={relatorio.pdf_filename}
          />
        </div>
      </div>
      <Dashboard relatorioId={relatorio.id} data={validated.data} />
    </main>
  )
}
