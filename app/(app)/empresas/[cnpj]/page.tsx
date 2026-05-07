import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  XCircleIcon,
} from "lucide-react"

import { EvolucaoChart } from "@/components/empresas/EvolucaoChart"
import { SourceCard } from "@/components/empresas/SourceCard"
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
import { loadEmpresaSnapshot } from "@/lib/empresas/snapshot"
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
  const [snapshot, points] = await Promise.all([
    loadEmpresaSnapshot(empresa.id),
    loadEmpresaTimeseries(empresa.id),
  ])

  // Total cross-handler: soma os total_geral de cada fonte verificada.
  // É a métrica mais útil para visão consolidada da saúde fiscal.
  const totalConsolidado = snapshot.reduce(
    (acc, s) =>
      acc +
      (typeof s.summary.total_geral === "number" ? s.summary.total_geral : 0),
    0,
  )
  const todasOk = snapshot.length > 0 && totalConsolidado === 0

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

      {snapshot.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Saúde fiscal consolidada
            </h2>
            <div className="flex items-center gap-2 text-sm">
              {todasOk ? (
                <CheckCircle2Icon className="size-4 text-emerald-600" />
              ) : (
                <XCircleIcon className="size-4 text-amber-600" />
              )}
              <span className="text-muted-foreground">
                Total consolidado:
              </span>
              <strong
                className={`tabular-nums ${
                  todasOk ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {brl(totalConsolidado)}
              </strong>
              <span className="text-xs text-muted-foreground">
                · {snapshot.length} fonte{snapshot.length === 1 ? "" : "s"} verificada
                {snapshot.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {snapshot.map((s) => (
              <SourceCard key={s.documentType} snapshot={s} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Cada card mostra o relatório verificado mais recente de cada fonte
            (Federal, Estadual, Municipal). Clique para ver o detalhe.
          </p>
        </section>
      )}

      {snapshot.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum relatório verificado ainda. Suba e revise um relatório
              para ver a saúde fiscal consolidada.
            </p>
          </CardContent>
        </Card>
      )}

      {points.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Evolução RFB/PGFN no tempo
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <EvolucaoChart
              points={points}
              metric="total_geral"
              title="Total devido (CND)"
            />
            <EvolucaoChart
              points={points}
              metric="total_sief"
              title="Pendências SIEF"
            />
            <EvolucaoChart points={points} metric="total_pgfn" title="PGFN" />
            <EvolucaoChart
              points={points}
              metric="total_suspenso"
              title="Exigibilidade suspensa"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Os mini-charts mostram a evolução do Relatório de Situação Fiscal
            (RFB/PGFN) ao longo de múltiplas emissões.
          </p>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileTextIcon className="size-4" />
            Todos os relatórios ({relatorios.length})
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
                  <TableHead>Tipo</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {documentTypeLabel(r.document_type)}
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
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                        })}
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

function documentTypeLabel(docType: string): string {
  // Pequeno mapeamento amigável; quando handler for desconhecido,
  // mostra o id literal.
  switch (docType) {
    case "relatorio-situacao-fiscal":
      return "Federal RFB/PGFN"
    case "pendencias-iss-natal":
      return "Municipal Natal"
    case "extrato-fiscal-icms-rn":
      return "Estadual SEFAZ-RN"
    default:
      return docType
  }
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}
