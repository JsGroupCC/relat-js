import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { DeleteRelatorioButton } from "@/components/relatorios/DeleteRelatorioButton"
import { RetryRelatorioButton } from "@/components/relatorios/RetryRelatorioButton"
import { PdfViewer } from "@/components/shared/PdfViewer"
import { buttonVariants } from "@/components/ui/button"
import { loadRelatorioBundle } from "@/lib/relatorios/queries"

export default async function RevisarRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bundle = await loadRelatorioBundle(id)
  if (!bundle) notFound()

  const { relatorio, extracao, pdfUrl, handler } = bundle

  if (relatorio.status === "verified") {
    redirect(`/relatorios/${id}`)
  }
  if (relatorio.status === "pending" || relatorio.status === "extracting") {
    return (
      <main className="p-6">
        <p className="text-sm text-muted-foreground">
          Aguarde — extração em andamento ({relatorio.status}). A página é
          atualizada automaticamente quando ficar pronta.
        </p>
      </main>
    )
  }
  if (relatorio.status === "failed" || !extracao) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">Falha na extração</h1>
        <p className="text-sm text-muted-foreground">
          {relatorio.error_message ??
            "A extração falhou. Tente subir o arquivo novamente."}
        </p>
        <div className="flex flex-wrap gap-2">
          <RetryRelatorioButton
            relatorioId={relatorio.id}
            variant="default"
            label="Tentar extrair de novo"
            loadingLabel="Extraindo…"
          />
          <Link href="/upload" className={buttonVariants({ variant: "outline" })}>
            Voltar ao upload
          </Link>
          <DeleteRelatorioButton
            relatorioId={relatorio.id}
            filename={relatorio.pdf_filename}
            variant="ghost"
          />
        </div>
      </main>
    )
  }

  // Usa verified_json se existir (re-revisão), senão raw_json.
  const dataToReview = (extracao.verified_json ?? extracao.raw_json) as unknown
  const validated = handler.schema.safeParse(dataToReview)
  if (!validated.success) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Dados extraídos inválidos</h1>
        <p className="text-sm text-muted-foreground">
          A extração retornou dados que não casam com o schema esperado.
          Reextraia o arquivo.
        </p>
      </main>
    )
  }

  const { ReviewForm } = handler

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-0.5">
          <h1 className="text-base font-semibold">{handler.displayName}</h1>
          <p className="text-xs text-muted-foreground">
            {relatorio.pdf_filename}
          </p>
        </div>
        <Link
          href="/upload"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Cancelar
        </Link>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
        <div className="border-r p-3 lg:overflow-hidden">
          <PdfViewer url={pdfUrl} filename={relatorio.pdf_filename} />
        </div>
        <div className="overflow-y-auto p-6">
          <ReviewForm relatorioId={relatorio.id} data={validated.data} />
        </div>
      </div>
    </main>
  )
}
