import Link from "next/link"
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  TrendingDownIcon,
} from "lucide-react"

import { PrintButton } from "@/components/shared/PrintButton"
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
import {
  loadProximosVencimentos,
  type FonteFiscalVenc,
  type VencimentoItem,
} from "@/lib/empresas/vencimentos"
import { formatCnpj } from "@/lib/utils/cnpj"

const FONTE_LABEL: Record<FonteFiscalVenc, string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
  outros: "Outros",
}

const FONTE_TONE: Record<FonteFiscalVenc, string> = {
  federal: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  estadual:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  municipal:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  outros:
    "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
}

const formatBrl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })

export default async function VencimentosPage() {
  const snapshot = await loadProximosVencimentos(120)

  const isEmpty = snapshot.buckets.every((b) => b.itens.length === 0)

  return (
    <main className="print-clean mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Vencimentos</h1>
          <p className="text-sm text-muted-foreground">
            Débitos com data de vencimento, agrupados por janela. Use pra
            priorizar conversa com o cliente antes do vencimento.
          </p>
        </div>
        <div className="no-print">
          <PrintButton />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Em atraso"
          value={formatBrl(snapshot.total_atrasado)}
          icon={AlertCircleIcon}
          tone={snapshot.total_atrasado > 0 ? "destructive" : undefined}
        />
        <KpiCard
          label="Vence em 7 dias"
          value={formatBrl(snapshot.total_proximos_7d)}
          icon={ClockIcon}
          tone={snapshot.total_proximos_7d > 0 ? "amber" : undefined}
        />
        <KpiCard
          label="Vence em 30 dias"
          value={formatBrl(snapshot.total_proximos_30d)}
          icon={CalendarIcon}
        />
        <KpiCard
          label="Total monitorado"
          value={formatBrl(snapshot.total_geral)}
          icon={TrendingDownIcon}
        />
      </section>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <CheckCircle2Icon className="size-10 text-emerald-600" />
            <p className="font-medium">Nenhum vencimento na janela.</p>
            <p className="text-sm text-muted-foreground">
              Os débitos confirmados sem data de vencimento ou já zerados
              não aparecem aqui. Suba/revisar relatórios novos pra povoar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {snapshot.buckets.map((bucket) =>
            bucket.itens.length === 0 ? null : (
              <Card key={bucket.key}>
                <CardHeader className="flex flex-row items-baseline justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{bucket.label}</CardTitle>
                    <CardDescription>
                      {bucket.itens.length} débito
                      {bucket.itens.length === 1 ? "" : "s"} ·{" "}
                      <span
                        className={`font-medium tabular-nums ${
                          bucket.key === "atrasado"
                            ? "text-destructive"
                            : bucket.key === "hoje" || bucket.key === "7d"
                              ? "text-amber-600"
                              : ""
                        }`}
                      >
                        {formatBrl(bucket.total)}
                      </span>
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Tributo</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Fonte</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bucket.itens.map((item) => (
                          <Row key={item.id} item={item} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </main>
  )
}

function Row({ item }: { item: VencimentoItem }) {
  const isAtrasado = item.diff_days < 0
  const isUrgente = item.diff_days >= 0 && item.diff_days <= 7
  return (
    <TableRow>
      <TableCell className="max-w-[24ch] truncate">
        <Link
          href={`/empresas/${item.empresa_cnpj}`}
          className="font-medium hover:underline"
        >
          {item.empresa_razao_social ?? formatCnpj(item.empresa_cnpj)}
        </Link>
      </TableCell>
      <TableCell className="max-w-[26ch] truncate text-sm">
        {item.receita_descricao ?? item.receita_codigo ?? "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.periodo_apuracao ?? "—"}
      </TableCell>
      <TableCell
        className={`text-sm tabular-nums ${
          isAtrasado
            ? "text-destructive"
            : isUrgente
              ? "text-amber-600"
              : ""
        }`}
        title={
          isAtrasado
            ? `Atrasado há ${Math.abs(item.diff_days)} dias`
            : `Em ${item.diff_days} dia${item.diff_days === 1 ? "" : "s"}`
        }
      >
        {new Date(`${item.data_vencimento}T00:00:00Z`).toLocaleDateString(
          "pt-BR",
          { timeZone: "UTC" },
        )}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${FONTE_TONE[item.fonte]}`}
        >
          {FONTE_LABEL[item.fonte]}
        </span>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {item.saldo_devedor ? formatBrl(item.saldo_devedor) : "—"}
      </TableCell>
    </TableRow>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof CalendarIcon
  tone?: "destructive" | "amber"
}) {
  const valueClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "amber"
        ? "text-amber-600"
        : ""
  return (
    <Card>
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon
            className={`size-4 ${tone === "destructive" ? "text-destructive" : "text-muted-foreground"}`}
          />
        </div>
        <p className={`text-xl font-semibold tabular-nums ${valueClass}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
