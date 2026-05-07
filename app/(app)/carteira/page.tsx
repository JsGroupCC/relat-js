import Link from "next/link"
import {
  AlertCircleIcon,
  BriefcaseIcon,
  Building2Icon,
  DownloadIcon,
} from "lucide-react"

import { CarteiraChart } from "@/components/carteira/CarteiraChart"
import { CarteiraEvolucaoChart } from "@/components/carteira/CarteiraEvolucaoChart"
import { CarteiraTable } from "@/components/carteira/CarteiraTable"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FONTE_LABEL,
  loadCarteira,
  type FonteFiscal,
} from "@/lib/empresas/carteira"
import { loadCarteiraEvolucao } from "@/lib/empresas/carteira-evolucao"

const FONTES: FonteFiscal[] = ["federal", "estadual", "municipal", "outros"]

const formatBrl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })

export default async function CarteiraPage() {
  const [snapshot, evolucao] = await Promise.all([
    loadCarteira(),
    loadCarteiraEvolucao(90),
  ])

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

      {evolucao.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução da carteira</CardTitle>
            <CardDescription>
              Total devedor ao longo dos últimos 90 dias · {evolucao.length}{" "}
              snapshots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CarteiraEvolucaoChart points={evolucao} />
          </CardContent>
        </Card>
      )}

      {snapshot.qtd_empresas_com_debito > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 empresas</CardTitle>
            <CardDescription>
              As que mais devem (soma de débitos consolidada).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CarteiraChart rows={snapshot.rows} limit={10} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Carteira por empresa</CardTitle>
            <CardDescription>
              Soma do saldo devedor por fonte fiscal. Clique nas colunas pra
              ordenar.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/carteira/csv"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <DownloadIcon className="mr-2 size-4" />
              CSV resumido
            </a>
            <a
              href="/api/carteira/debitos-csv"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              title="Uma linha por débito — bom pra conferência detalhada no Excel"
            >
              <DownloadIcon className="mr-2 size-4" />
              CSV detalhado
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <CarteiraTable snapshot={snapshot} />
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
