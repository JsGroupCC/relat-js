"use client"

import Link from "next/link"
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  SearchIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import { RetryRelatorioButton } from "@/components/relatorios/RetryRelatorioButton"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RelatorioListItem } from "@/lib/relatorios/queries-list"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"
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

interface Props {
  relatorios: RelatorioListItem[]
}

export function RelatoriosList({ relatorios }: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return relatorios
    const qDigits = stripCnpj(q)
    return relatorios.filter((r) => {
      const inFile = r.pdf_filename.toLowerCase().includes(q)
      const inEmpresa =
        (r.empresa_razao_social ?? "").toLowerCase().includes(q)
      const inCnpj = qDigits.length > 0 && (r.empresa_cnpj ?? "").includes(qDigits)
      return inFile || inEmpresa || inCnpj
    })
  }, [relatorios, query])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por arquivo, empresa ou CNPJ"
            className="pl-8"
          />
        </div>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
            Limpar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} de {relatorios.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quando</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum relatório bate com a busca.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
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
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "failed" && (
                          <RetryRelatorioButton
                            relatorioId={r.id}
                            variant="ghost"
                            size="sm"
                            label="Tentar"
                            loadingLabel="…"
                          />
                        )}
                        <Link
                          href={targetHref}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          Ver →
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
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
