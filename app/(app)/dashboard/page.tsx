import Link from "next/link"
import {
  BriefcaseIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
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
import { getCurrentOrg, listMyOrganizations } from "@/lib/auth/current-org"
import {
  loadDashboardStats,
  loadRecentRelatorios,
} from "@/lib/dashboard/queries"
import { loadCarteira } from "@/lib/empresas/carteira"
import { formatCnpj } from "@/lib/utils/cnpj"
import type { RelatorioStatus } from "@/types/database"

const STATUS_LABEL: Record<RelatorioStatus, string> = {
  pending: "Pendente",
  extracting: "Extraindo",
  reviewing: "Aguarda revisão",
  verified: "Verificado",
  failed: "Falhou",
}

const STATUS_TONE: Record<RelatorioStatus, string> = {
  pending: "text-muted-foreground",
  extracting: "text-blue-600",
  reviewing: "text-amber-600",
  verified: "text-emerald-600",
  failed: "text-destructive",
}

export default async function DashboardPage() {
  const [ctx, orgs, stats, recent, carteira] = await Promise.all([
    getCurrentOrg(),
    listMyOrganizations(),
    loadDashboardStats(),
    loadRecentRelatorios(5),
    loadCarteira(),
  ])
  const activeOrg = orgs.find((o) => o.id === ctx.organizationId)

  const empty = stats.total_relatorios === 0 && stats.total_empresas === 0
  const formatBrl = (n: number) =>
    n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    })

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {activeOrg?.name ?? "Dashboard"}
        </p>
        <h1 className="text-2xl font-semibold">Visão geral</h1>
      </header>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <UploadCloudIcon className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Comece subindo um relatório fiscal</p>
              <p className="text-sm text-muted-foreground">
                O sistema extrai os dados do PDF, você revisa, e gera o texto
                explicativo pro cliente.
              </p>
            </div>
            <Link
              href="/upload"
              className={buttonVariants({ variant: "default" })}
            >
              <UploadCloudIcon className="mr-2 size-4" />
              Fazer upload
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Empresas"
              value={stats.total_empresas}
              icon={Building2Icon}
              href="/empresas"
            />
            <KpiCard
              label="Carteira"
              valueText={formatBrl(carteira.total_geral)}
              icon={BriefcaseIcon}
              href="/carteira"
              tone={carteira.total_geral > 0 ? "amber" : undefined}
              hint={
                carteira.qtd_empresas_com_debito > 0
                  ? `${carteira.qtd_empresas_com_debito} com débito`
                  : undefined
              }
            />
            <KpiCard
              label="Verificados"
              value={stats.por_status.verified}
              icon={CheckCircle2Icon}
              tone="emerald"
            />
            <KpiCard
              label="Aguardando"
              value={stats.por_status.reviewing + stats.por_status.extracting}
              icon={ClockIcon}
              tone="amber"
            />
          </section>

          {stats.por_status.failed > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <XCircleIcon className="size-6 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">
                    {stats.por_status.failed} relatório
                    {stats.por_status.failed === 1 ? "" : "s"} com falha de
                    extração
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Verifique se o PDF é um Relatório de Situação Fiscal e tente
                    subir novamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Atividade recente</CardTitle>
                <CardDescription>
                  Últimos {recent.length} relatórios processados.
                </CardDescription>
              </div>
              <Link
                href="/upload"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <UploadCloudIcon className="mr-2 size-4" />
                Novo upload
              </Link>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum relatório ainda.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quando</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((r) => {
                      const targetHref =
                        r.status === "verified"
                          ? `/relatorios/${r.id}`
                          : r.status === "reviewing"
                            ? `/relatorios/${r.id}/revisar`
                            : `/relatorios/${r.id}/revisar`
                      const StatusIcon =
                        r.status === "verified"
                          ? CheckCircle2Icon
                          : r.status === "failed"
                            ? XCircleIcon
                            : r.status === "extracting"
                              ? Loader2Icon
                              : ClockIcon
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="max-w-[24ch] truncate font-medium">
                            {r.pdf_filename}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.empresa_razao_social ? (
                              <Link
                                href={`/empresas/${r.empresa_cnpj ?? ""}`}
                                className="hover:underline"
                              >
                                {r.empresa_razao_social}
                              </Link>
                            ) : r.empresa_cnpj ? (
                              <Link
                                href={`/empresas/${r.empresa_cnpj}`}
                                className="font-mono text-xs hover:underline"
                              >
                                {formatCnpj(r.empresa_cnpj)}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 text-xs ${STATUS_TONE[r.status]}`}
                            >
                              <StatusIcon
                                className={`size-3 ${
                                  r.status === "extracting" ? "animate-spin" : ""
                                }`}
                              />
                              {STATUS_LABEL[r.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatRelativeDate(r.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={targetHref}
                              className={buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              })}
                            >
                              Ver →
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}

function KpiCard({
  label,
  value,
  valueText,
  icon: Icon,
  href,
  tone,
  hint,
}: {
  label: string
  value?: number
  valueText?: string
  icon: typeof Building2Icon
  href?: string
  tone?: "emerald" | "amber"
  hint?: string
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : ""
  const display = valueText ?? (value ?? 0).toString()
  const card = (
    <Card className={href ? "transition-colors hover:bg-muted/30" : ""}>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>
          {display}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `${diffMin}m atrás`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d atrás`
  return d.toLocaleDateString("pt-BR")
}
