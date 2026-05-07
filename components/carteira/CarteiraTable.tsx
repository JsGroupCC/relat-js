"use client"

import Link from "next/link"
import { SearchIcon, XIcon } from "lucide-react"
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

/**
 * Tabela com busca por razão social/CNPJ e toggle "só com débito".
 * Mantém a linha TOTAL visível, mas recalcula o agregado conforme o filtro.
 */
export function CarteiraTable({ snapshot }: Props) {
  const [query, setQuery] = useState("")
  const [onlyDebt, setOnlyDebt] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigits = stripCnpj(q)
    return snapshot.rows.filter((r) => {
      if (onlyDebt && r.total_geral <= 0) return false
      if (!q) return true
      const inName =
        (r.razao_social ?? "").toLowerCase().includes(q) ||
        (r.nome_fantasia ?? "").toLowerCase().includes(q)
      const inCnpj = qDigits.length > 0 && r.cnpj.includes(qDigits)
      return inName || inCnpj
    })
  }, [snapshot.rows, query, onlyDebt])

  const aggregates = useMemo(() => aggregate(filtered), [filtered])

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
              <TableHead>Empresa</TableHead>
              {FONTES.map((f) => (
                <TableHead key={f} className="text-right">
                  {FONTE_LABEL[f]}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Atualizado</TableHead>
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
