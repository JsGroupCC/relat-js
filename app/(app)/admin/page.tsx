import { notFound } from "next/navigation"
import {
  AlertTriangleIcon,
  CoinsIcon,
  DatabaseIcon,
  GaugeIcon,
  RecycleIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isAdminUser } from "@/lib/admin/access"
import { getAdminMetrics } from "@/lib/admin/metrics"

export const dynamic = "force-dynamic"

const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  })

const formatInt = (n: number) => n.toLocaleString("pt-BR")

export default async function AdminPage() {
  const access = await isAdminUser()
  if (!access.ok) {
    // Fail-closed — não revela nem que /admin existe.
    notFound()
  }

  const m = await getAdminMetrics()
  const cacheRate =
    m.totalExtracoes > 0 ? (m.cachedCount / m.totalExtracoes) * 100 : 0

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Painel de operação · {access.email}
        </p>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Métricas globais (todas as orgs). Use pra ver para onde vai o custo
          da OpenAI e detectar tendências.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          icon={CoinsIcon}
          label="Custo total (all-time)"
          value={formatUsd(m.totalCostUsd)}
          hint={`${formatInt(m.totalExtracoes)} extrações`}
        />
        <MetricCard
          icon={TrendingUpIcon}
          label="Últimos 7 dias"
          value={formatUsd(m.last7d.costUsd)}
          hint={`${formatInt(m.last7d.extracoes)} extrações`}
        />
        <MetricCard
          icon={GaugeIcon}
          label="Últimos 30 dias"
          value={formatUsd(m.last30d.costUsd)}
          hint={`${formatInt(m.last30d.extracoes)} extrações`}
        />
        <MetricCard
          icon={DatabaseIcon}
          label="Custo médio/extração"
          value={formatUsd(m.avgCostPerNonCached)}
          hint="exclui cache"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard
          icon={RecycleIcon}
          label="Cache hits"
          value={`${cacheRate.toFixed(1)}%`}
          hint={`${formatInt(m.cachedCount)} de ${formatInt(m.totalExtracoes)} pularam LLM`}
        />
        <MetricCard
          icon={XCircleIcon}
          label="Falhas (7d)"
          value={formatInt(m.last7d.failed)}
          hint={`${formatInt(m.last30d.failed)} nos últimos 30d`}
          danger={m.last7d.failed > 0}
        />
        <MetricCard
          icon={AlertTriangleIcon}
          label="Status"
          value={m.last7d.failed > 5 ? "Atenção" : "OK"}
          hint={
            m.last7d.failed > 5
              ? `${m.last7d.failed} falhas em 7d — investigar`
              : "Pipeline saudável"
          }
          danger={m.last7d.failed > 5}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top 5 organizações por custo (30d)
          </CardTitle>
          <CardDescription>
            Identifica concentrações de uso — útil pra calibrar limites por
            plano.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {m.topOrgs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sem extrações nos últimos 30 dias.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead className="text-right">Extrações</TableHead>
                    <TableHead className="text-right">Custo (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.topOrgs.map((o) => (
                    <TableRow key={o.organization_id}>
                      <TableCell>
                        <span className="font-medium">
                          {o.organization_name ?? "—"}
                        </span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {o.organization_id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInt(o.extracoes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(o.costUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

interface MetricCardProps {
  icon: typeof CoinsIcon
  label: string
  value: string
  hint?: string
  danger?: boolean
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  danger = false,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon
            className={`size-3.5 ${danger ? "text-destructive" : ""}`}
          />
          <span>{label}</span>
        </div>
        <p
          className={`text-2xl font-semibold tabular-nums ${
            danger ? "text-destructive" : ""
          }`}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}
