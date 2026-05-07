"use client"

import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  FONTE_LABEL,
  type CarteiraRow,
  type CarteiraSnapshot,
  type FonteFiscal,
} from "@/lib/empresas/carteira-types"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"

const FONTES: FonteFiscal[] = ["federal", "estadual", "municipal", "outros"]

const formatBrl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })

interface Props {
  snapshot: CarteiraSnapshot
}

type SortKey = "empresa" | "total" | "atualizado" | FonteFiscal
type SortDir = "asc" | "desc"

/**
 * Tabela com busca por razão social/CNPJ, toggle "só com débito" e sort
 * clicável em todas as colunas. Mantém a linha TOTAL visível e recalcula
 * o agregado conforme o filtro.
 */
export function CarteiraTable({ snapshot }: Props) {
  const [query, setQuery] = useState("")
  const [onlyDebt, setOnlyDebt] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigits = stripCnpj(q)
    const list = snapshot.rows.filter((r) => {
      if (onlyDebt && r.total_geral <= 0) return false
      if (!q) return true
      const inName =
        (r.razao_social ?? "").toLowerCase().includes(q) ||
        (r.nome_fantasia ?? "").toLowerCase().includes(q)
      const inCnpj = qDigits.length > 0 && r.cnpj.includes(qDigits)
      return inName || inCnpj
    })

    const dir = sortDir === "asc" ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "empresa":
          return (
            (a.razao_social ?? "ㅤ").localeCompare(b.razao_social ?? "ㅤ") *
            dir
          )
        case "atualizado":
          return ((a.ultimo_relatorio_at ?? "") < (b.ultimo_relatorio_at ?? "")
            ? -1
            : 1) * dir
        case "total":
          return (a.total_geral - b.total_geral) * dir
        case "federal":
        case "estadual":
        case "municipal":
        case "outros":
          return (a.por_fonte[sortKey] - b.por_fonte[sortKey]) * dir
      }
    })
  }, [snapshot.rows, query, onlyDebt, sortKey, sortDir])

  const aggregates = useMemo(() => aggregate(filtered), [filtered])

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      // Default desc para colunas numéricas; asc só pra empresa
      setSortDir(key === "empresa" ? "asc" : "desc")
    }
  }

  const noResults = filtered.length === 0
  const hasFilters = !!query || onlyDebt

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por razão social ou CNPJ"
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyDebt}
            onChange={(e) => setOnlyDebt(e.target.checked)}
            className="size-4 accent-amber-600"
          />
          Só com débito
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setOnlyDebt(false)
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
            Limpar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} de {snapshot.rows.length} empresa
          {snapshot.rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Empresa"
                active={sortKey === "empresa"}
                dir={sortDir}
                onClick={() => onSort("empresa")}
              />
              {FONTES.map((f) => (
                <SortableHead
                  key={f}
                  label={FONTE_LABEL[f]}
                  active={sortKey === f}
                  dir={sortDir}
                  onClick={() => onSort(f)}
                  align="right"
                />
              ))}
              <SortableHead
                label="Total"
                active={sortKey === "total"}
                dir={sortDir}
                onClick={() => onSort("total")}
                align="right"
              />
              <SortableHead
                label="Atualizado"
                active={sortKey === "atualizado"}
                dir={sortDir}
                onClick={() => onSort("atualizado")}
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {noResults ? (
              <TableRow>
                <TableCell
                  colSpan={FONTES.length + 3}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhuma empresa bate com os filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.empresa_id}>
                  <TableCell className="max-w-[28ch] truncate">
                    <Link
                      href={`/empresas/${r.cnpj}`}
                      className="font-medium hover:underline"
                    >
                      {r.razao_social ?? formatCnpj(r.cnpj)}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">
                      {formatCnpj(r.cnpj)}
                    </div>
                  </TableCell>
                  {FONTES.map((f) => (
                    <TableCell
                      key={f}
                      className="text-right tabular-nums text-sm"
                    >
                      {r.por_fonte[f] > 0 ? (
                        formatBrl(r.por_fonte[f])
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      r.total_geral > 0
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r.total_geral > 0 ? formatBrl(r.total_geral) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {r.ultimo_relatorio_at
                      ? new Date(r.ultimo_relatorio_at).toLocaleDateString(
                          "pt-BR",
                        )
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}

            {!noResults && (
              <TableRow className="border-t-2 bg-muted/30">
                <TableCell className="font-semibold">
                  {hasFilters ? "TOTAL FILTRADO" : "TOTAL"}
                </TableCell>
                {FONTES.map((f) => (
                  <TableCell
                    key={f}
                    className="text-right font-semibold tabular-nums"
                  >
                    {aggregates.por_fonte[f] > 0
                      ? formatBrl(aggregates.por_fonte[f])
                      : "—"}
                  </TableCell>
                ))}
                <TableCell
                  className={`text-right font-semibold tabular-nums ${
                    aggregates.total_geral > 0
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatBrl(aggregates.total_geral)}
                </TableCell>
                <TableCell />
              </TableRow>
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
  align?: "left" | "right"
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: SortableHeadProps) {
  const Icon = !active
    ? ChevronsUpDownIcon
    : dir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "ml-auto" : ""
        } ${active ? "text-foreground" : "hover:text-foreground"}`}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  )
}

function aggregate(rows: CarteiraRow[]) {
  const por_fonte: Record<FonteFiscal, number> = {
    federal: 0,
    estadual: 0,
    municipal: 0,
    outros: 0,
  }
  let total_geral = 0
  for (const r of rows) {
    total_geral += r.total_geral
    for (const f of FONTES) por_fonte[f] += r.por_fonte[f]
  }
  return { por_fonte, total_geral }
}
