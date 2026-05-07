"use client"

import {
  AlertTriangleIcon,
  Building2Icon,
  CalendarIcon,
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

import { computeSummary, OBRIGACAO_LABEL, ORIGEM_LABEL } from "./compute"
import type { DebitoIcms, ExtratoFiscalIcmsRn } from "./schema"
import { generateText } from "./text"

interface Props {
  relatorioId: string
  data: ExtratoFiscalIcmsRn
  history?: ExtratoFiscalIcmsRn[]
}

export function Dashboard({ data }: Props) {
  const summary = computeSummary(data)
  const text = useMemo(() => generateText(data), [data])
  const [copyOk, setCopyOk] = useState(false)
  const [filterOrigem, setFilterOrigem] = useState<string>("all")

  const todosDebitos = [...data.debitos_vencidos, ...data.debitos_a_vencer]
  const origensPresentes = Array.from(
    new Set(todosDebitos.map((d) => d.origem_tipo)),
  )
  const filtered =
    filterOrigem === "all"
      ? data.debitos_vencidos
      : data.debitos_vencidos.filter((d) => d.origem_tipo === filterOrigem)

  const chartData = aggregateByMonth(data.debitos_vencidos)

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
          Extrato Fiscal Estadual — SEFAZ {data.metadados_relatorio.uf}
        </p>
        <h1 className="text-2xl font-semibold">{data.empresa.razao_social}</h1>
        <p className="text-sm text-muted-foreground">
          CNPJ {data.empresa.cnpj}
          {data.empresa.inscricao_estadual && (
            <> · IE {data.empresa.inscricao_estadual}</>
          )}{" "}
          · posição em {formatDate(data.metadados_relatorio.data_emissao)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total devido" value={brl(summary.total_geral)} />
        <KpiCard
          label="Débitos vencidos"
          value={brl(summary.total_debitos_vencidos)}
          hint={`${summary.quantidade_vencidos} lançamento(s)`}
          tone={summary.quantidade_vencidos > 0 ? "warning" : undefined}
        />
        <KpiCard
          label="A vencer"
          value={brl(summary.total_debitos_a_vencer)}
          hint={`${summary.quantidade_a_vencer} lançamento(s)`}
        />
        <KpiCard
          label="Cobrança bancária"
          value={brl(summary.total_cobranca_bancaria)}
          tone={summary.total_cobranca_bancaria > 0 ? "warning" : undefined}
        />
      </div>

      {(summary.esta_criticado || summary.esta_inibido) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <XCircleIcon className="mt-0.5 size-6 shrink-0 text-destructive" />
            <div className="space-y-0.5">
              <p className="font-medium text-destructive">
                Situação fiscal: {data.situacao.fiscal}
              </p>
              <p className="text-sm text-muted-foreground">
                {summary.esta_criticado &&
                  "Empresa CRITICADA pela SEFAZ — pendências bloqueiam credenciamento e podem afetar emissão de NFe. "}
                {summary.esta_inibido &&
                  data.situacao.credenciamento_icms_antecipado &&
                  `Credenciamento ICMS antecipado: ${data.situacao.credenciamento_icms_antecipado}.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Débitos vencidos por período
            </CardTitle>
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

      {data.obrigacoes_acessorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Obrigações acessórias ({data.obrigacoes_acessorias.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Apurado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.obrigacoes_acessorias.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">
                        {OBRIGACAO_LABEL[o.tipo]}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {o.referencia}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {o.valor_pago != null ? brl(o.valor_pago) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {o.valor_apurado != null ? brl(o.valor_apurado) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {o.valor_diferenca != null
                          ? brl(o.valor_diferenca)
                          : o.valor_total != null
                            ? brl(o.valor_total)
                            : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Débitos vencidos ({filtered.length}/{data.debitos_vencidos.length})
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={filterOrigem === "all" ? "default" : "ghost"}
              onClick={() => setFilterOrigem("all")}
            >
              Todos
            </Button>
            {origensPresentes.map((o) => (
              <Button
                key={o}
                size="sm"
                variant={filterOrigem === o ? "default" : "ghost"}
                onClick={() => setFilterOrigem(o)}
              >
                {ORIGEM_LABEL[o]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem débitos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Documento / Detalhe</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Emitente/Destinatário</TableHead>
                    <TableHead className="text-right">ICMS</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">
                        {ORIGEM_LABEL[d.origem_tipo]}
                      </TableCell>
                      <TableCell className="max-w-[24ch] truncate font-mono text-xs">
                        {d.origem_descricao}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs">
                          <CalendarIcon className="size-3 text-muted-foreground" />
                          {formatDate(d.data_vencimento)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[18ch] truncate text-xs text-muted-foreground">
                        {d.razao_social ?? d.cnpj_emitente_destinatario ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {d.icms != null ? brl(d.icms) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {brl(d.valor)}
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
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
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
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function aggregateByMonth(debitos: DebitoIcms[]) {
  const map = new Map<string, number>()
  for (const d of debitos) {
    if (!d.data_vencimento) continue
    const ym = d.data_vencimento.slice(0, 7)
    map.set(ym, (map.get(ym) ?? 0) + d.valor)
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
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
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

// Suppress unused warnings while keeping the alarm icon available for future use
void AlertTriangleIcon
