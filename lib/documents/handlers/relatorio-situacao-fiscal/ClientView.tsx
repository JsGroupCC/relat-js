"use client"

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  XCircleIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { computeSummary } from "./compute"
import type { Debito, RelatorioSituacaoFiscal } from "./schema"

interface Props {
  data: RelatorioSituacaoFiscal
  empresa?: {
    cnpj: string
    razao_social: string | null
    nome_fantasia: string | null
  } | null
}

/**
 * Visão pensada para o CLIENTE FINAL — não para o profissional.
 * Linguagem simples (sem "SIEF", "PGFN", "exigibilidade"), foco em
 * "o que isso significa pra você", visual menos denso.
 */
export function ClientView({ data, empresa }: Props) {
  const s = computeSummary(data)
  const empresaName = empresa?.razao_social ?? data.empresa.razao_social
  const cnpj = empresa?.cnpj ?? data.empresa.cnpj

  const status: "ok" | "atencao" | "pendencia" =
    s.total_geral === 0 && s.total_exigibilidade_suspensa === 0
      ? "ok"
      : s.total_geral === 0
        ? "atencao"
        : "pendencia"

  const todosDebitos = [
    ...data.pendencias_sief.map((d) => ({ ...d, tipoCliente: "imediato" as const })),
    ...data.debitos_exigibilidade_suspensa.map((d) => ({
      ...d,
      tipoCliente: "suspenso" as const,
    })),
    ...data.pgfn.debitos.map((d) => ({ ...d, tipoCliente: "imediato" as const })),
  ]

  const chartData = aggregateByPeriodo(todosDebitos)

  return (
    <div className="share-view space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Análise fiscal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {empresaName}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          CNPJ {formatCnpj(cnpj)}
        </p>
        {data.metadados_relatorio.data_emissao && (
          <p className="text-sm text-muted-foreground">
            Documento emitido em{" "}
            <strong>{formatDate(data.metadados_relatorio.data_emissao)}</strong>
          </p>
        )}
      </header>

      <StatusCard status={status} totalDevido={s.total_geral} />

      <Section
        title="Resumo da situação"
        helpText="Esta é a visão geral dos valores em aberto na empresa, com base no documento mais recente da Receita Federal."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Highlight
            label="Total devido agora"
            value={brl(s.total_geral)}
            help="Soma dos débitos que precisam de regularização para emitir certidão de regularidade fiscal."
            tone={s.total_geral > 0 ? "warning" : "positive"}
          />
          <Highlight
            label="Em discussão"
            value={brl(s.total_exigibilidade_suspensa)}
            help="Débitos parcelados ou com decisão judicial que os mantém suspensos. Não precisam ser quitados imediatamente, mas seguem em aberto."
            tone={
              s.total_exigibilidade_suspensa > 0 ? "neutral" : "muted"
            }
          />
        </div>
      </Section>

      {chartData.length > 1 && (
        <Section
          title="Onde estão concentrados os valores"
          helpText="Cada barra mostra um período (mês/ano) em que há débito pendente. Períodos mais antigos costumam acumular juros."
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="periodo" fontSize={11} tickMargin={8} />
                <YAxis
                  fontSize={11}
                  tickFormatter={(v) => brlCompact(Number(v))}
                  width={60}
                />
                <Tooltip
                  formatter={(v) => brl(Number(v))}
                  cursor={{ className: "fill-muted/40" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="saldo" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.saldo > 0 ? "var(--foreground)" : "var(--muted-foreground)"
                      }
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section
        title="Detalhe dos débitos"
        helpText={`São ${s.quantidade_debitos} débito(s) identificado(s) no documento. A coluna "tipo" indica se o débito precisa ser pago agora ou está em discussão.`}
      >
        {todosDebitos.length === 0 ? (
          <p className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Nenhum débito pendente.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Período</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {todosDebitos.map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{d.receita_descricao}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {d.receita_codigo}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {d.periodo_apuracao}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {brl(d.saldo_consolidado ?? d.saldo_devedor)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.tipoCliente === "imediato"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                            : "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                        }`}
                      >
                        {d.tipoCliente === "imediato"
                          ? "A regularizar"
                          : "Em discussão"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="O que isso significa">
        <ul className="space-y-3 text-sm leading-relaxed">
          <li className="flex gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <span>
              <strong>Certidão Negativa de Débitos (CND):</strong>{" "}
              {s.pode_emitir_cnd ? (
                <>
                  sua empresa <strong>pode emitir</strong> a CND. Esse é o
                  documento que comprova regularidade fiscal e costuma ser
                  exigido em licitações, financiamentos e contratos públicos.
                </>
              ) : (
                <>
                  sua empresa <strong>não consegue emitir</strong> a CND
                  enquanto houver débitos a regularizar. Isso pode bloquear
                  participação em licitações e contratos com o poder público.
                </>
              )}
            </span>
          </li>
          {s.total_exigibilidade_suspensa > 0 && (
            <li className="flex gap-3">
              <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-blue-600" />
              <span>
                <strong>Débitos em discussão:</strong> existem{" "}
                {brl(s.total_exigibilidade_suspensa)} em débitos parcelados ou
                em discussão judicial. Eles não precisam ser quitados
                imediatamente, mas é importante acompanhar para que o
                parcelamento siga em dia.
              </span>
            </li>
          )}
          {s.total_geral > 0 && (
            <li className="flex gap-3">
              <XCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <strong>Próximos passos:</strong> recomendamos avaliar opções
                como pagamento à vista (com possíveis descontos), parcelamento
                ordinário ou parcelamentos especiais que estiverem disponíveis.
                Entre em contato com seu contador para definir a melhor
                estratégia.
              </span>
            </li>
          )}
        </ul>
      </Section>

      <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
        Esta análise foi gerada a partir do documento oficial emitido pela
        Receita Federal e Procuradoria-Geral da Fazenda Nacional.
        <br />
        Os valores podem mudar a qualquer momento conforme novos lançamentos,
        pagamentos ou parcelamentos sejam processados.
      </footer>
    </div>
  )
}

function StatusCard({
  status,
  totalDevido,
}: {
  status: "ok" | "atencao" | "pendencia"
  totalDevido: number
}) {
  const config = {
    ok: {
      icon: CheckCircle2Icon,
      title: "Empresa em situação regular",
      message:
        "Não há débitos pendentes nem em discussão. A empresa pode emitir certidão de regularidade fiscal.",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-900",
      iconColor: "text-emerald-600",
    },
    atencao: {
      icon: AlertCircleIcon,
      title: "Atenção: há débitos em discussão",
      message:
        "Não há valores a regularizar imediatamente, mas existem débitos em discussão (parcelados ou judicializados) que precisam ser acompanhados.",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-900",
      iconColor: "text-blue-600",
    },
    pendencia: {
      icon: XCircleIcon,
      title: "Há débitos a regularizar",
      message: `Identificamos ${brl(totalDevido)} em débitos que precisam ser quitados ou parcelados para a empresa voltar à situação regular.`,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-900",
      iconColor: "text-amber-600",
    },
  }[status]

  const Icon = config.icon

  return (
    <div className={`rounded-2xl border p-6 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-4">
        <Icon className={`mt-0.5 size-7 shrink-0 ${config.iconColor}`} />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.message}</p>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  helpText,
  children,
}: {
  title: string
  helpText?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {helpText && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <HelpCircleIcon className="mt-0.5 size-4 shrink-0 opacity-70" />
            <span>{helpText}</span>
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function Highlight({
  label,
  value,
  help,
  tone,
}: {
  label: string
  value: string
  help: string
  tone: "positive" | "warning" | "neutral" | "muted"
}) {
  const valueColor = {
    positive: "text-emerald-600",
    warning: "text-amber-600",
    neutral: "text-blue-600",
    muted: "text-muted-foreground",
  }[tone]
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{help}</p>
    </div>
  )
}

function aggregateByPeriodo(rows: Debito[]) {
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
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`
  return brl(n)
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "").padStart(14, "0").slice(-14)
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d)
}
