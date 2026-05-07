import Link from "next/link"
import {
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react"

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
import { listAllRelatorios } from "@/lib/relatorios/queries-list"
import { formatCnpj } from "@/lib/utils/cnpj"
import type { RelatorioStatus } from "@/types/database"

const STATUS_LABEL: Record<RelatorioStatus, string> = {
  pending: "Pendente",
  extracting: "Extraindo",
  reviewing: "Aguarda revisão",
  verified: "Verificado",
  failed: "Falhou",
}
const STATUS_TONE: Record<RelatorioStatus, string> = {
  pending: "text-muted-foreground",
  extracting: "text-blue-600",
  reviewing: "text-amber-600",
  verified: "text-emerald-600",
  failed: "text-destructive",
}

const DOC_TYPE_LABEL: Record<string, string> = {
  "relatorio-situacao-fiscal": "Federal RFB/PGFN",
  "pendencias-iss-natal": "Municipal Natal",
  "extrato-fiscal-icms-rn": "Estadual SEFAZ-RN",
}

interface SearchParams {
  status?: string | string[]
}

export default async function RelatoriosIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const statusFilter = parseStatusFilter(params.status)
  const all = await listAllRelatorios({ status: statusFilter })

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Todos os relatórios</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} relatório{all.length === 1 ? "" : "s"}
            {statusFilter && (
              <>
                {" "}
                · filtrando: {statusFilter.map((s) => STATUS_LABEL[s]).join(", ")}
              </>
            )}
          </p>
        </div>
        <Link
          href="/upload"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <UploadCloudIcon className="mr-2 size-4" />
          Novo upload
        </Link>
      </header>

      <FilterBar active={statusFilter} />

      {all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <FileTextIcon className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                {statusFilter
                  ? "Nenhum relatório com esses filtros."
                  : "Nenhum relatório ainda."}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusFilter
                  ? "Tente trocar o filtro ou suba um novo PDF."
                  : "Suba um PDF fiscal para começar."}
              </p>
            </div>
            <Link
              href="/upload"
              className={buttonVariants({ variant: "default" })}
            >
              <UploadCloudIcon className="mr-2 size-4" />
              Fazer upload
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista</CardTitle>
            <CardDescription>
              Ordenados por data de upload (mais recente primeiro).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quando</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((r) => {
                    const StatusIcon =
                      r.status === "verified"
                        ? CheckCircle2Icon
                        : r.status === "failed"
                          ? XCircleIcon
                          : r.status === "extracting"
                            ? Loader2Icon
                            : ClockIcon
                    const targetHref =
                      r.status === "verified"
                        ? `/relatorios/${r.id}`
                        : `/relatorios/${r.id}/revisar`
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[24ch] truncate font-medium">
                          {r.pdf_filename}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.empresa_razao_social ? (
                            <Link
                              href={`/empresas/${r.empresa_cnpj ?? ""}`}
                              className="hover:underline"
                            >
                              {r.empresa_razao_social}
                            </Link>
                          ) : r.empresa_cnpj ? (
                            <Link
                              href={`/empresas/${r.empresa_cnpj}`}
                              className="font-mono text-xs hover:underline"
                            >
                              {formatCnpj(r.empresa_cnpj)}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {DOC_TYPE_LABEL[r.document_type] ?? r.document_type}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${STATUS_TONE[r.status]}`}
                          >
                            <StatusIcon
                              className={`size-3 ${
                                r.status === "extracting" ? "animate-spin" : ""
                              }`}
                            />
                            {STATUS_LABEL[r.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatRelativeDate(r.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={targetHref}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                            })}
                          >
                            Ver →
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function FilterBar({ active }: { active: RelatorioStatus[] | undefined }) {
  const filters: Array<{ key: string; label: string; statuses: RelatorioStatus[] | null }> = [
    { key: "all", label: "Todos", statuses: null },
    { key: "reviewing", label: "Aguardando revisão", statuses: ["reviewing"] },
    { key: "verified", label: "Verificados", statuses: ["verified"] },
    { key: "failed", label: "Falhas", statuses: ["failed"] },
    {
      key: "extracting",
      label: "Em extração",
      statuses: ["pending", "extracting"],
    },
  ]
  const activeKey = !active
    ? "all"
    : active.length === 1
      ? active[0]
      : active.includes("extracting")
        ? "extracting"
        : "all"

  return (
    <nav className="flex flex-wrap gap-1">
      {filters.map((f) => {
        const isActive = activeKey === f.key
        const href =
          f.statuses === null
            ? "/relatorios"
            : `/relatorios?status=${f.statuses.join(",")}`
        return (
          <Link
            key={f.key}
            href={href}
            className={
              isActive
                ? buttonVariants({ variant: "default", size: "sm" })
                : buttonVariants({ variant: "ghost", size: "sm" })
            }
          >
            {f.label}
          </Link>
        )
      })}
    </nav>
  )
}

function parseStatusFilter(
  raw: SearchParams["status"],
): RelatorioStatus[] | undefined {
  if (!raw) return undefined
  const valid: RelatorioStatus[] = [
    "pending",
    "extracting",
    "reviewing",
    "verified",
    "failed",
  ]
  const list = Array.isArray(raw) ? raw.flatMap((s) => s.split(",")) : raw.split(",")
  const filtered = list.filter((s): s is RelatorioStatus =>
    valid.includes(s as RelatorioStatus),
  )
  return filtered.length > 0 ? filtered : undefined
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `${diffMin}m atrás`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d atrás`
  return d.toLocaleDateString("pt-BR")
}
