"use client"

import {
  AlertTriangleIcon,
  Building2Icon,
  CalendarIcon,
  CopyIcon,
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

import { computeSaldo, computeSummary, TIPO_LABEL } from "./compute"
import type { PendenciaIss, PendenciasIssNatal } from "./schema"
import { generateText } from "./text"

interface Props {
  relatorioId: string
  data: PendenciasIssNatal
  history?: PendenciasIssNatal[]
}

export function Dashboard({ data }: Props) {
  const summary = computeSummary(data)
  const text = useMemo(() => generateText(data), [data])
  const [copyOk, setCopyOk] = useState(false)
  const [filterTipo, setFilterTipo] = useState<string>("all")

  const tiposPresentes = Array.from(
    new Set(data.pendencias.map((p) => p.tipo)),
  )
  const filtered =
    filterTipo === "all"
      ? data.pendencias
      : data.pendencias.filter((p) => p.tipo === filterTipo)

  const chartData = aggregateByMonth(data.pendencias)

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
          Pendências Municipais — {data.metadados_relatorio.municipio}
        </p>
        <h1 className="text-2xl font-semibold">{data.contribuinte.razao_social}</h1>
        <p className="text-sm text-muted-foreground">
          CPF/CNPJ {data.contribuinte.cnpj} · posição em{" "}
          {formatDate(data.metadados_relatorio.data_emissao)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total devido" value={brl(summary.total_geral)} />
        <KpiCard
          label="ISS Simples Nacional"
          value={brl(summary.total_iss_simples_nacional)}
        />
        <KpiCard
          label="ISS Homologado"
          value={brl(summary.total_iss_homologado)}
        />
        <KpiCard
          label="Vencido"
          value={brl(summary.vencido)}
          tone={summary.vencido > 0 ? "warning" : undefined}
        />
      </div>

      {summary.vencido > 0 && (
        <Card className="border-amber-300/40 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium">
                {brl(summary.vencido)} em pendências já vencidas
              </p>
              <p className="text-xs text-muted-foreground">
                Esses valores estão sujeitos a juros e multa adicionais aos do
                relatório. Considere parcelamento ou pagamento à vista para
                regularizar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldo por período de vencimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="periodo" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => brlCompact(Number(v))}
                  />
                  <Tooltip
                    formatter={(v) => brl(Number(v))}
                    cursor={{ className: "fill-muted/40" }}
                  />
                  <Bar
                    dataKey="saldo"
                    className="fill-foreground/80"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Pendências ({filtered.length}/{data.pendencias.length})
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={filterTipo === "all" ? "default" : "ghost"}
              onClick={() => setFilterTipo("all")}
            >
              Todas
            </Button>
            {tiposPresentes.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={filterTipo === t ? "default" : "ghost"}
                onClick={() => setFilterTipo(t)}
              >
                {TIPO_LABEL[t]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Apropriado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">
                        {TIPO_LABEL[p.tipo]}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.origem}
                      </TableCell>
                      <TableCell>
                        {p.referencia}
                        {p.parcela && p.parcela > 0 ? ` p${p.parcela}` : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="size-3 text-muted-foreground" />
                          {formatDate(p.data_vencimento)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(p.valor_original)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.valor_apropriado != null ? brl(p.valor_apropriado) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {brl(computeSaldo(p))}
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
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2Icon className="size-4" />
            Texto para o cliente
          </CardTitle>
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
  tone,
}: {
  label: string
  value: string
  tone?: "warning"
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-xl font-semibold tabular-nums ${
            tone === "warning" ? "text-amber-600" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function aggregateByMonth(pendencias: PendenciaIss[]) {
  const map = new Map<string, number>()
  for (const p of pendencias) {
    const d = p.data_vencimento
    if (!d) continue
    const ym = d.slice(0, 7) // YYYY-MM
    map.set(ym, (map.get(ym) ?? 0) + computeSaldo(p))
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
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`
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
