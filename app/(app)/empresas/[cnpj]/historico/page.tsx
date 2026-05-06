import Link from "next/link"
import { notFound } from "next/navigation"

import { HistoricoCompare } from "@/components/empresas/HistoricoCompare"
import { Card, CardContent } from "@/components/ui/card"
import { loadEmpresaByCnpj } from "@/lib/empresas/queries"
import { loadEmpresaTimeseries } from "@/lib/empresas/timeseries"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"

export default async function HistoricoEmpresaPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj: rawCnpj } = await params
  const cnpj = stripCnpj(rawCnpj)
  const detail = await loadEmpresaByCnpj(cnpj)
  if (!detail) notFound()

  const { empresa } = detail
  const points = await loadEmpresaTimeseries(empresa.id)
  const sorted = [...points].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href={`/empresas/${empresa.cnpj}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {empresa.razao_social ?? formatCnpj(empresa.cnpj)}
        </Link>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Linha do tempo dos relatórios verificados desta empresa.
        </p>
      </header>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum relatório verificado ainda. Faça upload e revise um
              relatório para começar a montar o histórico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Linha do tempo
            </h2>
            <ol className="space-y-3 border-l pl-4">
              {sorted.map((p) => (
                <li key={p.relatorioId} className="relative">
                  <span className="absolute -left-[21px] top-2 size-3 rounded-full border-2 border-background bg-foreground" />
                  <Link
                    href={`/relatorios/${p.relatorioId}`}
                    className="block rounded-md border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{p.date}</p>
                      <p className="text-sm tabular-nums">
                        Total{" "}
                        <strong>{brl(p.total_geral)}</strong>{" "}
                        <span className="text-muted-foreground">
                          · {p.quantidade_debitos} débito
                          {p.quantidade_debitos === 1 ? "" : "s"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>SIEF {brl(p.total_sief)}</span>
                      <span>PGFN {brl(p.total_pgfn)}</span>
                      <span>Suspenso {brl(p.total_suspenso)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <HistoricoCompare points={points} />
        </>
      )}
    </main>
  )
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}
