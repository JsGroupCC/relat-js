"use client"

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  XCircleIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { computeSummary } from "./compute"
import type { Debito, RelatorioSituacaoFiscal } from "./schema"
import { generateText } from "./text"

interface Props {
  relatorioId: string
  data: RelatorioSituacaoFiscal
  history?: RelatorioSituacaoFiscal[]
}

type DebitoRow = Debito & { tipo: "sief" | "suspenso" | "pgfn" }

const TIPO_LABEL: Record<DebitoRow["tipo"], string> = {
  sief: "SIEF",
  suspenso: "Suspenso",
  pgfn: "PGFN",
}

export function Dashboard({ data }: Props) {
  const summary = computeSummary(data)
  const text = useMemo(() => generateText(data), [data])
  const [copyOk, setCopyOk] = useState(false)

  const allDebitos: DebitoRow[] = [
    ...data.pendencias_sief.map((d) => ({ ...d, tipo: "sief" as const })),
    ...data.debitos_exigibilidade_suspensa.map((d) => ({
      ...d,
      tipo: "suspenso" as const,
    })),
    ...data.pgfn.debitos.map((d) => ({ ...d, tipo: "pgfn" as const })),
  ]

  const [filterTipo, setFilterTipo] = useState<"all" | DebitoRow["tipo"]>("all")
  const filtered =
    filterTipo === "all"
      ? allDebitos
      : allDebitos.filter((d) => d.tipo === filterTipo)

  const chartData = aggregateByPeriodo(allDebitos)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyOk(true)
      toast.success("Texto copiado.")
      setTimeout(() => setCopyOk(false), 1500)
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Relatório de Situação Fiscal
        </p>
        <h1 className="text-2xl font-semibold">{data.empresa.razao_social}</h1>
        <p className="text-sm text-muted-foreground">
          CNPJ {data.empresa.cnpj} · emitido em{" "}
          {formatDate(data.metadados_relatorio.data_emissao)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total devido (CND)" value={brl(summary.total_geral)} />
        <KpiCard
          label="Pendências SIEF"
          value={brl(summary.total_pendencias_sief)}
          hint={`${summary.quantidade_sief} débito(s)`}
        />
        <KpiCard
          label="PGFN"
          value={brl(summary.total_pgfn)}
          hint={`${summary.quantidade_pgfn} débito(s)`}
        />
        <KpiCard
          label="Exigibilidade suspensa"
          value={brl(summary.total_exigibilidade_suspensa)}
          hint={`${summary.quantidade_suspensa} débito(s)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CertidaoCard
          label="CND"
          ok={summary.pode_emitir_cnd}
          messageOk="Empresa pode emitir Certidão Negativa de Débitos."
          messageNo="Há pendências que bloqueiam a emissão da CND."
        />
        <CertidaoCard
          label="CPD-EN"
          ok={summary.pode_emitir_cpd_en}
          messageOk="Empresa pode emitir CPD-EN."
          messageNo="Há débitos com exigibilidade suspensa — CPD-EN bloqueada."
        />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldo por período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="periodo" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => brlCompact(v as number)}
                  />
                  <Tooltip
                    formatter={(v) => brl(Number(v))}
                    cursor={{ className: "fill-muted/40" }}
                  />
                  <Bar dataKey="saldo" className="fill-foreground/80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Débitos ({filtered.length}/{allDebitos.length})
          </CardTitle>
          <div className="flex gap-1">
            {(["all", "sief", "suspenso", "pgfn"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={filterTipo === t ? "default" : "ghost"}
                onClick={() => setFilterTipo(t)}
              >
                {t === "all" ? "Todos" : TIPO_LABEL[t]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum débito.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">
                        {TIPO_LABEL[d.tipo]}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {d.receita_codigo}
                      </TableCell>
                      <TableCell className="max-w-[20ch] truncate">
                        {d.receita_descricao}
                      </TableCell>
                      <TableCell>{d.periodo_apuracao}</TableCell>
                      <TableCell>{formatDate(d.data_vencimento)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {brl(d.saldo_consolidado ?? d.saldo_devedor)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.situacao}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Texto para o cliente</CardTitle>
          <Button variant="outline" size="sm" onClick={onCopy}>
            <CopyIcon className="mr-1.5 size-4" />
            {copyOk ? "Copiado" : "Copiar"}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
            {text}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function CertidaoCard({
  label,
  ok,
  messageOk,
  messageNo,
}: {
  label: string
  ok: boolean
  messageOk: string
  messageNo: string
}) {
  const Icon = ok ? CheckCircle2Icon : XCircleIcon
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <Icon
          className={`size-6 shrink-0 ${
            ok ? "text-emerald-600" : "text-amber-600"
          }`}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {ok ? messageOk : messageNo}
          </p>
          {!ok && (
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangleIcon className="size-3" /> Resolva pendências antes
              de emitir.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function aggregateByPeriodo(rows: DebitoRow[]) {
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!r.periodo_apuracao) continue
    const saldo = r.saldo_consolidado ?? r.saldo_devedor ?? 0
    map.set(r.periodo_apuracao, (map.get(r.periodo_apuracao) ?? 0) + saldo)
  }
  return Array.from(map.entries())
    .map(([periodo, saldo]) => ({ periodo, saldo }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
}

function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n)
}

function brlCompact(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `R$ ${(n / 1000).toFixed(0)}k`
  }
  return brl(n)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}
