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

import { computeSummary, ORIGEM_LABEL } from "./compute"
import type {
  DebitoIcms,
  DebitoOrigemTipo,
  ExtratoFiscalIcmsRn,
} from "./schema"

interface Props {
  data: ExtratoFiscalIcmsRn
  empresa?: {
    cnpj: string
    razao_social: string | null
    nome_fantasia: string | null
  } | null
}

export function ClientView({ data, empresa }: Props) {
  const s = computeSummary(data)
  const empresaName = empresa?.razao_social ?? data.empresa.razao_social
  const cnpj = empresa?.cnpj ?? data.empresa.cnpj

  const status: "ok" | "atencao" | "pendencia" =
    s.esta_criticado || s.total_debitos_vencidos > 0
      ? "pendencia"
      : s.total_debitos_a_vencer > 0
        ? "atencao"
        : "ok"

  const chartData = aggregateByMonth(data.debitos_vencidos)
  const debitosPorOrigem = groupByOrigem(data.debitos_vencidos)

  return (
    <div className="share-view space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Análise fiscal estadual — {data.metadados_relatorio.uf}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {empresaName}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">CNPJ {cnpj}</p>
        {data.empresa.inscricao_estadual && (
          <p className="text-sm text-muted-foreground">
            Inscrição Estadual: <strong>{data.empresa.inscricao_estadual}</strong>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Posição em <strong>{formatDate(data.metadados_relatorio.data_emissao)}</strong>
        </p>
      </header>

      <StatusCard
        status={status}
        criticado={s.esta_criticado}
        totalVencido={s.total_debitos_vencidos}
        situacaoFiscal={data.situacao.fiscal}
      />

      <Section
        title="Resumo da situação"
        helpText="Esta é a visão geral dos tributos estaduais (ICMS) em aberto, com base no extrato mais recente da SEFAZ."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Highlight
            label="Débitos vencidos"
            value={brl(s.total_debitos_vencidos)}
            help="Tributos estaduais cuja data de vencimento já passou. Acumulam juros e multa diariamente."
            tone={s.total_debitos_vencidos > 0 ? "warning" : "positive"}
          />
          <Highlight
            label="Débitos a vencer"
            value={brl(s.total_debitos_a_vencer)}
            help="Tributos estaduais com vencimento futuro. Bom momento para se programar para o pagamento."
            tone={s.total_debitos_a_vencer > 0 ? "neutral" : "muted"}
          />
        </div>
      </Section>

      {debitosPorOrigem.size > 0 && (
        <Section
          title="De onde vêm os débitos"
          helpText="Cada categoria abaixo representa uma origem distinta dos débitos estaduais."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from(debitosPorOrigem.entries()).map(([origem, items]) => {
              const total = items.reduce((acc, d) => acc + d.valor, 0)
              return (
                <CategoryCard
                  key={origem}
                  title={ORIGEM_LABEL[origem]}
                  value={total}
                  count={items.length}
                  description={describeOrigem(origem)}
                />
              )
            })}
          </div>
        </Section>
      )}

      {chartData.length > 1 && (
        <Section
          title="Quando esses débitos venceram"
          helpText="Cada barra mostra o total de débitos com vencimento naquele mês. Períodos antigos costumam acumular mais juros."
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                        entry.saldo > 0
                          ? "var(--foreground)"
                          : "var(--muted-foreground)"
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

      <Section title="O que isso significa">
        <ul className="space-y-3 text-sm leading-relaxed">
          {s.esta_criticado && (
            <li className="flex gap-3">
              <XCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <strong>Situação fiscal CRITICADA:</strong> a SEFAZ marcou a
                empresa como crítica em razão das pendências. Isso{" "}
                <strong>bloqueia o credenciamento para ICMS antecipado</strong>{" "}
                e pode gerar restrições adicionais. Regularizar é prioridade.
              </span>
            </li>
          )}
          {s.total_cobranca_bancaria > 0 && (
            <li className="flex gap-3">
              <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <strong>Cobrança bancária ativa:</strong>{" "}
                {brl(s.total_cobranca_bancaria)} já foram enviados para
                cobrança no banco. Esses valores podem virar protesto se não
                forem regularizados.
              </span>
            </li>
          )}
          {s.quantidade_obrigacoes_acessorias > 0 && (
            <li className="flex gap-3">
              <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-blue-600" />
              <span>
                <strong>Obrigações acessórias:</strong> existem{" "}
                {s.quantidade_obrigacoes_acessorias} pendência(s) de
                declaração ou divergência (DAS, EFD). Mesmo sem valor
                monetário direto, elas mantêm a empresa em situação irregular.
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <span>
              <strong>Próximos passos:</strong> avaliar parcelamento estadual
              ou pagamento à vista (com possíveis descontos sobre juros e
              multa). Para débitos em cobrança bancária, contactar a SEFAZ
              diretamente para negociação.
            </span>
          </li>
        </ul>
      </Section>

      <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
        Esta análise foi gerada a partir do Extrato Fiscal oficial emitido
        pela Unidade Virtual de Tributação (UVT) da Secretaria da Fazenda do
        Rio Grande do Norte (SEFAZ-RN).
        <br />
        Os valores podem mudar a qualquer momento conforme novos lançamentos,
        pagamentos ou parcelamentos sejam processados.
      </footer>
    </div>
  )
}

function describeOrigem(origem: DebitoOrigemTipo): string {
  switch (origem) {
    case "nfe":
      return "Débitos relacionados a Notas Fiscais Eletrônicas com ICMS em aberto."
    case "efd":
      return "Apurações da EFD (Escrituração Fiscal Digital) com ICMS devido em aberto."
    case "rfb":
      return "Lançamentos da Receita Federal compartilhados com a SEFAZ estadual."
    default:
      return "Outras origens de débitos estaduais."
  }
}

function StatusCard({
  status,
  criticado,
  totalVencido,
  situacaoFiscal,
}: {
  status: "ok" | "atencao" | "pendencia"
  criticado: boolean
  totalVencido: number
  situacaoFiscal: string
}) {
  const config = {
    ok: {
      icon: CheckCircle2Icon,
      title: "Situação estadual regular",
      message:
        "Não há débitos vencidos no extrato estadual. A empresa está em situação fiscal adequada perante a SEFAZ.",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-900",
      iconColor: "text-emerald-600",
    },
    atencao: {
      icon: AlertCircleIcon,
      title: "Tudo em dia, mas há débitos a vencer",
      message:
        "Não há valores vencidos. Existem débitos com vencimento futuro que devem ser acompanhados.",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-900",
      iconColor: "text-blue-600",
    },
    pendencia: {
      icon: XCircleIcon,
      title: criticado
        ? `Situação fiscal: ${situacaoFiscal}`
        : "Há débitos vencidos",
      message: criticado
        ? `A empresa está marcada como ${situacaoFiscal} pela SEFAZ por conta de ${brl(totalVencido)} em débitos vencidos. Regularizar é prioridade.`
        : `Identificamos ${brl(totalVencido)} em débitos estaduais vencidos. Esses valores acumulam juros e multa diariamente.`,
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

function CategoryCard({
  title,
  value,
  count,
  description,
}: {
  title: string
  value: number
  count: number
  description: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{brl(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {count} lançamento{count === 1 ? "" : "s"}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
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

function groupByOrigem(
  debitos: DebitoIcms[],
): Map<DebitoOrigemTipo, DebitoIcms[]> {
  const map = new Map<DebitoOrigemTipo, DebitoIcms[]>()
  for (const d of debitos) {
    const list = map.get(d.origem_tipo) ?? []
    list.push(d)
    map.set(d.origem_tipo, list)
  }
  return map
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
    month: "long",
    year: "numeric",
  }).format(d)
}
