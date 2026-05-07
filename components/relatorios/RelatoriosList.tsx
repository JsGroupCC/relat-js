"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  ChevronsUpDownIcon,
  ClockIcon,
  Loader2Icon,
  SearchIcon,
  Trash2Icon,
  XCircleIcon,
  XIcon,
} from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { RetryRelatorioButton } from "@/components/relatorios/RetryRelatorioButton"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { bulkDeleteRelatoriosAction } from "@/lib/relatorios/actions"
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

// Ordem usada como tiebreaker quando 2+ relatórios têm o mesmo status
// no sort. Reflete a ordem natural do pipeline: failed primeiro (mais
// urgente), depois reviewing, etc.
const STATUS_ORDER: Record<RelatorioStatus, number> = {
  failed: 0,
  reviewing: 1,
  extracting: 2,
  pending: 3,
  verified: 4,
}

const DOC_TYPE_LABEL: Record<string, string> = {
  "relatorio-situacao-fiscal": "Federal RFB/PGFN",
  "pendencias-iss-natal": "Municipal Natal",
  "extrato-fiscal-icms-rn": "Estadual SEFAZ-RN",
}

type SortKey = "filename" | "empresa" | "status" | "created_at"
type SortDir = "asc" | "desc"

interface Props {
  relatorios: RelatorioListItem[]
}

export function RelatoriosList({ relatorios }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [bulkPending, startBulk] = useTransition()

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigits = stripCnpj(q)
    const filtered = !q
      ? relatorios
      : relatorios.filter((r) => {
          const inFile = r.pdf_filename.toLowerCase().includes(q)
          const inEmpresa =
            (r.empresa_razao_social ?? "").toLowerCase().includes(q)
          const inCnpj = qDigits.length > 0 && (r.empresa_cnpj ?? "").includes(qDigits)
          return inFile || inEmpresa || inCnpj
        })

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "filename":
          return a.pdf_filename.localeCompare(b.pdf_filename) * dir
        case "empresa":
          return (
            (a.empresa_razao_social ?? "ㅤ").localeCompare(
              b.empresa_razao_social ?? "ㅤ",
            ) * dir
          )
        case "status":
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir
        case "created_at":
        default:
          return (a.created_at < b.created_at ? -1 : 1) * dir
      }
    })

    return sorted
  }, [relatorios, query, sortKey, sortDir])

  const visibleIds = filteredAndSorted.map((r) => r.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id))

  const onToggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  const onToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "created_at" ? "desc" : "asc")
    }
  }

  const onBulkDelete = () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (
      !confirm(
        `Excluir ${ids.length} relatório${ids.length === 1 ? "" : "s"}? Isso apaga os PDFs do storage e os débitos vinculados. Não tem como desfazer.`,
      )
    ) {
      return
    }
    startBulk(async () => {
      const res = await bulkDeleteRelatoriosAction(ids)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(
        `${res.deleted} relatório${res.deleted === 1 ? "" : "s"} excluído${res.deleted === 1 ? "" : "s"}.`,
      )
      setSelected(new Set())
      router.refresh()
    })
  }

  const hasSelection = selected.size > 0

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
          {filteredAndSorted.length} de {relatorios.length}
        </span>
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} selecionado{selected.size === 1 ? "" : "s"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Limpar seleção
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBulkDelete}
            disabled={bulkPending}
            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {bulkPending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2Icon className="mr-2 size-4" />
            )}
            Excluir selecionados
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-9">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos visíveis"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected
                  }}
                  onChange={onToggleAllVisible}
                  className="size-4 accent-amber-600"
                />
              </TableHead>
              <SortableHead
                label="Arquivo"
                active={sortKey === "filename"}
                dir={sortDir}
                onClick={() => onSort("filename")}
              />
              <SortableHead
                label="Empresa"
                active={sortKey === "empresa"}
                dir={sortDir}
                onClick={() => onSort("empresa")}
              />
              <TableHead>Tipo</TableHead>
              <SortableHead
                label="Status"
                active={sortKey === "status"}
                dir={sortDir}
                onClick={() => onSort("status")}
              />
              <SortableHead
                label="Quando"
                active={sortKey === "created_at"}
                dir={sortDir}
                onClick={() => onSort("created_at")}
              />
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum relatório bate com a busca.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((r) => {
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
                const isSelected = selected.has(r.id)
                return (
                  <TableRow key={r.id} data-selected={isSelected}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${r.pdf_filename}`}
                        checked={isSelected}
                        onChange={() => onToggle(r.id)}
                        className="size-4 accent-amber-600"
                      />
                    </TableCell>
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

interface SortableHeadProps {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}

function SortableHead({ label, active, dir, onClick }: SortableHeadProps) {
  const Icon = !active
    ? ChevronsUpDownIcon
    : dir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? "text-foreground" : "hover:text-foreground"}`}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
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
