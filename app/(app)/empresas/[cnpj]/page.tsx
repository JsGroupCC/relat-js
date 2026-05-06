import Link from "next/link"
import { notFound } from "next/navigation"
import { ClockIcon, FileTextIcon } from "lucide-react"

import { EvolucaoChart } from "@/components/empresas/EvolucaoChart"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { loadEmpresaByCnpj } from "@/lib/empresas/queries"
import { loadEmpresaTimeseries } from "@/lib/empresas/timeseries"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando extração",
  extracting: "Extraindo",
  reviewing: "Aguardando revisão",
  verified: "Verificado",
  failed: "Falhou",
}

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj: rawCnpj } = await params
  const cnpj = stripCnpj(rawCnpj)
  const detail = await loadEmpresaByCnpj(cnpj)
  if (!detail) notFound()

  const { empresa, relatorios } = detail
  const points = await loadEmpresaTimeseries(empresa.id)

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Empresa
          </p>
          <h1 className="text-2xl font-semibold">
            {empresa.razao_social ?? "(sem razão social)"}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {formatCnpj(empresa.cnpj)}
            {empresa.nome_fantasia && (
              <span className="ml-2">· {empresa.nome_fantasia}</span>
            )}
          </p>
        </div>
        <Link
          href={`/empresas/${empresa.cnpj}/historico`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ClockIcon className="mr-2 size-4" />
          Histórico e comparações
        </Link>
      </header>

      {points.length > 0 && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EvolucaoChart points={points} metric="total_geral" title="Total devido (CND)" />
          <EvolucaoChart points={points} metric="total_sief" title="Pendências SIEF" />
          <EvolucaoChart points={points} metric="total_pgfn" title="PGFN" />
          <EvolucaoChart
            points={points}
            metric="total_suspenso"
            title="Exigibilidade suspensa"
          />
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileTextIcon className="size-4" />
            Relatórios ({relatorios.length})
          </CardTitle>
          <CardDescription>
            Ordenados por data de emissão (mais recente primeiro).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {relatorios.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum relatório vinculado a essa empresa ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[24ch] truncate font-medium">
                      {r.pdf_filename}
                    </TableCell>
                    <TableCell>
                      {r.data_emissao_documento
                        ? new Date(r.data_emissao_documento).toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/relatorios/${r.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Ver →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
