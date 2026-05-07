"use client"

import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { EmpresaWithStats } from "@/lib/empresas/queries"
import { formatCnpj, stripCnpj } from "@/lib/utils/cnpj"

type SortKey = "razao" | "relatorios" | "ultimo"
type SortDir = "asc" | "desc"

interface Props {
  empresas: EmpresaWithStats[]
}

export function EmpresasList({ empresas }: Props) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("razao")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigits = stripCnpj(q)

    const filtered = !q
      ? empresas
      : empresas.filter((e) => {
          const inName =
            (e.razao_social ?? "").toLowerCase().includes(q) ||
            (e.nome_fantasia ?? "").toLowerCase().includes(q)
          const inCnpj = qDigits.length > 0 && e.cnpj.includes(qDigits)
          return inName || inCnpj
        })

    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "razao":
          return (
            (a.razao_social ?? "ㅤ").localeCompare(b.razao_social ?? "ㅤ") *
            dir
          )
        case "relatorios":
          return (a.relatorios_count - b.relatorios_count) * dir
        case "ultimo":
          return ((a.ultimo_relatorio_at ?? "") < (b.ultimo_relatorio_at ?? "")
            ? -1
            : 1) * dir
      }
    })
  }, [empresas, query, sortKey, sortDir])

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "razao" ? "asc" : "desc")
    }
  }

  return (
    <section className="space-y-3">
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

        <SortPill
          label="Razão social"
          active={sortKey === "razao"}
          dir={sortDir}
          onClick={() => onSort("razao")}
        />
        <SortPill
          label="Relatórios"
          active={sortKey === "relatorios"}
          dir={sortDir}
          onClick={() => onSort("relatorios")}
        />
        <SortPill
          label="Último upload"
          active={sortKey === "ultimo"}
          dir={sortDir}
          onClick={() => onSort("ultimo")}
        />

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filteredAndSorted.length} de {empresas.length}
        </span>
      </div>

      {filteredAndSorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Building2Icon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Nenhuma empresa bate com a busca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredAndSorted.map((e) => (
            <Link key={e.id} href={`/empresas/${e.cnpj}`}>
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardContent className="space-y-2 p-4">
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {e.razao_social ?? "(sem razão social)"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatCnpj(e.cnpj)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {e.relatorios_count} relatório
                      {e.relatorios_count === 1 ? "" : "s"}
                    </span>
                    {e.ultimo_relatorio_at && (
                      <span>
                        Último{" "}
                        {new Date(e.ultimo_relatorio_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

interface SortPillProps {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}

function SortPill({ label, active, dir, onClick }: SortPillProps) {
  const Icon = !active
    ? ChevronsUpDownIcon
    : dir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
        active
          ? "border-foreground/40 bg-muted text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <Icon className="size-3" />
    </button>
  )
}
