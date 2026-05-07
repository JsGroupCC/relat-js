import Link from "next/link"
import {
  AlertCircleIcon,
  BriefcaseIcon,
  Building2Icon,
  DownloadIcon,
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
import { FONTE_LABEL, loadCarteira, type FonteFiscal } from "@/lib/empresas/carteira"
import { formatCnpj } from "@/lib/utils/cnpj"

const FONTES: FonteFiscal[] = ["federal", "estadual", "municipal", "outros"]

const formatBrl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })

export default async function CarteiraPage() {
  const snapshot = await loadCarteira()

  if (snapshot.rows.length === 0) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Header />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Building2Icon className="size-10 text-muted-foreground" />
            <p className="font-medium">Sem empresas cadastradas ainda.</p>
            <p className="text-sm text-muted-foreground">
              Cadastre clientes em /empresas ou faça upload de um relatório
              fiscal pra começar a montar a carteira.
            </p>
            <Link
              href="/empresas"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ir pra empresas
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const visibleFontes = FONTES.filter(
    (f) => snapshot.total_por_fonte[f] > 0,
  )

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Header />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Empresas com débito"
          value={`${snapshot.qtd_empresas_com_debito}/${snapshot.rows.length}`}
          icon={Building2Icon}
        />
        <KpiCard
          label="Total geral"
          value={formatBrl(snapshot.total_geral)}
          icon={BriefcaseIcon}
          tone={snapshot.total_geral > 0 ? "amber" : undefined}
        />
        {visibleFontes.slice(0, 2).map((f) => (
          <KpiCard
            key={f}
            label={`Total ${FONTE_LABEL[f]}`}
            value={formatBrl(snapshot.total_por_fonte[f])}
            icon={BriefcaseIcon}
          />
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Carteira por empresa</CardTitle>
            <CardDescription>
              Soma do saldo devedor por fonte fiscal · ordenado por total
              decrescente.
            </CardDescription>
          </div>
          <a
            href="/api/carteira/csv"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <DownloadIcon className="mr-2 size-4" />
            Exportar CSV
          </a>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  {FONTES.map((f) => (
                    <TableHead key={f} className="text-right">
                      {FONTE_LABEL[f]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.rows.map((r) => (
                  <TableRow key={r.empresa_id}>
                    <TableCell className="max-w-[28ch] truncate">
                      <Link
                        href={`/empresas/${r.cnpj}`}
                        className="font-medium hover:underline"
                      >
                        {r.razao_social ?? formatCnpj(r.cnpj)}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">
                        {formatCnpj(r.cnpj)}
                      </div>
                    </TableCell>
                    {FONTES.map((f) => (
                      <TableCell
                        key={f}
                        className="text-right tabular-nums text-sm"
                      >
                        {r.por_fonte[f] > 0
                          ? formatBrl(r.por_fonte[f])
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                    <TableCell
                      className={`text-right font-semibold tabular-nums ${
                        r.total_geral > 0 ? "text-amber-600" : "text-muted-foreground"
                      }`}
                    >
                      {r.total_geral > 0 ? formatBrl(r.total_geral) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {r.ultimo_relatorio_at
                        ? new Date(r.ultimo_relatorio_at).toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell className="font-semibold">TOTAL</TableCell>
                  {FONTES.map((f) => (
                    <TableCell
                      key={f}
                      className="text-right font-semibold tabular-nums"
                    >
                      {snapshot.total_por_fonte[f] > 0
                        ? formatBrl(snapshot.total_por_fonte[f])
                        : "—"}
                    </TableCell>
                  ))}
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      snapshot.total_geral > 0
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatBrl(snapshot.total_geral)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Os totais consideram apenas relatórios verificados. Empresas sem
          relatório verified aparecem com total 0.
        </span>
      </p>
    </main>
  )
}

function Header() {
  return (
    <header className="space-y-1">
      <h1 className="text-xl font-semibold">Carteira</h1>
      <p className="text-sm text-muted-foreground">
        Visão consolidada dos débitos de todos os clientes, separada por
        esfera fiscal.
      </p>
    </header>
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
  icon: typeof BriefcaseIcon
  tone?: "amber"
}) {
  return (
    <Card>
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p
          className={`text-xl font-semibold tabular-nums ${
            tone === "amber" ? "text-amber-600" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
