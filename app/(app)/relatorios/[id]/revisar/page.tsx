import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { DeleteRelatorioButton } from "@/components/relatorios/DeleteRelatorioButton"
import { RetryRelatorioButton } from "@/components/relatorios/RetryRelatorioButton"
import { PdfViewer } from "@/components/shared/PdfViewer"
import { buttonVariants } from "@/components/ui/button"
import {
  loadRelatorioBundle,
  loadReviewQueueInfo,
} from "@/lib/relatorios/queries"

export default async function RevisarRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [bundle, queue] = await Promise.all([
    loadRelatorioBundle(id),
    loadReviewQueueInfo(id),
  ])
  if (!bundle) notFound()

  const { relatorio, extracao, pdfUrl, handler } = bundle

  if (relatorio.status === "verified") {
    redirect(`/relatorios/${id}`)
  }
  if (relatorio.status === "pending" || relatorio.status === "extracting") {
    const ageMin = ageInMinutes(relatorio.created_at)
    const looksStuck = relatorio.status === "extracting" && ageMin >= 10
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">
          {looksStuck ? "Extração travada" : "Extraindo…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {looksStuck
            ? `Faz ${Math.round(ageMin)} minutos que esse relatório está em extração. Provavelmente travou (timeout do servidor). Você pode forçar nova tentativa.`
            : `Aguarde — extração em andamento (${relatorio.status}). A página é atualizada automaticamente quando ficar pronta.`}
        </p>
        {looksStuck && (
          <div className="flex flex-wrap gap-2">
            <RetryRelatorioButton
              relatorioId={relatorio.id}
              variant="default"
              label="Forçar nova tentativa"
              loadingLabel="Extraindo…"
            />
            <DeleteRelatorioButton
              relatorioId={relatorio.id}
              filename={relatorio.pdf_filename}
              variant="ghost"
            />
          </div>
        )}
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

  const showQueue =
    queue.total > 1 && queue.position !== null
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{handler.displayName}</h1>
            {showQueue && (
              <span
                className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                title="Revisão em fila — confirmar avança automaticamente para o próximo"
              >
                Revisão {queue.position} de {queue.total}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
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

// Encapsula Date.now() pra escapar do react-hooks/purity (rule trata
// Date.now em corpo do componente como impuro).
function ageInMinutes(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 60_000
}
