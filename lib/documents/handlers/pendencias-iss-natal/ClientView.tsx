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

import { computeSaldo, computeSummary, TIPO_LABEL } from "./compute"
import type { PendenciaIss, PendenciasIssNatal } from "./schema"

interface Props {
  data: PendenciasIssNatal
  empresa?: {
    cnpj: string
    razao_social: string | null
    nome_fantasia: string | null
  } | null
}

/**
 * Visão pensada para o CLIENTE FINAL — linguagem simples, sem jargão
 * fiscal. ISS Simples Nacional, ISS Homologado, Taxa de Vigilância:
 * tudo aparece como "tributos municipais" com explicação amigável.
 */
export function ClientView({ data, empresa }: Props) {
  const s = computeSummary(data)
  const empresaName = empresa?.razao_social ?? data.contribuinte.razao_social
  const cnpj = empresa?.cnpj ?? data.contribuinte.cnpj

  const status: "ok" | "atencao" | "pendencia" =
    s.total_geral === 0 ? "ok" : s.vencido > 0 ? "pendencia" : "atencao"

  const chartData = aggregateByMonth(data.pendencias)

  return (
    <div className="share-view space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Tributos municipais — {data.metadados_relatorio.municipio}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {empresaName}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          CPF/CNPJ {cnpj}
        </p>
        <p className="text-sm text-muted-foreground">
          Posição em <strong>{formatDate(data.metadados_relatorio.data_emissao)}</strong>
        </p>
      </header>

      <StatusCard status={status} totalDevido={s.total_geral} vencido={s.vencido} />

      <Section
        title="Resumo da situação"
        helpText="Esta é a visão geral dos tributos municipais em aberto, com base no documento mais recente da Prefeitura."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Highlight
            label="Total em aberto"
            value={brl(s.total_geral)}
            help="Soma de todos os tributos municipais pendentes (ISS, taxas, IPTU, etc.) que precisam de regularização."
            tone={s.total_geral > 0 ? "warning" : "positive"}
          />
          <Highlight
            label="Já vencido"
            value={brl(s.vencido)}
            help="Pendências cuja data de vencimento já passou. Ficam sujeitas a juros e multa de mora adicionais."
            tone={s.vencido > 0 ? "warning" : "muted"}
          />
        </div>
      </Section>

      {(s.total_iss_simples_nacional > 0 ||
        s.total_iss_homologado > 0 ||
        s.total_taxas > 0 ||
        s.total_iptu_tlp > 0) && (
        <Section
          title="Por categoria"
          helpText="Os tributos municipais foram agrupados em categorias para facilitar o acompanhamento."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {s.total_iss_simples_nacional > 0 && (
              <CategoryCard
                title="ISS Simples Nacional"
                value={s.total_iss_simples_nacional}
                description="ISS devido à Prefeitura nas competências em que a empresa estava no Simples Nacional. É declarado no PGDAS e recolhido junto ao DAS."
              />
            )}
            {s.total_iss_homologado > 0 && (
              <CategoryCard
                title="ISS Homologado"
                value={s.total_iss_homologado}
                description="ISS Próprio (sobre serviços prestados ou retidos) declarado e em aberto. Recolhido via DAM diretamente para a Prefeitura."
              />
            )}
            {s.total_taxas > 0 && (
              <CategoryCard
                title="Taxas (Vigilância/Licença)"
                value={s.total_taxas}
                description="Taxa de Vigilância Sanitária, Taxa de Licença de Funcionamento e similares — cobradas anualmente."
              />
            )}
            {s.total_iptu_tlp > 0 && (
              <CategoryCard
                title="IPTU + TLP"
                value={s.total_iptu_tlp}
                description="Imposto Predial e Territorial Urbano e Taxa de Limpeza Pública dos imóveis vinculados ao CNPJ."
              />
            )}
          </div>
        </Section>
      )}

      {chartData.length > 1 && (
        <Section
          title="Quando esses débitos venceram"
          helpText="Cada barra mostra o total de tributos com vencimento naquele mês. Períodos mais antigos costumam acumular mais juros."
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

      {data.pendencias.length > 0 && (
        <Section
          title="Detalhe das pendências"
          helpText={`São ${data.pendencias.length} lançamento(s) identificado(s) no documento. A coluna "categoria" indica o tipo de tributo.`}
        >
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Categoria</th>
                  <th className="px-3 py-2 text-left">Referência</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.pendencias.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{TIPO_LABEL[p.tipo]}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.tipo_descricao}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {p.referencia}
                      {p.parcela && p.parcela > 0 ? ` · parcela ${p.parcela}` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatDate(p.data_vencimento)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {brl(computeSaldo(p))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="O que isso significa">
        <ul className="space-y-3 text-sm leading-relaxed">
          <li className="flex gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <span>
              <strong>Forma de pagamento:</strong> tributos municipais em Natal
              são pagos via DAM (Documento de Arrecadação Municipal), na rede
              bancária ou em casas lotéricas. <strong>Não pague diretamente
              na sede da SEFIN</strong> — eles informam que isso é proibido.
            </span>
          </li>
          {s.total_iss_simples_nacional > 0 && s.total_iss_homologado > 0 && (
            <li className="flex gap-3">
              <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <strong>Atenção — ISS Simples × ISS Homologado:</strong> são
                lançamentos diferentes. Pagar ISS Homologado via DAM{" "}
                <strong>não amortiza</strong> a pendência de ISS Simples
                Nacional. Cada um precisa ser regularizado separadamente.
              </span>
            </li>
          )}
          {s.vencido > 0 && (
            <li className="flex gap-3">
              <XCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <strong>Próximos passos:</strong> a Prefeitura concede
                desconto de até 100% sobre os juros conforme legislação em
                vigor — esse desconto aparece no DAM emitido. Avalie pagamento
                à vista (com desconto) ou parcelamento.
              </span>
            </li>
          )}
        </ul>
      </Section>

      <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
        Esta análise foi gerada a partir do documento oficial emitido pela
        Secretaria Municipal de Finanças (SEFIN) da Prefeitura de Natal/RN.
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
  vencido,
}: {
  status: "ok" | "atencao" | "pendencia"
  totalDevido: number
  vencido: number
}) {
  const config = {
    ok: {
      icon: CheckCircle2Icon,
      title: "Sem pendências municipais",
      message:
        "Não há tributos municipais em aberto na Prefeitura de Natal nesta posição.",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-900",
      iconColor: "text-emerald-600",
    },
    atencao: {
      icon: AlertCircleIcon,
      title: "Há pendências — todas dentro do prazo",
      message: `Identificamos ${brl(totalDevido)} em pendências municipais, ainda dentro do prazo de vencimento. Bom momento para se programar para o pagamento.`,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-900",
      iconColor: "text-blue-600",
    },
    pendencia: {
      icon: XCircleIcon,
      title: "Há pendências vencidas",
      message: `${brl(vencido)} em tributos já vencidos. Esses valores acumulam juros e multa diariamente — quanto antes for regularizado, menor o custo final.`,
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
  tone: "positive" | "warning" | "muted"
}) {
  const valueColor = {
    positive: "text-emerald-600",
    warning: "text-amber-600",
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
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {help}
      </p>
    </div>
  )
}

function CategoryCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{brl(value)}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function aggregateByMonth(pendencias: PendenciaIss[]) {
  const map = new Map<string, number>()
  for (const p of pendencias) {
    if (!p.data_vencimento) continue
    const ym = p.data_vencimento.slice(0, 7)
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
